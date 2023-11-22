import { ProducerActions, createProducer } from "@rbxts/reflex";
import { Record } from "./Record";
import { ThrottledDataStore } from "./ThrottledDataStore";

type StoreOptions<State, Actions> = {
	name: string | { name: string; scope: string };
	initialValue: State;
	actions: Actions;
};

type Key = string | number | Player;

const keyToString = (key: Key) => {
	if (typeIs(key, "string")) return key;
	else if (typeIs(key, "number")) return tostring(key);
	else if (typeIs(key, "Instance") && key.IsA("Player")) return tostring(key.UserId);

	throw `unsupported key ${key} (${typeOf(key)})`;
};

export class Store<State, Actions extends ProducerActions<State>> {
	private readonly records = new Map<string, Promise<Record<State, Actions>>>();

	private readonly initialState: State;

	private readonly actions: Actions;

	private readonly store: ThrottledDataStore;

	constructor(options: StoreOptions<State, Actions>) {
		this.initialState = options.initialValue;
		this.actions = options.actions;

		let name, scope;
		if (!typeIs(options.name, "table")) name = options.name;
		else {
			name = options.name.name;
			scope = options.name.scope;
		}

		this.store = new ThrottledDataStore(name, scope);
	}

	private async loadRecord(key: string) {
		const producer = createProducer(this.initialState, this.actions);
		const record = new Record(key, this.store, producer);
		await record.pull();
		return record;
	}

	async open(key: Key) {
		const strKey = keyToString(key);

		let promise = this.records.get(strKey);
		if (promise) return promise;

		promise = this.loadRecord(strKey);

		this.records.set(strKey, promise);

		try {
			const record = await promise;
			return record;
		} catch {
			this.records.delete(strKey);
		}
	}
}
