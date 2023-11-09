import Log, { LogLevel } from "@rbxts/log";

const RunService = game.GetService("RunService");

export const log = Log.Configure()
	.SetMinLogLevel(RunService.IsStudio() ? LogLevel.Information : LogLevel.Warning)
	.Create();
