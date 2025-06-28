import { useEffect, useState } from 'react';
import type { VirtualOrder, TradeHistory } from '../types/trade';
import { getStorage, setStorage } from './storage';
import { toast } from 'react-hot-toast';

function getOrdersFromStorage(): VirtualOrder[] {
  return getStorage<VirtualOrder[]>('virtualOrders', []);
}
function saveOrdersToStorage(orders: VirtualOrder[]) {
  setStorage('virtualOrders', orders);
}
function getTradeHistoryFromStorage(): TradeHistory[] {
  return getStorage<TradeHistory[]>('virtualTradeHistory', []);
}
function saveTradeHistoryToStorage(history: TradeHistory[]) {
  setStorage('virtualTradeHistory', history);
}

export function useTrade(pair: string, price: string) {
  const [orders, setOrders] = useState<VirtualOrder[]>(getOrdersFromStorage());
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>(getTradeHistoryFromStorage());

  // 下单
  function placeOrder(order: Omit<VirtualOrder, 'id' | 'status'>) {
    const newOrder: VirtualOrder = {
      ...order,
      id: Date.now() + Math.random().toString(36).slice(2),
      status: 'open',
    };
    const nextOrders = [...orders, newOrder];
    setOrders(nextOrders);
    saveOrdersToStorage(nextOrders);
    toast.success('下单成功');
  }

  // 撤销
  function cancelOrder(id: string) {
    const nextOrders = orders.filter((o) => o.id !== id);
    setOrders(nextOrders);
    saveOrdersToStorage(nextOrders);
  }

  // 撮合
  useEffect(() => {
    if (!price) return;
    const currentPrice = parseFloat(price);
    let changed = false;
    const filledOrderIds: string[] = [];
    const nextOrders = orders.map((order) => {
      if (order.status === 'open' && order.symbol === pair) {
        if (
          (order.side === 'buy' && currentPrice <= order.price) ||
          (order.side === 'sell' && currentPrice >= order.price)
        ) {
          order.status = 'filled';
          order.price = currentPrice;
          changed = true;
          filledOrderIds.push(order.id);
        }
      }
      return order;
    });
    if (changed) {
      setOrders([...nextOrders]);
      saveOrdersToStorage(nextOrders);
      // 更新成交历史
      const filledOrders = nextOrders.filter((o) => o.status === 'filled');
      const nextHistory = getTradeHistoryFromStorage();
      for (const fo of filledOrders) {
        if (fo.symbol !== pair) continue;
        if (!nextHistory.find((h) => h.id === fo.id)) {
          nextHistory.push({
            id: fo.id,
            side: fo.side,
            price: fo.price,
            amount: fo.amount,
            symbol: fo.symbol,
            time: Date.now(),
          });
        }
      }
      setTradeHistory([...nextHistory]);
      saveTradeHistoryToStorage(nextHistory);
      // 新成交订单弹 toast
      if (filledOrderIds.length > 0) {
        toast.success('订单成交');
      }
    }
  }, [price, pair, orders]);

  return { orders, tradeHistory, placeOrder, cancelOrder };
}
