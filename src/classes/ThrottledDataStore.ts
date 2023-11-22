import { PromiseQueue } from "@belkworks/promise-queue";

const DataStoreService = game.GetService("DataStoreService");
const Players = game.GetService("Players");

const readQueue = new PromiseQueue();

const writeQueue = new PromiseQueue();

function getRequestsPerMinute() {
	return 60 + Players.GetPlayers().size() * 10;
}

function getMinimumRequestTime() {
	return 60 / getRequestsPerMinute();
}

export class AsyncDataStore {
	private readonly store: DataStore;

	constructor(name: string, scope?: string) {
		this.store = DataStoreService.GetDataStore(name, scope);
	}

	async read(key: string) {
		return this.store.GetAsync(key);
	}

	async write(key: string, value: unknown) {
		return this.store.SetAsync(key, value);
	}
}

export class ThrottledDataStore extends AsyncDataStore {
	read(key: string, unshift?: boolean) {
		const factory = async () => {
			const promise = super.read(key);
			await Promise.delay(getMinimumRequestTime());
			return promise;
		};

		if (unshift) return readQueue.unshift(factory);
		else return readQueue.push(factory);
	}

	write(key: string, value: unknown, unshift?: boolean) {
		const factory = async () => {
			const promise = super.write(key, value);
			await Promise.delay(getMinimumRequestTime());
			return promise;
		};

		if (unshift) return writeQueue.unshift(factory);
		else return writeQueue.push(factory);
	}
}
