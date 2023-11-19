import { Producer } from "@rbxts/reflex";

export class Record<State, Actions> {
	readonly producer: Producer<State, Actions>;

	constructor(producer: Producer<State, Actions>) {
		this.producer = producer;
	}
}
