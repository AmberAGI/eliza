import { Plugin } from "@ai16z/eliza";
import tokenInformationProvider from "./providers/tokenInformation";

export const bootstrapPlugin: Plugin = {
    name: "ember",
    description: "Your crypto AI companion.",
    providers: [tokenInformationProvider],
};
