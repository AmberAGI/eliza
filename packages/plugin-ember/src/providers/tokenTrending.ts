import { AgentRuntime, elizaLogger, Memory, Provider } from "@ai16z/eliza";
import { GeckoTerminalResponseSchema, type GeckoTerminalResponse, type PoolData } from "../schemas/geckoTerminal";

interface GeckoTerminalParams {
    [key: string]: any;
}

// Define a new type for PoolData with score
interface PoolDataWithScore extends PoolData {
    score: number;
}

export async function queryGeckoTerminal(
    route: string,
    parameters?: GeckoTerminalParams
): Promise<GeckoTerminalResponse> {
    const url = new URL(`https://api.geckoterminal.com/api/v2${route}`);
    if (parameters) {
        Object.entries(parameters).forEach(([key, value]) => 
            url.searchParams.append(key, String(value))
        );
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed querying gecko terminal");
        }
        const jsonData = await response.json();
        // Validate response with Zod schema
        return GeckoTerminalResponseSchema.parse(jsonData);
    } catch (error) {
        throw new Error(`Failed querying gecko terminal: ${error}`);
    }
}

export function getTopThreeTokens(poolData: PoolData[]): PoolDataWithScore[] {
    const epsilon = 1e-6;
    const now = Date.now();

    // Define normalization functions
    const normalize = (value: number, min: number, max: number) =>
        max - min === 0 ? 0 : (value - min) / (max - min);

    function getPercentile(sortedValues: number[], percentile: number) {
        const index = (percentile / 100) * (sortedValues.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;

        if (upper >= sortedValues.length) return sortedValues[lower];
        return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
    }

    function safeParseFloat(value: any): number {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    // Extract and preprocess token data without modifying original items
    const tokensWithScores = poolData.map((item) => {
        const attributes = item.attributes;

        // Parse and validate data
        const poolCreatedAt = new Date(attributes.pool_created_at).getTime() || now;
        const volumeUSD = safeParseFloat(attributes.volume_usd?.h24) + epsilon;
        const reserveUSD = safeParseFloat(attributes.reserve_in_usd) + epsilon;

        // Extract price change percentages for multiple timeframes
        const priceChange1h = safeParseFloat(attributes.price_change_percentage?.h1 || "0");
        const priceChange6h = safeParseFloat(attributes.price_change_percentage?.h6 || "0");
        const priceChange24h = safeParseFloat(attributes.price_change_percentage?.h24 || "0");

        const transactionsCount =
            (attributes.transactions?.h24?.buys || 0) +
            (attributes.transactions?.h24?.sells || 0);

        // Cap price changes between -100% and 500%
        const cappedPriceChange1h = Math.max(-100, Math.min(priceChange1h, 500));
        const cappedPriceChange6h = Math.max(-100, Math.min(priceChange6h, 500));
        const cappedPriceChange24h = Math.max(-100, Math.min(priceChange24h, 500));

        return {
            item, // Original PoolData
            computedValues: {
                poolCreatedAt,
                volumeUSD,
                reserveUSD,
                priceChange1h: cappedPriceChange1h,
                priceChange6h: cappedPriceChange6h,
                priceChange24h: cappedPriceChange24h,
                transactionsCount,
            },
            score: 0, // Placeholder for the score
        };
    });

    // Collect all values for normalization
    const poolCreatedAtTimes = tokensWithScores.map((t) => t.computedValues.poolCreatedAt);
    const volumeValues = tokensWithScores.map((t) => t.computedValues.volumeUSD);
    const reserveValues = tokensWithScores.map((t) => t.computedValues.reserveUSD);
    const priceChange1hValues = tokensWithScores.map((t) => t.computedValues.priceChange1h);
    const priceChange6hValues = tokensWithScores.map((t) => t.computedValues.priceChange6h);
    const priceChange24hValues = tokensWithScores.map((t) => t.computedValues.priceChange24h);
    const transactionsValues = tokensWithScores.map((t) => t.computedValues.transactionsCount);

    // Sort values for percentile calculation
    const sortedCreatedAt = poolCreatedAtTimes.slice().sort((a, b) => a - b);
    const sortedVolumes = volumeValues.slice().sort((a, b) => a - b);
    const sortedReserves = reserveValues.slice().sort((a, b) => a - b);
    const sortedPriceChange1h = priceChange1hValues.slice().sort((a, b) => a - b);
    const sortedPriceChange6h = priceChange6hValues.slice().sort((a, b) => a - b);
    const sortedPriceChange24h = priceChange24hValues.slice().sort((a, b) => a - b);
    const sortedTransactions = transactionsValues.slice().sort((a, b) => a - b);

    // Calculate 5th and 95th percentiles
    const minCreatedAt = getPercentile(sortedCreatedAt, 5);
    const maxCreatedAt = getPercentile(sortedCreatedAt, 95);
    const minVolume = getPercentile(sortedVolumes, 5);
    const maxVolume = getPercentile(sortedVolumes, 95);
    const minReserve = getPercentile(sortedReserves, 5);
    const maxReserve = getPercentile(sortedReserves, 95);
    const minPriceChange1h = getPercentile(sortedPriceChange1h, 5);
    const maxPriceChange1h = getPercentile(sortedPriceChange1h, 95);
    const minPriceChange6h = getPercentile(sortedPriceChange6h, 5);
    const maxPriceChange6h = getPercentile(sortedPriceChange6h, 95);
    const minPriceChange24h = getPercentile(sortedPriceChange24h, 5);
    const maxPriceChange24h = getPercentile(sortedPriceChange24h, 95);
    const minTransactions = getPercentile(sortedTransactions, 5);
    const maxTransactions = getPercentile(sortedTransactions, 95);

    // Calculate scores
    tokensWithScores.forEach((token) => {
        const cv = token.computedValues;

        const recencyScore = normalize(cv.poolCreatedAt, minCreatedAt, maxCreatedAt);
        const volumeScore = normalize(
            Math.log(cv.volumeUSD + epsilon),
            Math.log(minVolume + epsilon),
            Math.log(maxVolume + epsilon)
        );
        const reserveScore = normalize(
            Math.log(cv.reserveUSD + epsilon),
            Math.log(minReserve + epsilon),
            Math.log(maxReserve + epsilon)
        );
        const priceChangeScore1h = normalize(
            cv.priceChange1h,
            minPriceChange1h,
            maxPriceChange1h
        );
        const priceChangeScore6h = normalize(
            cv.priceChange6h,
            minPriceChange6h,
            maxPriceChange6h
        );
        const priceChangeScore24h = normalize(
            cv.priceChange24h,
            minPriceChange24h,
            maxPriceChange24h
        );
        const transactionsScore = normalize(
            Math.log(cv.transactionsCount + epsilon),
            Math.log(minTransactions + epsilon),
            Math.log(maxTransactions + epsilon)
        );

        // Combine price change scores with weights
        const priceChangeScore =
            priceChangeScore1h * 0.5 +
            priceChangeScore6h * 0.3 +
            priceChangeScore24h * 0.2;

        // Adjust weights based on importance
        token.score =
            recencyScore * 0.35 +       // Adjusted weight for recency
            volumeScore * 0.25 +       // Weight for volume
            reserveScore * 0.15 +       // Weight for reserve
            priceChangeScore * 0.15 +  // Increased weight for combined price changes
            transactionsScore * 0.1;   // Weight for transactions
    });

    // Sort tokens by descending score
    tokensWithScores.sort((a, b) => b.score - a.score);

    // Return the top tokens with their original data and scores
    return tokensWithScores.slice(0, 3).map((token) => ({
        ...token.item,
        score: token.score,
    }));
}

export function formatTokenData(data: PoolDataWithScore[]): string {
    // Randomly decide whether to return 1 or 3 tokens (70% chance for 1 token)
    const returnSingleToken = Math.random() < 0.7;
    const tokensToReturn = returnSingleToken ? data.slice(0, 1) : data.slice(0, 3);

    const filteredTokens = tokensToReturn.filter((token) => token.attributes.name);
    const tokensXml = filteredTokens.map((token) => {
        const attributes = token.attributes;
        // Extract symbol from the name (e.g., "CHILLGUY / SOL" -> "CHILLGUY")
        const symbol = attributes.name.split(' / ')[0];

        elizaLogger.log(`Token: ${symbol}`);

        return `
        <token>
            <symbol>$${symbol}</symbol>
            <contractAddress>${token.relationships.base_token.data.id}</contractAddress>
            <price>${attributes.base_token_price_usd}</price>
            <priceChange1h>${attributes.price_change_percentage.h1 || '0'}%</priceChange1h>
            <priceChange6h>${attributes.price_change_percentage.h6 || '0'}%</priceChange6h>
            <priceChange24h>${attributes.price_change_percentage.h24 || '0'}%</priceChange24h>
            <volumeUSD>${attributes.volume_usd.h24}</volumeUSD>
            <reserveUSD>${attributes.reserve_in_usd}</reserveUSD>
        </token>`;
    }).join('');

    return `<trendingTokens>${tokensXml}</trendingTokens>`;
}

const tokenTrendingProvider: Provider = {
    get: async (runtime: AgentRuntime, message: Memory) => {
        try {
            const aggregatedData: GeckoTerminalResponse['data'] = [];
            for (let page = 1; page <= 3; page++) {
                const searchParameters = { "query": message.content.text, "page": page };
                const response = await queryGeckoTerminal("/networks/trending_pools", searchParameters);
                elizaLogger.log(`Gecko Terminal returned ${response.data.length} trending pools on page ${page}`);
                aggregatedData.push(...response.data);
            }

            const topThreeTokens = getTopThreeTokens(aggregatedData);
            elizaLogger.log(`Top three tokens: ${topThreeTokens.map((token) => token.attributes.name).join(", ")}`);

            const formattedTokens = formatTokenData(topThreeTokens);
            return formattedTokens;
        } catch (error) {
            elizaLogger.error(error);
            return "No trending tokens found.";
        }
    },
};

export default tokenTrendingProvider;
