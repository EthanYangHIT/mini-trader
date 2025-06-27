// 通用交易相关类型定义

export type OrderSide = 'buy' | 'sell';

export interface VirtualOrder {
  id: string;
  side: OrderSide;
  price: number;
  amount: number;
  symbol: string;
  status: 'open' | 'filled';
}

export interface TradeHistory {
  id: string;
  side: OrderSide;
  price: number;
  amount: number;
  symbol: string;
  time: number;
}

export interface AvgCostResult {
  amount: number;
  avgPrice: number;
} 