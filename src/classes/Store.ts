import { ProducerActions, createProducer } from "@rbxts/reflex";
import { Key, keyToString } from "../util/key";
import { Record } from "./Record";
import { ReadonlyRecord } from "./ReadonlyRecord";
import { PromiseCache } from "../util/promise-cache";
import { cloneDeep } from "../util/cloneDeep";

const DataStoreService = game.GetService("DataStoreService");

type StoreIdentifier = string | { name: string; scope: string };

type StoreOptions<State, Actions extends ProducerActions<State>> = {
	initialState: State;
	actions: Actions;
	store: StoreIdentifier;
};

const getStore = (store: StoreIdentifier) => {
	let name, scope;

	if (!typeIs(store, "table")) name = store;
	else {
		name = store.name;
		scope = store.scope;
	}

	return DataStoreService.GetDataStore(name, scope);
};

export class Store<State, Actions extends ProducerActions<State>> {
	private readonly initialState: State;

	private readonly actions: Actions;

	private readonly store: DataStore;

	private readonly records = new Map<string, Record<State, Actions>>();

	private readonly readonlyRecords = new Map<string, ReadonlyRecord<State>>();

	private readonly openRecord = PromiseCache<Record<State, Actions>>();

	private readonly openReadonlyRecord = PromiseCache<ReadonlyRecord<State>>();

	constructor(options: StoreOptions<State, Actions>) {
		this.initialState = options.initialState;
		this.actions = options.actions;

		this.store = getStore(options.store);
	}

	async close(key: Key) {
		const strKey = keyToString(key);

		let record;

		try {
			record = await (this.records.get(strKey) ?? this.openRecord.get(strKey));
			if (!record) return;
		} catch {
			return;
		}

		this.records.delete(strKey);

		// TODO: close it
	}

	async open(key: Key) {
		const strKey = keyToString(key);
		const record = this.records.get(strKey);
		if (record) return record;

		return this.openRecord.run(strKey, async () => {
			// TODO: get state
			const producer = createProducer(cloneDeep(this.initialState), this.actions);
			const record = new Record(producer);
			return record;
		});
	}

	find(key: Key) {
		return this.records.get(keyToString(key));
	}

	async view(key: Key) {
		const strKey = keyToString(key);
		const loaded = this.readonlyRecords.get(strKey);
		if (loaded) return loaded;

		return this.openReadonlyRecord.run(strKey, async () => {
			// TODO: get state
			const record = new ReadonlyRecord({} as State);
			this.readonlyRecords.set(strKey, record);
			return record;
		});
	}
}
