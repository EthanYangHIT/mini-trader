import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import './App.css';
import { BinanceSpotAdapter } from './adapters/ExchangeAdapter';
import type { SymbolPair, PriceUpdate, Trade as TradeType, OrderBookUpdate } from './adapters/ExchangeAdapter';
import Trade from './components/Trade';
import { Select } from 'antd';
import OrderBook from './components/OrderBook';

const PAIRS: { label: string; value: SymbolPair }[] = [
  { label: 'BTC/USDT', value: 'btcusdt' },
  { label: 'ETH/USDT', value: 'ethusdt' },
  { label: 'SOL/USDT', value: 'solusdt' },
];

interface AppProps {
  themeMode: 'light' | 'dark';
  setThemeMode: Dispatch<SetStateAction<'light' | 'dark'>>;
}

function App({ themeMode, setThemeMode }: AppProps) {
  const [pair, setPair] = useState<SymbolPair>('btcusdt');
  const [price, setPrice] = useState<string>('');
  const [volume, setVolume] = useState<string>('');
  const [bids, setBids] = useState<[string, string][]>([]);
  const [asks, setAsks] = useState<[string, string][]>([]);
  const adapterRef = useRef<BinanceSpotAdapter | null>(null);
  const [orderbookLoading, setOrderbookLoading] = useState(true);
  const bgColor = themeMode === 'dark' ? '#181a20' : '#f5f6fa';

  useEffect(() => {
    setOrderbookLoading(true);
    if (adapterRef.current) {
      adapterRef.current.removeOrderBookUpdate?.();
      adapterRef.current.removePriceUpdate?.();
      adapterRef.current.removeTradeUpdate?.();
      adapterRef.current.disconnect();
    }
    const adapter = new BinanceSpotAdapter(pair);
    adapterRef.current = adapter;
    adapter.connect();
    let firstOrderbook = true;
    let firstPrice = true;
    const setBidsLocal = setBids;
    const setAsksLocal = setAsks;
    const setPriceLocal = setPrice;
    const setVolumeLocal = setVolume;
    const setOrderbookLoadingLocal = setOrderbookLoading;
    adapter.onPriceUpdate((update: PriceUpdate) => {
      if (firstPrice) {
        setPriceLocal(update.price);
        firstPrice = false;
      } else {
        setPriceLocal(update.price);
      }
    });
    adapter.onTrade((trade: TradeType) => {
      setVolumeLocal(trade.quantity);
    });
    adapter.onOrderBookUpdate((update: OrderBookUpdate) => {
      if (firstOrderbook) {
        setBidsLocal(update.bids);
        setAsksLocal(update.asks);
        setOrderbookLoadingLocal(false);
        firstOrderbook = false;
      } else {
        setBidsLocal(update.bids);
        setAsksLocal(update.asks);
      }
    });
    return () => {
      adapter.disconnect();
    };
  }, [pair]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  return (
    <div className="container" style={{ background: bgColor, minHeight: '100vh' }}>
      <header>
        <h1>Mini Crypto Trader</h1>
        <Select
          value={pair}
          onChange={v => setPair(v)}
          style={{ width: 140, marginLeft: 8 }}
          options={PAIRS.map(p => ({ label: p.label, value: p.value }))}
          styles={{ popup: { root: { minWidth: 120 } } }}
        />
        <button
          className="theme-toggle-btn"
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          title={themeMode === 'dark' ? '切换为亮色' : '切换为暗色'}
        >
          {themeMode === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>
      <main>
        <div className="chart-placeholder">
          <div className="price">Price: <span>{price || '--'}</span></div>
          <div className="volume">Volume: <span>{volume || '--'}</span></div>
          <div className="chart-icon">[TradingView Chart 预留区]</div>
        </div>
        <OrderBook
          bids={bids}
          asks={asks}
          loading={orderbookLoading}
          bgColor={bgColor}
        />
        <Trade pair={pair} price={price} />
      </main>
    </div>
  );
}

export default App;
