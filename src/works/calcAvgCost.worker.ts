// eslint-disable-next-line
(self as any).importScripts('https://cdn.jsdelivr.net/npm/decimal.js@10.4.3/decimal.min.js');

self.onmessage = function (e) {
  const { tradeHistory, symbol } = e.data;
  let totalBuy = new self.Decimal(0),
    totalSell = new self.Decimal(0),
    totalCost = new self.Decimal(0);
  for (const t of tradeHistory) {
    if (t.symbol !== symbol) continue;
    if (t.side === 'buy') {
      totalBuy = totalBuy.plus(new self.Decimal(t.amount));
      totalCost = totalCost.plus(new self.Decimal(t.amount).times(t.price));
    } else if (t.side === 'sell') {
      totalSell = totalSell.plus(new self.Decimal(t.amount));
    }
  }
  const position = totalBuy.minus(totalSell);
  const result = {
    amount: position.gt(0) ? position.toNumber() : 0,
    avgPrice: position.gt(0) ? totalCost.div(totalBuy).toNumber() : 0,
  };
  self.postMessage(result);
};
