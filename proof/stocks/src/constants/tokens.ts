export const STOCK_TOKENS = {
  TSLA: {
    symbol: 'TSLA' as const,
    name: 'Tesla',
    address: '0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E',
    decimals: 18,
    logoUrl: 'https://cdn.brandfetch.io/id2S-kXbuK/w/400/h/400/theme/dark/icon.png?c=1bxid64Mup7aczewSAYMX&t=1725611825559',
    color: '#CC0000',
  },
  AMZN: {
    symbol: 'AMZN' as const,
    name: 'Amazon',
    address: '0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02',
    decimals: 18,
    logoUrl: 'https://cdn.brandfetch.io/idawOgYOsG/w/800/h/268/theme/dark/logo.png?c=1bxid64Mup7aczewSAYMX&t=1747149760488',
    color: '#FF9900',
  },
  PLTR: {
    symbol: 'PLTR' as const,
    name: 'Palantir',
    address: '0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0',
    decimals: 18,
    logoUrl: 'https://cdn.brandfetch.io/idcRQNQNDH/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1772397304195',
    color: '#101820',
  },
  NFLX: {
    symbol: 'NFLX' as const,
    name: 'Netflix',
    address: '0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93',
    decimals: 18,
    logoUrl: 'https://cdn.brandfetch.io/ideQwN5lBE/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1741362553726',
    color: '#E50914',
  },
  AMD: {
    symbol: 'AMD' as const,
    name: 'AMD',
    address: '0x71178BAc73cBeb415514eB542a8995b82669778d',
    decimals: 18,
    logoUrl: 'https://cdn.brandfetch.io/idnN8KdbKa/w/480/h/480/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1761207322732',
    color: '#ED1C24',
  },
} as const;

export const WETH_ADDRESS = '0x7943e237c7F95DA44E0301572D358911207852Fa' as const;

export type StockSymbol = keyof typeof STOCK_TOKENS;

export const STOCK_SYMBOLS = Object.keys(STOCK_TOKENS) as StockSymbol[];

/** Get token config by symbol */
export function getStockToken(symbol: StockSymbol) {
  return STOCK_TOKENS[symbol];
}

/** Get token config by contract address (case-insensitive) */
export function getStockTokenByAddress(address: string) {
  const lower = address.toLowerCase();
  return Object.values(STOCK_TOKENS).find(t => t.address.toLowerCase() === lower) ?? null;
}
