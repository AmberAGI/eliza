import { Plugin } from "@ai16z/eliza";
import { tokenInformationProvider, tokenTrendingProvider } from "./providers/index.ts";
import { EmberAiGenerationService } from "./services/index.ts";

export const emberPlugin: Plugin = {
    name: "ember",
    description: "Your crypto AI companion.",
    providers: [ tokenInformationProvider, tokenTrendingProvider],
    services: [new EmberAiGenerationService()],
};
