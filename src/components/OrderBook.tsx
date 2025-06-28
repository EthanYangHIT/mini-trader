import React from 'react';

interface OrderBookProps {
  bids: [string, string][];
  asks: [string, string][];
  loading: boolean;
  bgColor: string;
}

// 格式化价格
function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (num >= 1000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (num >= 1) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } else {
    return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  }
}

// 计算金额
function calcAmount(price: string, quantity: string): number {
  return parseFloat(price) * parseFloat(quantity);
}

// 格式化金额
function formatAmount(amount: number): string {
  if (amount >= 1000) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (amount >= 1) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } else {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  }
}

// 计算累计数量用于深度图
function calculateCumulativeQuantity(orders: [string, string][]): Array<{
  price: string;
  quantity: string;
  cumulativeQuantity: number;
  amount: number;
  maxCumulative: number;
}> {
  let cumulative = 0;
  const result = orders.map(([price, quantity]) => {
    const qty = parseFloat(quantity);
    cumulative += qty;
    const amt = calcAmount(price, quantity);
    return {
      price,
      quantity,
      cumulativeQuantity: cumulative,
      amount: amt,
      maxCumulative: 0, // 临时值，稍后更新
    };
  });

  // 计算最大值用于百分比
  const maxCumulative = Math.max(...result.map((item) => item.cumulativeQuantity));
  return result.map((item) => ({ ...item, maxCumulative }));
}

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks, loading, bgColor }) => {
  const asksWithCumulative = calculateCumulativeQuantity(asks);
  const bidsWithCumulative = calculateCumulativeQuantity(bids);

  return (
    <div className="orderbook-wrapper" style={{ position: 'relative', background: bgColor }}>
      <div className="orderbook-mask" style={{ display: loading ? 'flex' : 'none' }}>
        {/* Loading 组件由父组件传递或全局引入 */}
        <div className="orderbook-loading">Loading...</div>
      </div>
      <div className="orderbook orderbook-flex" style={{ opacity: loading ? 0.5 : 1 }}>
        <div className="orderbook-side orderbook-asks">
          <h3 id="asks-heading">卖单 (Asks)</h3>
          <div className="orderbook-table-wrapper">
            <table
              role="table"
              aria-label="卖单列表"
              aria-describedby="asks-heading"
              aria-rowcount={asks.length}
            >
              <thead>
                <tr>
                  <th scope="col" role="columnheader" aria-sort="descending">
                    价格
                  </th>
                  <th scope="col" role="columnheader">
                    数量
                  </th>
                  <th scope="col" role="columnheader">
                    金额
                  </th>
                </tr>
              </thead>
              <tbody>
                {asks.length > 0 ? (
                  asksWithCumulative.map((item, i) => {
                    const depthPercentage = (item.cumulativeQuantity / item.maxCumulative) * 100;
                    return (
                      <tr key={i} role="row" aria-rowindex={i + 1} className="orderbook-row">
                        <td
                          className="ask-price"
                          role="cell"
                          aria-label={`卖单价格 ${formatPrice(item.price)}`}
                        >
                          <div
                            className="depth-bar depth-bar-ask"
                            style={{
                              width: `${depthPercentage}%`,
                            }}
                          ></div>
                          {formatPrice(item.price)}
                        </td>
                        <td role="cell" aria-label={`卖单数量 ${item.quantity}`}>
                          {item.quantity}
                        </td>
                        <td role="cell" aria-label={`卖单金额 ${formatAmount(item.amount)}`}>
                          {formatAmount(item.amount)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr role="row">
                    <td colSpan={3} role="cell" aria-label="暂无卖单数据">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="orderbook-side orderbook-bids">
          <h3 id="bids-heading">买单 (Bids)</h3>
          <div className="orderbook-table-wrapper">
            <table
              role="table"
              aria-label="买单列表"
              aria-describedby="bids-heading"
              aria-rowcount={bids.length}
            >
              <thead>
                <tr>
                  <th scope="col" role="columnheader" aria-sort="descending">
                    价格
                  </th>
                  <th scope="col" role="columnheader">
                    数量
                  </th>
                  <th scope="col" role="columnheader">
                    金额
                  </th>
                </tr>
              </thead>
              <tbody>
                {bids.length > 0 ? (
                  bidsWithCumulative.map((item, i) => {
                    const depthPercentage = (item.cumulativeQuantity / item.maxCumulative) * 100;
                    return (
                      <tr key={i} role="row" aria-rowindex={i + 1} className="orderbook-row">
                        <td
                          className="bid-price"
                          role="cell"
                          aria-label={`买单价格 ${formatPrice(item.price)}`}
                        >
                          <div
                            className="depth-bar depth-bar-bid"
                            style={{
                              width: `${depthPercentage}%`,
                            }}
                          ></div>
                          {formatPrice(item.price)}
                        </td>
                        <td role="cell" aria-label={`买单数量 ${item.quantity}`}>
                          {item.quantity}
                        </td>
                        <td role="cell" aria-label={`买单金额 ${formatAmount(item.amount)}`}>
                          {formatAmount(item.amount)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr role="row">
                    <td colSpan={3} role="cell" aria-label="暂无买单数据">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
