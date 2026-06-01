import data from "./data.json" with { type: "json" };
import type { Data } from "./types.js";

export * from "./types.js";

export const DATA: Data = data as Data;
