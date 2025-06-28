// 交易对类型
export type SymbolPair = 'btcusdt' | 'ethusdt' | 'solusdt';

export interface OrderBookUpdate {
  bids: [string, string][];
  asks: [string, string][];
}

export interface Trade {
  price: string;
  quantity: string;
  timestamp: number;
  isBuyerMaker: boolean;
}

export interface PriceUpdate {
  price: string;
  timestamp: number;
}

export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export interface ExchangeAdapter {
  connect(): void;
  disconnect(): void;
  onOrderBookUpdate(cb: (update: OrderBookUpdate) => void): void;
  onTrade(cb: (trade: Trade) => void): void;
  onPriceUpdate(cb: (update: PriceUpdate) => void): void;
}

// Binance 现货 WebSocket 实现
export class BinanceSpotAdapter implements ExchangeAdapter {
  private ws: WebSocket | null = null;
  private symbol: SymbolPair;
  private orderBookCb: ((update: OrderBookUpdate) => void) | null = null;
  private tradeCb: ((trade: Trade) => void) | null = null;
  private priceCb: ((update: PriceUpdate) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly baseDelay = 1000; // 1s
  private readonly maxDelay = 30000; // 30s
  private snapshotLoaded = false;
  private lastUpdateId = 0;
  private bids: Map<string, string> = new Map();
  private asks: Map<string, string> = new Map();
  private orderbookBuffer: OrderBookUpdate | null = null;
  private throttleTimer: number | null = null;
  private throttleInterval = 100; // ms
  private isConnecting = false;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly connectionTimeoutMs = 10000; // 10s

  constructor(symbol: SymbolPair) {
    this.symbol = symbol;
  }

  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      // 清理旧连接
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close();
        this.ws = null;
      }

      this.snapshotLoaded = false;
      this.bids.clear();
      this.asks.clear();
      await this.loadSnapshot();

      const streams = [
        `${this.symbol}@depth@100ms`,
        `${this.symbol}@trade`,
        `${this.symbol}@ticker`,
      ].join('/');

      this.ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

      // 设置连接超时
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout, retrying...');
          this.ws.close();
        }
      }, this.connectionTimeoutMs);

      this.ws.onopen = () => {
        console.log(`WebSocket connected for ${this.symbol}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      };

      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => {
        console.log(`WebSocket closed for ${this.symbol}:`, event.code, event.reason);
        this.isConnecting = false;
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        this.handleClose();
      };
      this.ws.onerror = (error) => {
        console.error(`WebSocket error for ${this.symbol}:`, error);
        this.isConnecting = false;
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        this.handleError();
      };
    } catch (error) {
      console.error(`Failed to connect for ${this.symbol}:`, error);
      this.isConnecting = false;
      this.handleClose();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    this.snapshotLoaded = false;
    this.bids.clear();
    this.asks.clear();
  }

  onOrderBookUpdate(cb: (update: OrderBookUpdate) => void) {
    this.orderBookCb = cb;
    if (this.snapshotLoaded) {
      this.emitOrderBook();
    }
  }

  onTrade(cb: (trade: Trade) => void) {
    this.tradeCb = cb;
  }

  onPriceUpdate(cb: (update: PriceUpdate) => void) {
    this.priceCb = cb;
  }

  private async loadSnapshot() {
    const resp = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${this.symbol.toUpperCase()}&limit=1000`,
    );
    const data = await resp.json();
    this.lastUpdateId = data.lastUpdateId;
    this.bids = new Map(data.bids);
    this.asks = new Map(data.asks);
    this.snapshotLoaded = true;
    this.emitOrderBook();
  }

  private handleMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);
    if (data.stream.endsWith('@depth@100ms')) {
      this.handleDepthUpdate(data.data);
    } else if (data.stream.endsWith('@trade') && this.tradeCb) {
      const { p: price, q: quantity, T: timestamp, m: isBuyerMaker } = data.data;
      this.tradeCb({ price, quantity, timestamp, isBuyerMaker });
    } else if (data.stream.endsWith('@ticker') && this.priceCb) {
      const { c: price, E: timestamp } = data.data;
      this.priceCb({ price, timestamp });
    }
  }

  private handleDepthUpdate(update: {
    u: number;
    U: number;
    b: [string, string][];
    a: [string, string][];
  }) {
    if (!this.snapshotLoaded) return;
    // 丢弃过期消息
    if (update.u <= this.lastUpdateId) return;
    // 检查是否连续
    if (update.U > this.lastUpdateId + 1) {
      // 断档，需重载快照
      this.loadSnapshot();
      return;
    }
    this.lastUpdateId = update.u;
    // 更新 bids
    for (const [price, qty] of update.b) {
      if (parseFloat(qty) === 0) {
        this.bids.delete(price);
      } else {
        this.bids.set(price, qty);
      }
    }
    // 更新 asks
    for (const [price, qty] of update.a) {
      if (parseFloat(qty) === 0) {
        this.asks.delete(price);
      } else {
        this.asks.set(price, qty);
      }
    }
    this.emitOrderBook();
  }

  private emitOrderBook() {
    if (!this.orderBookCb) return;
    const bidsArr = Array.from(this.bids.entries())
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .slice(0, 20);
    const asksArr = Array.from(this.asks.entries())
      .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
      .slice(0, 20);
    const update: OrderBookUpdate = { bids: bidsArr, asks: asksArr };
    this.throttledEmit(update);
  }

  private throttledEmit(update: OrderBookUpdate) {
    this.orderbookBuffer = update;
    if (!this.throttleTimer) {
      this.throttleTimer = setTimeout(() => {
        if (this.orderbookBuffer && this.orderBookCb) {
          this.orderBookCb(this.orderbookBuffer);
        }
        this.orderbookBuffer = null;
        this.throttleTimer = null;
      }, this.throttleInterval) as unknown as number;
    }
  }

  private handleClose() {
    this.ws = null;
    // 只有在非主动断开的情况下才尝试重连
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.tryReconnect();
    } else {
      console.log(`Max reconnection attempts reached for ${this.symbol}`);
    }
  }

  private handleError() {
    if (this.ws) {
      this.ws.close();
    }
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Max reconnection attempts reached for ${this.symbol}`);
      return;
    }

    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts), this.maxDelay);
    console.log(
      `Attempting to reconnect ${this.symbol} in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  removeOrderBookUpdate() {
    this.orderBookCb = null;
  }

  removePriceUpdate() {
    this.priceCb = null;
  }

  removeTradeUpdate() {
    this.tradeCb = null;
  }

  // 获取历史K线数据
  async getKlineData(interval: string = '1h', limit: number = 100): Promise<KlineData[]> {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${this.symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data.map(
        (
          kline: [
            number,
            string,
            string,
            string,
            string,
            string,
            number,
            string,
            number,
            string,
            string,
          ],
        ) => ({
          openTime: kline[0],
          open: kline[1],
          high: kline[2],
          low: kline[3],
          close: kline[4],
          volume: kline[5],
          closeTime: kline[6],
          quoteAssetVolume: kline[7],
          numberOfTrades: kline[8],
          takerBuyBaseAssetVolume: kline[9],
          takerBuyQuoteAssetVolume: kline[10],
        }),
      );
    } catch (error) {
      console.error('Failed to fetch kline data:', error);
      return [];
    }
  }
}
