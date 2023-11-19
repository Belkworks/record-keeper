const UNSET = "UNSET";

const createOwner = (value: string) => `${value}:${DateTime.now().UnixTimestamp}`;

const getOwner = (value?: unknown) => {
	if (!typeIs(value, "string") || value === UNSET) return;
	return value.split(":")[0];
};
