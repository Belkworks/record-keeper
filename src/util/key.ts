export type Key = string | number | Player;

export const keyToString = (key: Key) => {
	if (typeIs(key, "string")) return key;
	else if (typeIs(key, "number")) return tostring(key);
	else if (typeIs(key, "Instance") && key.IsA("Player")) return tostring(key.UserId);

	throw `unsupported key ${key} (${typeOf(key)})`;
};
