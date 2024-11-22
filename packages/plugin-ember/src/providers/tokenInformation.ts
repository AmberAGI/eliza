import { AgentRuntime, Memory, Provider } from "@ai16z/eliza";
import askEmber from "../common/askEmber";
import getApiKey from "../common/getApiKey";

const tokenInformationProvider: Provider = {
    get: async (runtime: AgentRuntime, message: Memory) => {
        return await askEmber(
            message.userId,
            `Give information around this market query: ${message.content.text}`,
            getApiKey(runtime)
        );
    },
};

export default tokenInformationProvider;
