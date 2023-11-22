import { Signal } from "@rbxts/beacon";

const MemoryStoreService = game.GetService("MemoryStoreService");

const UNSET = "UNSET";

const createOwner = (value: string) => `${value}:${DateTime.now().UnixTimestamp}`;

const getOwner = (value?: unknown) => {
	if (!typeIs(value, "string") || value === UNSET) return;
	return value.split(":")[0];
};

export class LockManager {
	private readonly store: MemoryStoreSortedMap;

	private readonly locks = new Map<string, DateTime>();

	readonly lockChanged = new Signal<[key: string, locked: boolean]>();

	constructor(name: string) {
		this.store = MemoryStoreService.GetSortedMap(name);

		// TODO: lock loop
	}

	private update(key: string) {}

	has(key: string, bypassCache?: boolean) {}

	acquire(key: string, steal?: boolean) {}

	release(key: string) {}
}
