import { Plugin } from "@ai16z/eliza";
import tokenTrendingProvider from "./providers/tokenTrending";

export const emberPlugin: Plugin = {
    name: "ember",
    description: "Your crypto AI companion.",
    providers: [tokenTrendingProvider],
};
