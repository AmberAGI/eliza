import { z } from 'zod';

// Transaction schemas
export const TransactionPeriodSchema = z.object({
    buys: z.number(),
    sells: z.number(),
    buyers: z.number(),
    sellers: z.number(),
});

export const TransactionsSchema = z.object({
    m5: TransactionPeriodSchema,
    m15: TransactionPeriodSchema,
    m30: TransactionPeriodSchema,
    h1: TransactionPeriodSchema,
    h24: TransactionPeriodSchema,
});

// Volume schemas
export const VolumePeriodSchema = z.object({
    m5: z.string(),
    h1: z.string(),
    h6: z.string(),
    h24: z.string(),
});

// Price change percentage schema
export const PriceChangePercentageSchema = z.object({
    m5: z.string().optional(),
    h1: z.string().optional(),
    h6: z.string().optional(),
    h24: z.string().optional(),
});

// Relationship data schema
export const RelationshipDataSchema = z.object({
    id: z.string(),
    type: z.string(),
});

// Relationships schema
export const RelationshipsSchema = z.object({
    base_token: z.object({ data: RelationshipDataSchema }),
    quote_token: z.object({ data: RelationshipDataSchema }),
    network: z.object({ data: RelationshipDataSchema }),
    dex: z.object({ data: RelationshipDataSchema }),
});

// Pool attributes schema
export const PoolAttributesSchema = z.object({
    base_token_price_usd: z.string(),
    base_token_price_native_currency: z.string(),
    quote_token_price_usd: z.string(),
    quote_token_price_native_currency: z.string(),
    base_token_price_quote_token: z.string(),
    quote_token_price_base_token: z.string(),
    address: z.string(),
    name: z.string(),
    pool_created_at: z.string(),
    fdv_usd: z.string().nullable(),
    market_cap_usd: z.string().nullable(),
    price_change_percentage: PriceChangePercentageSchema,
    transactions: TransactionsSchema,
    volume_usd: VolumePeriodSchema,
    reserve_in_usd: z.string(),
}).strict();

// Pool data schema
export const PoolDataSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: PoolAttributesSchema,
    relationships: RelationshipsSchema,
}).strict();

// Root response schema
export const GeckoTerminalResponseSchema = z.object({
    data: z.array(PoolDataSchema),
}).strict();

// Infer types from schemas
export type GeckoTerminalResponse = z.infer<typeof GeckoTerminalResponseSchema>;
export type PoolData = z.infer<typeof PoolDataSchema>;
export type PoolAttributes = z.infer<typeof PoolAttributesSchema>; 