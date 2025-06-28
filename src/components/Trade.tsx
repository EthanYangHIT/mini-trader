/* eslint-disable react/prop-types */
import './Trade.css';
import { useAvgCostWorker } from '../hooks/useAvgCostWorker';
import type { TradeHistory } from '../types/trade';
import { toast } from 'react-hot-toast';
import { Form, Input, Button, Table, Typography, Space } from 'antd';
import { useTrade } from '../hooks/useTrade';
import type { VirtualOrder, OrderSide } from '../types/trade';
import Decimal from 'decimal.js';

const INITIAL_BALANCE = 100000;
const INITIAL_BALANCE_KEY = 'virtualInitialBalance';

function getInitialBalance(): number {
  const cached = localStorage.getItem(INITIAL_BALANCE_KEY);
  if (cached !== null) return parseFloat(cached);
  localStorage.setItem(INITIAL_BALANCE_KEY, INITIAL_BALANCE.toString());
  return INITIAL_BALANCE;
}
function getBalance(tradeHistory: TradeHistory[]): number {
  let balance = new Decimal(getInitialBalance());
  for (const t of tradeHistory) {
    if (t.side === 'buy') {
      balance = balance.minus(new Decimal(t.amount).times(t.price));
    } else if (t.side === 'sell') {
      balance = balance.plus(new Decimal(t.amount).times(t.price));
    }
  }
  localStorage.setItem('virtualBalance', balance.toFixed(8));
  return Number(balance.toFixed(8));
}

interface TradeProps {
  pair: string;
  price: string;
}

const { Title } = Typography;

const Trade: React.FC<TradeProps> = ({ pair, price }) => {
  const { orders, tradeHistory, placeOrder, cancelOrder } = useTrade(pair, price);
  const currentPosition = useAvgCostWorker(tradeHistory, pair);
  const balance = getBalance(tradeHistory);
  const currentFloatPL =
    currentPosition.amount && price
      ? new Decimal(price).minus(currentPosition.avgPrice).times(currentPosition.amount).toNumber()
      : 0;

  // antd form
  const [form] = Form.useForm();

  // 下单逻辑
  function placeOrderAntd(values: { side: OrderSide; price: string; amount: string }) {
    const priceNum = new Decimal(values.price);
    const amount = new Decimal(values.amount);
    if (priceNum.isNaN() || amount.isNaN() || priceNum.lte(0) || amount.lte(0)) return;
    if (values.side === 'sell' && amount.gt(currentPosition.amount)) {
      toast.error('卖出数量不能大于当前最大持仓数量');
      return;
    }
    if (values.side === 'buy' && priceNum.times(amount).gt(balance)) {
      toast.error('余额不足');
      return;
    }
    placeOrder({
      side: values.side,
      price: priceNum.toNumber(),
      amount: amount.toNumber(),
      symbol: pair,
    });
    form.resetFields();
  }

  // 价格输入框聚焦时自动更新为实时价格
  function handlePriceFocus() {
    if (price) {
      form.setFieldsValue({ price });
    }
  }

  // antd table columns
  const orderColumns = [
    {
      title: '方向',
      dataIndex: 'side',
      key: 'side',
      render: (v: string) => (
        <span style={{ color: v === 'buy' ? '#52c41a' : '#f5222d', fontWeight: 500 }}>
          {v === 'buy' ? '买' : '卖'}
        </span>
      ),
    },
    { title: '数量', dataIndex: 'amount', key: 'amount' },
    { title: '价格', dataIndex: 'price', key: 'price' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: VirtualOrder) => (
        <Button size="small" danger onClick={() => cancelOrder(record.id)}>
          撤销
        </Button>
      ),
    },
  ];
  const historyColumns = [
    {
      title: '方向',
      dataIndex: 'side',
      key: 'side',
      render: (v: string) => (
        <span style={{ color: v === 'buy' ? '#52c41a' : '#f5222d', fontWeight: 500 }}>
          {v === 'buy' ? '买' : '卖'}
        </span>
      ),
    },
    { title: '数量', dataIndex: 'amount', key: 'amount' },
    { title: '价格', dataIndex: 'price', key: 'price' },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (t: number) => new Date(t).toLocaleString(),
    },
  ];

  return (
    <section className="trade-layout">
      <div className="trade-left">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ side: 'buy', price: price || '', amount: '' }}
          onFinish={placeOrderAntd}
        >
          <Form.Item name="side" rules={[{ required: true }]}>
            <Space.Compact style={{ width: '100%' }}>
              <Button
                style={{ width: '50%' }}
                type={form.getFieldValue('side') === 'buy' ? 'primary' : 'default'}
                onClick={() => form.setFieldsValue({ side: 'buy' })}
                data-testid="trade-buy-btn"
              >
                买入
              </Button>
              <Button
                style={{ width: '50%' }}
                type={form.getFieldValue('side') === 'sell' ? 'primary' : 'default'}
                onClick={() => form.setFieldsValue({ side: 'sell' })}
                data-testid="trade-sell-btn"
              >
                卖出
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="price" rules={[{ required: true }]}>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="价格"
              onFocus={handlePriceFocus}
              data-testid="trade-price-input"
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item
              name="amount"
              rules={[{ required: true }]}
              style={{ flex: 2, marginBottom: 0 }}
            >
              <Input
                type="number"
                min="0"
                step="0.0001"
                placeholder="数量"
                data-testid="trade-amount-input"
              />
            </Form.Item>
            <Form.Item style={{ flex: 1, marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block data-testid="trade-submit-btn">
                下单
              </Button>
            </Form.Item>
          </div>
        </Form>
        <Title level={5} style={{ marginTop: 24 }} id="orders-heading">
          挂单
        </Title>
        <Table
          size="small"
          columns={orderColumns}
          dataSource={orders.filter((o) => o.status === 'open' && o.symbol === pair)}
          rowKey="id"
          pagination={false}
          aria-label="挂单列表"
          aria-describedby="orders-heading"
          components={{
            body: {
              row: (props) => {
                // 取 side 字段，买单为 'buy'，卖单为 'sell'
                const sideCell = props['data-row-key']
                  ? orders.find((o) => o.id === props['data-row-key'])?.side
                  : undefined;
                const testid =
                  sideCell === 'buy'
                    ? 'order-row-buy'
                    : sideCell === 'sell'
                      ? 'order-row-sell'
                      : undefined;
                const order = orders.find((o) => o.id === props['data-row-key']);
                const ariaLabel = order
                  ? `${order.side === 'buy' ? '买单' : '卖单'}，价格 ${order.price}，数量 ${order.amount}`
                  : '';
                return <tr {...props} data-testid={testid} aria-label={ariaLabel} />;
              },
            },
          }}
        />
      </div>
      <div className="trade-right">
        <Title level={5}>持仓</Title>
        <div className="position-info">
          <span className="position-label">数量：</span>
          <span className="position-value">{new Decimal(currentPosition.amount).toFixed(8)}</span>
          <span className="position-label" style={{ marginLeft: 16 }}>
            平均成本价：
          </span>
          <span className="position-value">
            {currentPosition.avgPrice ? new Decimal(currentPosition.avgPrice).toFixed(2) : '--'}
          </span>
        </div>
        <div className="position-info" style={{ marginTop: 8 }}>
          <span className="position-label">当前资金：</span>
          <span className="position-value">{balance.toFixed(2)} USDT</span>
          <span className="position-label" style={{ marginLeft: 16 }}>
            持仓浮动盈亏：
          </span>
          <span className={currentFloatPL > 0 ? 'pl-profit' : currentFloatPL < 0 ? 'pl-loss' : ''}>
            {new Decimal(currentFloatPL).toFixed(2)} USDT
          </span>
        </div>
        <Title level={5} style={{ marginTop: 24 }} id="history-heading">
          成交历史
        </Title>
        <Table
          size="small"
          columns={historyColumns}
          dataSource={tradeHistory.filter((h) => h.symbol === pair)}
          rowKey="id"
          pagination={false}
          aria-label="成交历史列表"
          aria-describedby="history-heading"
        />
      </div>
    </section>
  );
};

export default Trade;
