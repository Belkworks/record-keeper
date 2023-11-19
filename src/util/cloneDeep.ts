const isPrimitive = (value: unknown): value is Exclude<unknown, object> => {
	return !typeIs(value, "table");
};

export const cloneDeep = <T>(value: T, tracker?: Map<T, T>): T => {
	if (isPrimitive(value)) return value;

	tracker ??= new Map();

	const ref = tracker.get(value);
	if (ref !== undefined) return ref as T;

	const newValue = new Map<unknown, unknown>();

	tracker.set(value, newValue as T);

	// eslint-disable-next-line roblox-ts/no-array-pairs
	for (const [k, v] of pairs(value)) {
		newValue.set(k, cloneDeep(v, tracker));
	}

	return newValue as T;
};
