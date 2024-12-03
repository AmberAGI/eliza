import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { GeckoTerminalResponse } from '../schemas/geckoTerminal';

// Import the functions we want to test
import { getTopTokens, formatTokenData, queryGeckoTerminal } from '../providers/tokenTrending';

const mockResponse: GeckoTerminalResponse = {
  data: [
      {
          id: '1',
          type: 'pool',
          attributes: {
              name: 'TEST / SOL',
              pool_created_at: '2024-03-10T00:00:00Z',
              volume_usd: { m5: '0', h1: '0', h6: '0', h24: '1000000' },
              reserve_in_usd: '500000',
              base_token_price_usd: '1.0',
              base_token_price_native_currency: '1.0',
              quote_token_price_usd: '1.0',
              quote_token_price_native_currency: '1.0',
              base_token_price_quote_token: '1.0',
              quote_token_price_base_token: '1.0',
              address: '0x123',
              fdv_usd: null,
              market_cap_usd: null,
              price_change_percentage: {
                  m5: '0',
                  h1: '10',
                  h6: '20',
                  h24: '30'
              },
              transactions: {
                  m5: { buys: 0, sells: 0, buyers: 0, sellers: 0 },
                  m15: { buys: 0, sells: 0, buyers: 0, sellers: 0 },
                  m30: { buys: 0, sells: 0, buyers: 0, sellers: 0 },
                  h1: { buys: 0, sells: 0, buyers: 0, sellers: 0 },
                  h24: { buys: 100, sells: 50, buyers: 75, sellers: 25 }
              }
          },
          relationships: {
              base_token: { data: { id: 'base-token-id', type: 'token' } },
              quote_token: { data: { id: 'quote-token-id', type: 'token' } },
              network: { data: { id: 'network-id', type: 'network' } },
              dex: { data: { id: 'dex-id', type: 'token' } }
          }
      },
      {
          id: '2',
          type: 'pool',
          attributes: {
              name: 'ABC / XYZ',
              pool_created_at: '2024-04-15T12:00:00Z',
              volume_usd: { m5: '500', h1: '1500', h6: '3000', h24: '6000' },
              reserve_in_usd: '250000',
              base_token_price_usd: '2.5',
              base_token_price_native_currency: '2.5',
              quote_token_price_usd: '3.0',
              quote_token_price_native_currency: '3.0',
              base_token_price_quote_token: '1.2',
              quote_token_price_base_token: '0.8',
              address: '0xABC',
              fdv_usd: '750000',
              market_cap_usd: '500000',
              price_change_percentage: {
                  m5: '5',
                  h1: '-3',
                  h6: '12',
                  h24: '25'
              },
              transactions: {
                  m5: { buys: 10, sells: 5, buyers: 8, sellers: 3 },
                  m15: { buys: 20, sells: 10, buyers: 15, sellers: 5 },
                  m30: { buys: 30, sells: 15, buyers: 20, sellers: 10 },
                  h1: { buys: 40, sells: 20, buyers: 25, sellers: 15 },
                  h24: { buys: 100, sells: 50, buyers: 75, sellers: 25 }
              }
          },
          relationships: {
              base_token: { data: { id: 'base-token-id-ABC', type: 'token' } },
              quote_token: { data: { id: 'quote-token-id-XYZ', type: 'token' } },
              network: { data: { id: 'network-id-ABC', type: 'network' } },
              dex: { data: { id: 'dex-id-XYZ', type: 'dex' } }
          }
      },
      {
          id: '3',
          type: 'pool',
          attributes: {
              name: 'DEF / USD',
              pool_created_at: '2023-12-01T08:30:00Z',
              volume_usd: { m5: '100', h1: '200', h6: '500', h24: '1000' },
              reserve_in_usd: '100000',
              base_token_price_usd: '0.5',
              base_token_price_native_currency: '0.5',
              quote_token_price_usd: '1.0',
              quote_token_price_native_currency: '1.0',
              base_token_price_quote_token: '0.5',
              quote_token_price_base_token: '2.0',
              address: '0xDEF',
              fdv_usd: '50000',
              market_cap_usd: '100000',
              price_change_percentage: {
                  m5: '-2',
                  h1: '4',
                  h6: '6',
                  h24: '10'
              },
              transactions: {
                  m5: { buys: 5, sells: 2, buyers: 3, sellers: 1 },
                  m15: { buys: 10, sells: 5, buyers: 6, sellers: 3 },
                  m30: { buys: 15, sells: 7, buyers: 9, sellers: 4 },
                  h1: { buys: 20, sells: 10, buyers: 12, sellers: 5 },
                  h24: { buys: 50, sells: 25, buyers: 30, sellers: 15 }
              }
          },
          relationships: {
              base_token: { data: { id: 'base-token-id-DEF', type: 'token' } },
              quote_token: { data: { id: 'quote-token-id-USD', type: 'token' } },
              network: { data: { id: 'network-id-DEF', type: 'network' } },
              dex: { data: { id: 'dex-id-USD', type: 'dex' } }
          }
      },
      {
          id: '4',
          type: 'pool',
          attributes: {
              name: 'INCOMPLETE / POOL',
              // Missing pool_created_at
              volume_usd: { m5: '1000', h1: '2000', h6: '3000', h24: '4000' },
              // Missing reserve_in_usd
              base_token_price_usd: '5.0',
              // Missing quote_token_price_usd
              // ... other missing fields
              address: '0xINCOMPLETE',
              price_change_percentage: {
                  m5: '15',
                  h1: null, // Assuming null values
                  h6: null,
                  h24: '35'
              },
              transactions: {
                  m5: { buys: 50, sells: 25, buyers: 30, sellers: 15 },
                  // ... other transaction periods missing
              }
          },
          relationships: {
              base_token: { data: { id: 'base-token-id-INCOMPLETE', type: 'token' } },
              // Missing quote_token
              network: { data: { id: 'network-id-INCOMPLETE', type: 'network' } },
              dex: { data: { id: 'dex-id-INCOMPLETE', type: 'dex' } }
          }
      },
      {
          id: '5',
          type: 'pool',
          attributes: {
              name: 'EXTREME / FLUCT',
              pool_created_at: '2024-01-20T18:45:00Z',
              volume_usd: { m5: '10000', h1: '20000', h6: '30000', h24: '40000' },
              reserve_in_usd: '1000000',
              base_token_price_usd: '10.0',
              base_token_price_native_currency: '10.0',
              quote_token_price_usd: '20.0',
              quote_token_price_native_currency: '20.0',
              base_token_price_quote_token: '0.5',
              quote_token_price_base_token: '2.0',
              address: '0xEXTREME',
              fdv_usd: '2000000',
              market_cap_usd: '1000000',
              price_change_percentage: {
                  m5: '-50',
                  h1: '100',
                  h6: '-150',
                  h24: '200'
              },
              transactions: {
                  m5: { buys: 500, sells: 300, buyers: 450, sellers: 250 },
                  m15: { buys: 1000, sells: 600, buyers: 900, sellers: 550 },
                  m30: { buys: 1500, sells: 900, buyers: 1350, sellers: 800 },
                  h1: { buys: 2000, sells: 1200, buyers: 1800, sellers: 1000 },
                  h24: { buys: 5000, sells: 3000, buyers: 4500, sellers: 2500 }
              }
          },
          relationships: {
              base_token: { data: { id: 'base-token-id-EXTREME', type: 'token' } },
              quote_token: { data: { id: 'quote-token-id-FLUCT', type: 'token' } },
              network: { data: { id: 'network-id-EXTREME', type: 'network' } },
              dex: { data: { id: 'dex-id-FLUCT', type: 'dex' } }
          }
      }
  ]
};

describe('tokenTrending', () => {
    const mockFetch = vi.fn();

    beforeAll(() => {
        global.fetch = mockFetch;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    describe('queryGeckoTerminal', () => {
        it('should successfully query gecko terminal', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const data = await queryGeckoTerminal("/networks/trending_pools", { query: "test", page: 1 });
            
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('https://api.geckoterminal.com/api/v2/networks/trending_pools')
            );
            expect(data).toEqual(mockResponse);
        });

        it('should handle failed requests', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false
            });

            await expect(queryGeckoTerminal("/networks/trending_pools", {}))
                .rejects
                .toThrow('Failed querying gecko terminal');
        });
    });

    describe('getTopThreeTokens', () => {
        it('should correctly score and sort tokens', () => {
            const topTokens = getTopTokens(mockResponse);

            expect(topTokens).toHaveLength(3);
            // Additional assertions to check if the tokens are correctly sorted
        });
    });

    describe('formatTokenData', () => {
        const mockFetch = vi.fn();
        global.fetch = mockFetch;

        it('should format token data into valid XML', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await formatTokenData(mockResponse.data);
            
            // Use 'result' in assertions
            expect(result).toContain('<name>TEST / SOL</name>');
            expect(result).toContain('<symbol>TEST</symbol>');
            expect(result).toContain('<contractAddress>base-token-id</contractAddress>');
            expect(result).toContain('<price>1.0</price>');
            expect(result).toContain('<volumeUSD>1000000</volumeUSD>');
            expect(result).toContain('<reserveUSD>500000</reserveUSD>');
        });

        it('should handle missing price change percentages', () => {
            const result = formatTokenData([mockResponse.data[3]]);

            expect(result).toContain('<priceChange1h>0%</priceChange1h>');
            expect(result).toContain('<priceChange6h>0%</priceChange6h>');
            expect(result).toContain('<priceChange24h>35%</priceChange24h>');
        });
    });
}); 