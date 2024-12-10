import { IAgentRuntime } from "@ai16z/eliza";

export default function (runtime: IAgentRuntime): string {
    const apiKey = runtime.getSetting("EMBERAI_API_KEY");
    if (typeof apiKey !== "string" || apiKey.length === 0) {
        throw new Error("API key not set in character settings");
    }
    return apiKey;
}
