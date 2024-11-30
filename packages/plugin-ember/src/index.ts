import { Plugin } from "@ai16z/eliza";
import tokenTrendingProvider from "./providers/tokenTrending";
import { EmberAiGenerationService } from "./services/index.ts";

export const emberPlugin: Plugin = {
    name: "ember",
    description: "Your crypto AI companion.",
    providers: [tokenTrendingProvider],
    services: [new EmberAiGenerationService()],
};
