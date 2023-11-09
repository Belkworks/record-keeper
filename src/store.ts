// safazi 2023

import { PromiseQueue } from "@belkworks/promise-queue";
import { log } from "./log";
import { Record, RecordState } from "./record";

// TODO: support mock datastore?
// TODO: reload method

const LOCK_EXPIRY_SECONDS = 30;

const DataStoreService = game.GetService("DataStoreService");
const MemoryStoreService = game.GetService("MemoryStoreService");
const HttpService = game.GetService("HttpService");

type Key = string | number | Player;

const keyToString = (key: Key) => {
	if (typeIs(key, "string")) return key;
	else if (typeIs(key, "number")) return tostring(key);
	else if (typeIs(key, "Instance") && key.IsA("Player")) return tostring(key.UserId);

	throw `unsupported key ${key} (${typeOf(key)})`;
};

const UNSET = "UNSET";

const createOwner = (value: string) => `${value}:${DateTime.now().UnixTimestamp}`;

const getOwner = (value?: unknown) => {
	if (!typeIs(value, "string") || value === UNSET) return;
	return value.split(":")[0];
};

export class Store<T extends object> {
	private readonly pendingWrite = new Set<string>();

	private readonly records = new Map<string, Record<T>>();

	private readonly loading = new Map<string, Promise<Record<T>>>();

	private readonly queue = new PromiseQueue();

	private readonly locks = new Set<string>();

	private readonly guid = HttpService.GenerateGUID(false);

	private readonly memory: MemoryStoreSortedMap;

	private readonly store: DataStore;

	readonly id: string;

	constructor(name: string, scope?: string) {
		this.store = DataStoreService.GetDataStore(name, scope);
		this.id = scope === undefined ? name : `${name}{${scope}}`;

		this.memory = MemoryStoreService.GetSortedMap(this.id);

		let active = true;

		game.BindToClose(() => {
			active = false;
			this.closeAllRecords().await();
		});

		task.spawn(async () => {
			const writeAndLockAll = async () => {
				const wroteLock = new Set<string>();

				// Write all pending writes
				for (const key of this.pendingWrite) {
					const record = this.records.get(key);
					if (!record) continue;

					try {
						await this.write(record);
						wroteLock.add(key);
					} catch (err) {
						log.Warn("failed to write to {id}: {err}", record.id, err);
					}
				}

				// Lock remaining records
				for (const [key, record] of this.records) {
					if (record.targetState !== RecordState.Unsealed || wroteLock.has(key)) continue;

					try {
						await this.writeLock(key);
					} catch (err) {
						log.Warn("failed to update lock on {id}: {err}", record.id, err);
					}
				}
			};

			while (active) await Promise.all([Promise.delay(8), writeAndLockAll().catch()]);
		});
	}

	/** Find a loaded record */
	find(key: Key) {
		return this.records.get(keyToString(key));
	}

	/** Open a record by key */
	async open(key: Key) {
		const keyStr = keyToString(key);

		let record = this.findLoading(keyStr);
		if (record) return record;

		const { loading, records } = this;

		const promise = this.loadRecord(keyStr);
		loading.set(keyStr, promise);

		try {
			record = await promise;
			records.set(keyStr, record);
			log.Debug("loaded record {id}", keyStr); // TODO: id
			return record;
		} catch (err) {
			log.Error("failed to load record: {err}", err);
			throw err;
		} finally {
			loading.delete(keyStr);
		}
	}

	/** Close a record by key */
	async close(key: Key) {
		const strKey = keyToString(key);
		const promise = this.findLoading(strKey);
		if (!promise) return;

		const record = await promise;
		return this.closeRecord(record);
	}

	async unseal(record: Record<T>) {
		return this.writeLock(record.key);
	}

	seal({ key }: Record<T>) {
		if (this.pendingWrite.has(key)) return false;
		return this.releaseLock(key);
	}

	// Internal methods

	private async closeRecord(record: Record<T>) {
		record.targetState = RecordState.Sealed;
		this.records.delete(record.key);

		if (this.pendingWrite.has(record.key)) await this.write(record, true);
		else await this.releaseLock(record.key);

		log.Debug("closed record {id}", record.id);
	}

	private async closeAllRecords() {
		await Promise.all(
			[...this.records, ...this.loading].map(async ([, record]) => {
				try {
					this.closeRecord(await record);
				} catch {
					// TODO: log
				}
			}),
		);
	}

	private findLoading(key: string): Record<T> | Promise<Record<T>> | undefined {
		return this.records.get(key) ?? this.loading.get(key);
	}

	/** Schedule a record for saving */
	async save(record: Record<T>, now?: boolean) {
		if (now) return this.write(record);
		else this.pendingWrite.add(record.key);
	}

	private async loadRecord(key: string) {
		const record = new Record<T>(key, this);

		// TODO: queue reads
		const [data] = this.store.GetAsync(key);
		record.data = data as T | undefined;

		return record;
	}

	private async writeLock(key: string) {
		const guid = this.guid;
		const newOwner = createOwner(guid);

		const newValue = this.memory.UpdateAsync(
			key,
			(oldValue) => {
				const oldOwner = getOwner(oldValue);
				if (oldOwner === undefined || oldOwner === guid) return newOwner;
				return oldValue;
			},
			LOCK_EXPIRY_SECONDS,
		);

		if (newValue === newOwner) this.locks.add(key);
		else {
			this.locks.delete(key);
			throw `conflicting lock: ${newValue}`;
		}
	}

	private async releaseLock(key: string) {
		if (!this.locks.delete(key)) return;

		this.memory.UpdateAsync(
			key,
			(oldValue) => {
				if (getOwner(oldValue) === this.guid) return UNSET;
			},
			LOCK_EXPIRY_SECONDS,
		);
	}

	private write(record: Record<T>, now?: boolean) {
		const factory = async () => {
			const hadPendingWrite = this.pendingWrite.delete(record.key);

			try {
				await this.writeLock(record.key);
				this.store.SetAsync(record.key, record.data);
				log.Debug("wrote to record {id}", record.id);
				if (record.targetState !== RecordState.Unsealed) this.releaseLock(record.key);
			} finally {
				if (hadPendingWrite) this.pendingWrite.add(record.key);
			}
		};

		return now ? this.queue.unshift(factory) : this.queue.push(factory);
	}
}
