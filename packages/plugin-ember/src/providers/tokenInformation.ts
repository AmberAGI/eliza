import { AgentRuntime, elizaLogger, Memory, Provider } from "@ai16z/eliza";
import askEmber from "../common/askEmber";
import getApiKey from "../common/getApiKey";

// TODO: (fix) This is a temporary fix to prevent the token information provider from being called twice during each text generation.
let hasBeenCalled = false;

const tokenInformationProvider: Provider = {
    get: async (runtime: AgentRuntime, message: Memory) => {
        if (hasBeenCalled) {
            return "Ember is currently busy. Please try again later.";
        }
        hasBeenCalled = true;
        try {
            const apiKey = getApiKey(runtime);
            const response = await askEmber(
                message.userId,
                message.content.text,
                apiKey,
                "market_news_query"
            );
            elizaLogger.log("Ember's token information response: ", response);
            return response;
        } catch (error) {
            elizaLogger.error("Error in tokenInformationProvider:", {
                message: error.message,
                stack: error.stack,
            });
            return "An error occurred while fetching token information.";
        } finally {
            hasBeenCalled = false;
        }
    },
};

export default tokenInformationProvider;
