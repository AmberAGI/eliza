import { elizaLogger } from "@ai16z/eliza";
import z from "zod";

const ChatEmberRespons = z.object({
    status: z.union([
        z.literal("done"),
        z.literal("processing"),
        z.literal("error"),
    ]),
    message: z.string(),
});

export default async function (
    senderUid: string,
    message: string,
    apiKey: string
): Promise<string> {
    elizaLogger.log("Asking Ember", { senderUid, message, apiKey });

    const response = await fetch(`https://api.emberai.xyz/v1/chat`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            user_id: senderUid,
            message,
        }),
    });

    if (!response.ok || response.body == null) {
        throw new Error("Failed to connect to Ember server");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        const { event, rawData } = parseSseResponse(decoder.decode(value));
        if (done && event !== "done") {
            throw new Error("Invalid response");
        }

        if (rawData == null) {
            continue;
        }

        const data = await ChatEmberRespons.safeParseAsync(JSON.parse(rawData));
        if (!data.success) {
            throw new Error("Invalid response");
        }
        const response = data.data;

        switch (event) {
            case "done":
                elizaLogger.log("Ember response", { response });
                return response.message;
            case "error":
                elizaLogger.error("Ember error", { response });
                return `Error: ${response.message}`;
            case "activity":
                elizaLogger.log("Ember activity", { response });
                continue;
            default:
                elizaLogger.error("Invalid response", { event });
                throw new Error("Invalid response");
        }
    }
}

function parseSseResponse(value: string) {
    const lines = value.split("\n");
    let event = undefined;
    let rawData = undefined;

    for (const line of lines) {
        if (line.startsWith("event: ")) {
            event = line.substring("event: ".length).trim();
        } else if (line.startsWith("data: ")) {
            rawData = line.substring("data: ".length);
        }
    }

    return { event, rawData };
}
