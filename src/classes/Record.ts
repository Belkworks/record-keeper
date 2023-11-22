import { Producer, ProducerActions } from "@rbxts/reflex";
import { ThrottledDataStore } from "./ThrottledDataStore";

export class Record<State, Actions extends ProducerActions<State>> {
	private pulled = false;

	constructor(
		readonly key: string,
		private readonly store: ThrottledDataStore,
		readonly producer: Producer<State, Actions>,
	) {}

	async pull() {
		const value = await this.store.read(this.key);
		if (value !== undefined) this.producer.setState(value as State);

		if (this.pulled) return;
		this.pulled = true;

		// TODO: setup change listener
	}
}
