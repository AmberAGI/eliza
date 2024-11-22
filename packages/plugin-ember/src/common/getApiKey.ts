import { AgentRuntime } from "@ai16z/eliza";

export default function (runtime: AgentRuntime): string {
    const apiKey = runtime.getSetting("EMBER_API_KEY");
    if (typeof apiKey !== "string" || apiKey.length === 0) {
        throw new Error("API key not set in character settings");
    }
    return apiKey;
}
