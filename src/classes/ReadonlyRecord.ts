export class ReadonlyRecord<State> {
	readonly data: State;

	constructor(data: State) {
		this.data = data;
	}

	async update() {
		// TODO: fetch update
	}
}
