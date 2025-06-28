import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time, LineData } from 'lightweight-charts';
import { Select, Switch } from 'antd';
import type { BinanceSpotAdapter } from '../adapters/ExchangeAdapter';
import './Chart.css';

interface ChartProps {
  price: string;
  priceTimestamp?: number;
  volume: string;
  bgColor: string;
  pair: string;
  adapter: BinanceSpotAdapter | null;
}

const TIME_INTERVALS = [
  { label: '1分钟', value: '1m' },
  { label: '5分钟', value: '5m' },
  { label: '15分钟', value: '15m' },
  { label: '1小时', value: '1h' },
  { label: '4小时', value: '4h' },
  { label: '1天', value: '1d' },
];

// VWAP 计算函数
const calculateVWAP = (candles: (CandlestickData & { volume?: number })[]): LineData[] => {
  if (candles.length === 0) return [];

  const vwapData: LineData[] = [];
  let cumulativeTPV = 0; // Total Price * Volume
  let cumulativeVolume = 0;

  candles.forEach((candle) => {
    // 使用典型价格 (High + Low + Close) / 3
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    // 使用真实成交量，如果没有则使用默认值
    const volume = candle.volume || 1;

    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;

    const vwap = cumulativeTPV / cumulativeVolume;

    vwapData.push({
      time: candle.time,
      value: vwap,
    });
  });

  return vwapData;
};

const Chart: React.FC<ChartProps> = ({ price, priceTimestamp, bgColor, pair, adapter }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [timeInterval, setTimeInterval] = useState<string>('1h');
  const [loading, setLoading] = useState(false);
  const [candles, setCandles] = useState<(CandlestickData & { volume?: number })[]>([]);
  const [showVWAP, setShowVWAP] = useState<boolean>(true);
  const currentRequestRef = useRef<{ pair: string; interval: string } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 创建图表
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { color: bgColor },
        textColor: bgColor === '#181a20' ? '#ffffff' : '#000000',
      },
      grid: {
        vertLines: { color: bgColor === '#181a20' ? '#2a2e39' : '#e1e3e6' },
        horzLines: { color: bgColor === '#181a20' ? '#2a2e39' : '#e1e3e6' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: bgColor === '#181a20' ? '#2a2e39' : '#e1e3e6',
      },
      timeScale: {
        borderColor: bgColor === '#181a20' ? '#2a2e39' : '#e1e3e6',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // 创建K线图
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // 创建VWAP线
    const vwapSeries = chart.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 2,
      lineType: 1, // 虚线
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    vwapSeriesRef.current = vwapSeries;

    // 清理函数
    return () => {
      chart.remove();
    };
  }, [bgColor]); // 移除 candles 和 showVWAP 依赖

  // 加载历史K线数据
  useEffect(() => {
    if (!adapter || !candlestickSeriesRef.current) return;

    // 标记当前请求
    const requestId = { pair, interval: timeInterval };
    currentRequestRef.current = requestId;

    (async () => {
      setLoading(true);

      try {
        const klineData = await adapter.getKlineData(timeInterval, 100);

        // 检查请求是否仍然有效
        if (currentRequestRef.current !== requestId) {
          console.log('Request outdated, discarding result');
          return;
        }

        const candlestickData: (CandlestickData & { volume?: number })[] = klineData.map(
          (kline) => ({
            time: Math.floor(kline.openTime / 1000) as Time,
            open: parseFloat(kline.open),
            high: parseFloat(kline.high),
            low: parseFloat(kline.low),
            close: parseFloat(kline.close),
            volume: parseFloat(kline.volume),
          }),
        );

        // 再次检查请求是否仍然有效
        if (currentRequestRef.current !== requestId) {
          console.log('Request outdated after processing, discarding result');
          return;
        }

        // 清除旧数据并设置新数据
        if (candlestickSeriesRef.current) {
          candlestickSeriesRef.current.setData([]);
        }
        if (vwapSeriesRef.current) {
          vwapSeriesRef.current.setData([]);
        }

        // 设置新数据
        setCandles(candlestickData);

        // 确保图表组件仍然存在
        if (candlestickSeriesRef.current && currentRequestRef.current === requestId) {
          candlestickSeriesRef.current.setData(candlestickData);

          // 计算并设置VWAP
          if (showVWAP && vwapSeriesRef.current) {
            const vwapData = calculateVWAP(candlestickData);
            vwapSeriesRef.current.setData(vwapData);
          }
        }
      } catch (error) {
        console.error('Failed to load historical data:', error);
      } finally {
        // 只有当前请求仍然有效时才更新 loading 状态
        if (currentRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    })();
  }, [adapter, pair, timeInterval, showVWAP, bgColor]);

  // 当 VWAP 开关状态改变时，重新计算和渲染 VWAP
  useEffect(() => {
    if (!vwapSeriesRef.current || candles.length === 0) return;

    if (showVWAP) {
      // 显示 VWAP：重新计算并设置数据
      const vwapData = calculateVWAP(candles);
      vwapSeriesRef.current.setData(vwapData);
    } else {
      // 隐藏 VWAP：清空数据
      vwapSeriesRef.current.setData([]);
    }
  }, [showVWAP, candles]);

  // 实时价格更新
  useEffect(() => {
    if (!candlestickSeriesRef.current || !price) return;
    if (candles.length === 0) return;
    const last = candles[candles.length - 1];
    const priceValue = parseFloat(price);
    if (!isNaN(priceValue) && candlestickSeriesRef.current) {
      candlestickSeriesRef.current.update({
        time: last.time,
        open: last.open,
        high: Math.max(last.high, priceValue),
        low: Math.min(last.low, priceValue),
        close: priceValue,
      });

      // 更新VWAP
      if (showVWAP && vwapSeriesRef.current) {
        const updatedCandles = [...candles];
        updatedCandles[updatedCandles.length - 1] = {
          ...last,
          high: Math.max(last.high, priceValue),
          low: Math.min(last.low, priceValue),
          close: priceValue,
        };
        const vwapData = calculateVWAP(updatedCandles);
        const lastVWAP = vwapData[vwapData.length - 1];
        if (lastVWAP) {
          vwapSeriesRef.current.update(lastVWAP);
        }
      }
    }
  }, [price, priceTimestamp, candles, showVWAP]);

  // 响应式调整
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-info">
          <div className="price">
            Price: <span>{price || '--'}</span>
          </div>
        </div>
        <div className="chart-controls">
          <div className="vwap-toggle">
            <span>VWAP:</span>
            <Switch
              checked={showVWAP}
              onChange={setShowVWAP}
              size="small"
              style={{ marginLeft: 8 }}
            />
          </div>
          <Select
            value={timeInterval}
            onChange={setTimeInterval}
            style={{ width: 100, marginLeft: 8 }}
            options={TIME_INTERVALS}
            loading={loading}
          />
        </div>
      </div>
      <div ref={chartContainerRef} className="chart-widget" />
    </div>
  );
};

export default Chart;
