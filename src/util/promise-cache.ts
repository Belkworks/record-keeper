export const PromiseCache = <T>() => {
	const running = new Map<string, Promise<T>>();

	return {
		get: (key: string) => running.get(key),
		run: (key: string, factory: () => Promise<T>) => {
			let promise = running.get(key);
			if (promise) return promise;

			promise = factory();

			running.set(key, promise);
			promise.finally(() => running.delete(key));

			return promise;
		},
	};
};
