import { Store } from "./classes/Store";

const store = new Store({
	name: "test",
	initialValue: {},
	actions: {},
});

async function test() {
	// store.open("test", { lock: true });
}
