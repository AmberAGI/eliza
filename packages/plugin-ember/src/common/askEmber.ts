import { elizaLogger } from "@ai16z/eliza";
import z from "zod";

type SseResponse = {
    event: string | undefined;
    rawData: string | undefined;
};

const ChatEmberResponse = z.object({
    status: z.union([
        z.literal("done"),
        z.literal("processing"),
        z.literal("error"),
    ]),
    message: z.string(),
});

const DEFAULT_DELAY_IN_MS = 30000;

export default async function (
    senderUid: string,
    message: string,
    apiKey: string,
    requestedRoute: string | null = null
): Promise<string> {
    const controller = new AbortController();
    let timeoutId = setTimeout(abortRequest, DEFAULT_DELAY_IN_MS);

    function abortRequest() {
        controller.abort();
        elizaLogger.error("Request to Ember was aborted due to timeout");
    }

    function resetTimeout() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(abortRequest, DEFAULT_DELAY_IN_MS);
    }

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
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
                requested_route: requestedRoute,
            }),
            signal: controller.signal,
        });

        if (!response.ok || response.body == null) {
            throw new Error("Failed to connect to Ember server");
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            resetTimeout();

            const decodedValue = decoder.decode(value);
            const { event, rawData } = parseSseResponse(decodedValue);

            if (!event && !rawData) {
                // Skip if no event or data is found
                continue;
            }

            if (rawData == null) {
                elizaLogger.warn("No data found in SSE response:", { decodedValue });
                continue;
            }

            let parsedData;
            try {
                parsedData = JSON.parse(rawData);
            } catch (jsonError) {
                elizaLogger.error("Failed to parse JSON:", {
                    rawData,
                    message: jsonError.message,
                    stack: jsonError.stack,
                });
                throw new Error("Invalid JSON response from Ember API");
            }

            const data = await ChatEmberResponse.safeParseAsync(parsedData);
            if (!data.success) {
                elizaLogger.error("Validation failed for Ember response:", {
                    rawData,
                    errors: data.error.errors,
                });
                throw new Error("Invalid response from Ember API");
            }

            const responseData = data.data;

            switch (event) {
                case "done":
                    elizaLogger.log(`Ember response for user ${senderUid}`, {
                        response: responseData,
                    });
                    return responseData.message;
                case "error":
                    elizaLogger.error(`Ember error for user ${senderUid}`, {
                        response: responseData,
                    });
                    return `Error: ${responseData.message}`;
                case "activity":
                    elizaLogger.log(`Ember activity for user ${senderUid}`, {
                        response: responseData,
                    });
                    continue;
                default:
                    elizaLogger.warn(`Unhandled event type for user ${senderUid}`, {
                        event,
                        rawData,
                    });
                    continue;
            }
        }

        throw new Error("Unexpected end of data stream");
    } catch (error) {
        if (error.name === 'AbortError') {
            elizaLogger.error("Request to Ember was aborted due to timeout");
            throw new Error("Request to Ember timed out");
        }
        elizaLogger.error("Error during Ember request:", {
            message: error.message,
            stack: error.stack,
        });
        throw error;
    } finally {
        if (reader) {
            try {
                await reader.cancel();
                elizaLogger.log("Reader canceled successfully");
            } catch (cancelError) {
                elizaLogger.error("Error canceling reader:", {
                    message: cancelError.message,
                    stack: cancelError.stack,
                });
            }
        }
        clearTimeout(timeoutId);
        elizaLogger.log("Cleanup completed");
    }
}

function parseSseResponse(value: string): SseResponse {
    const lines = value.split("\n");
    let event = undefined;
    let rawData = undefined;

    for (const line of lines) {
        const firstColon = line.indexOf(":");
        if (firstColon === -1) continue;

        const prefix = line.slice(0, firstColon);
        const content = line.slice(firstColon + 1).trim();

        switch (prefix) {
            case "":
                // It's a comment or ping message; ignore it
                continue;
            case "event":
                event = content;
                break;
            case "data":
                rawData = content;
                break;
        }
    }

    if (!event || !rawData) {
        elizaLogger.warn("Incomplete SSE response parsed:", { value, event, rawData });
    }

    return { event, rawData };
}
