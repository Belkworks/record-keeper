import { Store } from "./store";

export enum RecordState {
	Sealed,
	Unsealed,
}

export class Record<T extends object> {
	readonly id: string;

	targetState = RecordState.Unsealed;

	data?: T;

	constructor(
		readonly key: string,
		private readonly store: Store<T>,
	) {
		this.id = `${store}/${key}`;
	}

	save(now?: boolean) {
		this.store.save(this, now);
	}

	unseal() {
		this.targetState = RecordState.Unsealed;
		this.store.unseal(this);
	}

	seal() {
		this.targetState = RecordState.Sealed;
		this.store.seal(this);
	}
}
