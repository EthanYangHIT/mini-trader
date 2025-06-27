import { useEffect, useState } from 'react';
import type { TradeHistory } from '../types/trade';

export function useAvgCostWorker(tradeHistory: TradeHistory[], symbol: string) {
  const [result, setResult] = useState<{ amount: number; avgPrice: number }>({ amount: 0, avgPrice: 0 });
  useEffect(() => {
    const worker = new Worker(new URL('../works/calcAvgCost.worker.ts', import.meta.url));
    worker.postMessage({ tradeHistory, symbol });
    worker.onmessage = (e) => {
      setResult(e.data);
      worker.terminate();
    };
    return () => worker.terminate();
  }, [tradeHistory, symbol]);
  return result;
} 