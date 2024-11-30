import {
    elizaLogger,
    IAgentRuntime,
    ServiceType,
    ModelProviderName,
    ModelClass,
    models,
    settings,
} from "@ai16z/eliza";
import { Service } from "@ai16z/eliza";
import {
    generateText as aiGenerateText,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";


export class EmberAiGenerationService extends Service {
    private runtime: IAgentRuntime;

    static serviceType: ServiceType = ServiceType.TEXT_GENERATION;

    constructor() {
        super();
    }

    async queueTextCompletion(
        context: string,
        temperature: number,
        stop: string[],
        frequency_penalty: number,
        presence_penalty: number,
        max_tokens: number
    ): Promise<string> {
        const provider = ModelProviderName.OPENROUTER;

        // Get model settings for OpenRouter and ignore function parameters
        const temperatureOpenRouter = models[provider].settings.temperature;
        const frequency_penaltyOpenRouter = models[provider].settings.frequency_penalty;
        const presence_penaltyOpenRouter = models[provider].settings.presence_penalty;
        //

        const max_response_length = models[provider].settings.maxOutputTokens;
        const apiKey = this.runtime.token;
        elizaLogger.debug("Initializing OpenRouter model.");
        const serverUrl = models[provider].endpoint;
        const openrouter = createOpenAI({ apiKey, baseURL: serverUrl });
        const model = models[provider].model[ModelClass.SMALL];

        const { text: openrouterResponse } = await aiGenerateText({
            model: openrouter.languageModel(model),
            prompt: context,
            temperature: temperatureOpenRouter,
            system:
                this.runtime.character.system ??
                settings.SYSTEM_PROMPT ??
                undefined,
            maxTokens: max_response_length,
            frequencyPenalty: frequency_penaltyOpenRouter,
            presencePenalty: presence_penaltyOpenRouter,
        });

        elizaLogger.debug("Received response from OpenRouter model.");
        return openrouterResponse;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        try {
            if (runtime.modelProvider === ModelProviderName.LLAMALOCAL) {
                elizaLogger.info("Initializing EmberAiGenerationService...");

                this.runtime = runtime;

                // Temporarily set the model provider to OpenRouter so that other services don't download llama local models
                this.runtime.modelProvider = ModelProviderName.OPENROUTER;

                elizaLogger.success("EmberAiGenerationService initialized successfully");
            } else {
                elizaLogger.info(
                    "Not using llama local model, skipping initialization"
                );
                return;
            }
        } catch (error) {
            elizaLogger.error("Failed to initialize EmberAiGenerationService:", error);
            throw new Error(
                `EmberAiGenerationService initialization failed: ${error.message}`
            );
        }
    }

    async initializeModel() {
        throw new Error("Not implemented");
    }

    async checkModel() {
        throw new Error("Not implemented");
    }

    async deleteModel() {
        throw new Error("Not implemented");
    }

    async queueMessageCompletion(
        context: string,
        temperature: number,
        stop: string[],
        frequency_penalty: number,
        presence_penalty: number,
        max_tokens: number
    ): Promise<any> {
        throw new Error("Not implemented");
    }

    async completion(prompt: string, runtime: IAgentRuntime): Promise<string> {
        throw new Error("Not implemented");
    }

    async embedding(text: string, runtime: IAgentRuntime): Promise<number[]> {
        throw new Error("Not implemented");
    }

    async getEmbeddingResponse(input: string): Promise<number[] | undefined> {
        throw new Error("Not implemented");
    }
}

export default EmberAiGenerationService;
