import React from 'react';

interface OrderBookProps {
  bids: [string, string][];
  asks: [string, string][];
  loading: boolean;
  bgColor: string;
}

function calcAmount(price: string, qty: string) {
  return parseFloat(price) * parseFloat(qty);
}

function formatAmount(amount: number) {
  if (amount >= 1e6) return (amount / 1e6).toFixed(2) + 'M';
  if (amount >= 1e3) return (amount / 1e3).toFixed(2) + 'K';
  return amount.toFixed(2);
}

function formatPrice(price: string) {
  return parseFloat(price).toFixed(2);
}

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks, loading, bgColor }) => {
  return (
    <div className="orderbook-wrapper" style={{ position: 'relative', background: bgColor }}>
      <div className="orderbook-mask" style={{ display: loading ? 'flex' : 'none' }}>
        {/* Loading 组件由父组件传递或全局引入 */}
        <div className="orderbook-loading">Loading...</div>
      </div>
      <div className="orderbook orderbook-flex" style={{ opacity: loading ? 0.5 : 1 }}>
        <div className="orderbook-side orderbook-asks">
          <h3>卖单 (Asks)</h3>
          <div className="orderbook-table-wrapper">
            <table>
              <thead>
                <tr><th>价格</th><th>数量</th><th>金额</th></tr>
              </thead>
              <tbody>
                {asks.map(([p, qty], i) => {
                  const amount = calcAmount(p, qty);
                  return (
                    <tr key={i}>
                      <td className="ask-price">{formatPrice(p)}</td>
                      <td>{qty}</td>
                      <td>{formatAmount(amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="orderbook-side orderbook-bids">
          <h3>买单 (Bids)</h3>
          <div className="orderbook-table-wrapper">
            <table>
              <thead>
                <tr><th>价格</th><th>数量</th><th>金额</th></tr>
              </thead>
              <tbody>
                {bids.map(([p, qty], i) => {
                  const amount = calcAmount(p, qty);
                  return (
                    <tr key={i}>
                      <td className="bid-price">{formatPrice(p)}</td>
                      <td>{qty}</td>
                      <td>{formatAmount(amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook; 