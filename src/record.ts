import { Store } from "./store";

export enum RecordState {
	Sealed,
	Unsealed,
}

export class Record<T extends object> {
	readonly id: string;

	targetState = RecordState.Sealed;

	data?: T;

	constructor(
		readonly key: string,
		private readonly store: Store<T>,
	) {
		this.id = `${store.id}/${key}`;
	}

	save(now?: boolean) {
		return this.store.save(this, now);
	}

	unseal() {
		this.targetState = RecordState.Unsealed;
		return this.store.unseal(this);
	}

	seal() {
		this.targetState = RecordState.Sealed;
		return this.store.seal(this);
	}
}
