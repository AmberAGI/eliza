import {
    elizaLogger,
    IAgentRuntime,
    ServiceType,
    ModelProviderName,
    ModelClass,
    models,
    settings,
    composeContext
} from "@ai16z/eliza";
import { Service } from "@ai16z/eliza";
import {
    generateText as aiGenerateText,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import getApiKey from "../common/getApiKey";
import askEmber from "../common/askEmber";

export class EmberAiGenerationService extends Service {
    private runtime: IAgentRuntime;
    private readonly logDir = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../agent/logs'
    );
    private readonly logFile = 'runtime-state.json';

    static serviceType: ServiceType = ServiceType.TEXT_GENERATION;

    constructor() {
        super();
    }

    private async writeToLog(data: any) {
        elizaLogger.log("Writing text generation to log file...");
        try {
            elizaLogger.log("Log directory path:", this.logDir);
            elizaLogger.log("Full log file path:", path.join(this.logDir, this.logFile));
            
            // Create logs directory if it doesn't exist
            if (!fs.existsSync(this.logDir)) {
                elizaLogger.log("Creating log directory as it doesn't exist");
                await promisify(fs.mkdir)(this.logDir, { recursive: true });
            }

            // Filter out embeddings from the data
            const filteredData = JSON.parse(JSON.stringify(data.state));
            
            // Filter embeddings from recentInteractionsData
            if (filteredData.recentInteractionsData) {
                filteredData.recentInteractionsData = filteredData.recentInteractionsData.map(
                    (interaction: any) => {
                        const { embedding, ...rest } = interaction;
                        return rest;
                    }
                );
            }

            // Filter embeddings from recentMessagesData
            if (filteredData.recentMessagesData) {
                filteredData.recentMessagesData = filteredData.recentMessagesData.map(
                    (message: any) => {
                        const { embedding, ...rest } = message;
                        return rest;
                    }
                );
            }

            const logEntry = {
                timestamp: new Date().toISOString(),
                state: filteredData,
                message: data.message,
                context: data.context
            };

            const logPath = path.join(this.logDir, this.logFile);
            
            // Read existing logs or start with empty array
            let logs = [];
            if (fs.existsSync(logPath)) {
                const content = await promisify(fs.readFile)(logPath, 'utf-8');
                logs = JSON.parse(content);
            }

            // Append new log entry
            logs.push(logEntry);

            // Write back to file
            await promisify(fs.writeFile)(
                logPath,
                JSON.stringify(logs, null, 2),
                'utf-8'
            );
        } catch (error) {
            elizaLogger.error('Failed to write to log file:', error);
        }
    }

    private async requestEmberResponse(message: string, senderUid: string) {
        const apiKey = getApiKey(this.runtime);
        return await askEmber(senderUid, message, apiKey);
    }

    async queueTextCompletion(
        context: string,
        temperature: number,
        stop: string[],
        frequency_penalty: number,
        presence_penalty: number,
        max_tokens: number
    ): Promise<string> {
        const state = this.runtime.lastMessageState.state;
        const message = this.runtime.lastMessageState.message;
        await this.writeToLog({
            state,
            message,
            context
        });

        let revisedContext = context;
        const source = state.source;
        elizaLogger.log("Ember Ai Generation Service source: ", source);

        switch (source) {
            case "twitter": {
                elizaLogger.log("Twitter source detected, using Twitter handler");
                const random = Math.random();
                if (random < 2/3) {
                    elizaLogger.log("Trending token Twitter behavior triggered (2/3 chance)");
                    revisedContext = composeContext({
                        state: { ...state, category: "token alpha" },
                        template: this.runtime.character.templates.twitterPostTemplate
                    });
                } else {
                    elizaLogger.log("Default Twitter behavior triggered");
                }
                break;
            }
            case "telegram": {
                elizaLogger.log("Telegram source detected, using Telegram handler");
                return await this.requestEmberResponse(message, state.userId);
            }
            default:
                elizaLogger.log(`Unhandled source type: ${source}. Using default handler`);
        }

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
            prompt: revisedContext,
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
