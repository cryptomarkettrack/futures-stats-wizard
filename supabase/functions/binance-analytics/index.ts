import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action?: string;
  daysBack?: number;
  timeframe: string;
  metric?: string;
  exchange: string;
  specificPair?: string;
  maxDaysBack?: number;
}

interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Crypto analytics function invoked');
    const requestBody: RequestBody = await req.json();
    const { action, daysBack, timeframe, metric, exchange: exchangeName, specificPair, maxDaysBack } = requestBody;
    
    console.log('Request params:', requestBody);

    // Handle backtest action
    if (action === 'backtest') {
      return await handleBacktest(exchangeName, timeframe, maxDaysBack!, specificPair);
    }

    // Import ccxt dynamically
    const ccxt = await import('https://esm.sh/ccxt@4.2.25');
    
    if (!daysBack) {
      throw new Error('daysBack parameter is required');
    }
    
    // Initialize the selected exchange
    let exchange;
    switch (exchangeName) {
      case 'binance':
        exchange = new ccxt.binance({ enableRateLimit: true });
        break;
      case 'coinbase':
        exchange = new ccxt.coinbase({ enableRateLimit: true });
        break;
      case 'kraken':
        exchange = new ccxt.kraken({ enableRateLimit: true });
        break;
      case 'bybit':
        exchange = new ccxt.bybit({ enableRateLimit: true });
        break;
      case 'okx':
        exchange = new ccxt.okx({ enableRateLimit: true });
        break;
      default:
        exchange = new ccxt.binance({ enableRateLimit: true });
    }

    // Fetch all USDT futures symbols
    console.log('Loading markets...');
    await exchange.loadMarkets();
    const markets = exchange.markets;
    
    let futuresSymbols: string[];
    if (specificPair) {
      // If specific pair is provided, only analyze that pair
      if (markets[specificPair]) {
        futuresSymbols = [specificPair];
        console.log(`Analyzing specific pair: ${specificPair}`);
      } else {
        throw new Error(`Pair ${specificPair} not found on ${exchangeName}`);
      }
    } else {
      // Otherwise, get all USDT futures symbols
      futuresSymbols = Object.keys(markets).filter(
        symbol => markets[symbol].type === 'swap' && symbol.endsWith('/USDT:USDT')
      );
      console.log(`Found ${futuresSymbols.length} futures symbols`);
    }

    // Calculate time range
    const endTime = Date.now();
    const startTime = endTime - (daysBack * 24 * 60 * 60 * 1000);

    // Map timeframe to CCXT format
    const timeframeMap: { [key: string]: string } = {
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
    };
    const ccxtTimeframe = timeframeMap[timeframe] || '1h';

    // Calculate timeframe duration in ms
    const timeframeDurations: { [key: string]: number } = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    const timeframeDuration = timeframeDurations[timeframe];

    // Generate time slots based on timeframe
    const generateTimeSlots = (tf: string): string[] => {
      if (tf === '1h') {
        return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
      } else if (tf === '4h') {
        return ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      } else if (tf === '1d') {
        return ['Daily'];
      } else if (tf === '15m') {
        return Array.from({ length: 96 }, (_, i) => {
          const hour = Math.floor(i / 4);
          const minute = (i % 4) * 15;
          return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        });
      }
      return [];
    };

    const timeSlots = generateTimeSlots(timeframe);
    console.log(`Generated ${timeSlots.length} time slots`);

    // Process symbols (limit to first 50 for demo to avoid rate limits, unless specific pair is requested)
    const symbolsToProcess = specificPair ? futuresSymbols : futuresSymbols.slice(0, 50);
    const results = [];

    for (const symbol of symbolsToProcess) {
      try {
        console.log(`Processing ${symbol}...`);
        
        // Fetch OHLCV data
        const ohlcv = await exchange.fetchOHLCV(
          symbol,
          ccxtTimeframe,
          startTime,
          undefined,
          { limit: 1000 }
        );

        if (!ohlcv || ohlcv.length === 0) {
          console.log(`No data for ${symbol}, skipping`);
          continue;
        }

        // Convert to typed data
        const candles: OHLCVData[] = ohlcv.map(candle => ({
          timestamp: Number(candle[0]),
          open: Number(candle[1]),
          high: Number(candle[2]),
          low: Number(candle[3]),
          close: Number(candle[4]),
          volume: Number(candle[5]),
        }));

        // Group by time slot and calculate metrics
        const slotData: { [key: string]: { returns: number[]; volumes: number[] } } = {};
        
        for (const slot of timeSlots) {
          slotData[slot] = { returns: [], volumes: [] };
        }

        for (const candle of candles) {
          const date = new Date(candle.timestamp);
          let slotKey: string;

          if (timeframe === '1h') {
            slotKey = `${date.getUTCHours().toString().padStart(2, '0')}:00`;
          } else if (timeframe === '4h') {
            const hour = Math.floor(date.getUTCHours() / 4) * 4;
            slotKey = `${hour.toString().padStart(2, '0')}:00`;
          } else if (timeframe === '1d') {
            slotKey = 'Daily';
          } else if (timeframe === '15m') {
            const hour = date.getUTCHours();
            const minute = Math.floor(date.getUTCMinutes() / 15) * 15;
            slotKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          } else {
            continue;
          }

          if (slotData[slotKey]) {
            // Calculate log return
            if (candle.open > 0 && candle.close > 0) {
              const logReturn = Math.log(candle.close / candle.open);
              slotData[slotKey].returns.push(logReturn);
              slotData[slotKey].volumes.push(candle.volume * candle.close);
            }
          }
        }

        // Calculate average returns and positive percentage for each slot
        const timeSlotResults: { [key: string]: { avgReturn: number; positivePercent: number } } = {};
        
        for (const slot of timeSlots) {
          const returns = slotData[slot].returns;
          if (returns.length > 0) {
            const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
            const positiveCount = returns.filter(r => r > 0).length;
            const positivePercent = (positiveCount / returns.length) * 100;
            
            timeSlotResults[slot] = {
              avgReturn,
              positivePercent,
            };
          }
        }

        results.push({
          symbol: symbol.replace('/USDT:USDT', 'USDT'),
          timeSlots: timeSlotResults,
        });

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        continue;
      }
    }

    console.log(`Successfully processed ${results.length} symbols on ${exchangeName}`);

    return new Response(
      JSON.stringify({ results, timeSlots }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in crypto-analytics function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Backtest handler function
async function handleBacktest(
  exchangeName: string,
  timeframe: string,
  maxDaysBack: number,
  specificPair?: string
) {
  console.log(`Running backtest for ${maxDaysBack} windows`);
  
  const ccxt = await import('https://esm.sh/ccxt@4.2.25');
  
  // Initialize exchange
  let exchange;
  switch (exchangeName) {
    case 'binance':
      exchange = new ccxt.binance({ enableRateLimit: true });
      break;
    case 'coinbase':
      exchange = new ccxt.coinbase({ enableRateLimit: true });
      break;
    case 'kraken':
      exchange = new ccxt.kraken({ enableRateLimit: true });
      break;
    case 'bybit':
      exchange = new ccxt.bybit({ enableRateLimit: true });
      break;
    case 'okx':
      exchange = new ccxt.okx({ enableRateLimit: true });
      break;
    default:
      exchange = new ccxt.binance({ enableRateLimit: true });
  }

  await exchange.loadMarkets();
  const markets = exchange.markets;
  
  // Get symbol to test
  let symbol: string;
  if (specificPair && markets[specificPair]) {
    symbol = specificPair;
  } else {
    // Use first available USDT futures symbol
    const futuresSymbols = Object.keys(markets).filter(
      s => markets[s].type === 'swap' && s.endsWith('/USDT:USDT')
    );
    if (futuresSymbols.length === 0) {
      throw new Error('No USDT futures symbols found');
    }
    symbol = futuresSymbols[0];
  }

  console.log(`Backtesting symbol: ${symbol}`);

  const ccxtTimeframe = timeframe === '15m' ? '15m' : timeframe === '4h' ? '4h' : timeframe === '1d' ? '1d' : '1h';
  
  const backtestResults = [];

  // Test each window from 1 to maxDaysBack
  for (let windowDays = 1; windowDays <= maxDaysBack; windowDays++) {
    console.log(`Testing ${windowDays} days back window...`);
    
    try {
      // Total data needed: windowDays for training + additional days for testing
      const totalDays = windowDays + 30; // Get extra 30 days for testing
      const endTime = Date.now();
      const startTime = endTime - (totalDays * 24 * 60 * 60 * 1000);

      // Fetch data
      const ohlcv = await exchange.fetchOHLCV(
        symbol,
        ccxtTimeframe,
        startTime,
        undefined,
        { limit: 1000 }
      );

      if (!ohlcv || ohlcv.length < windowDays * 24) {
        console.log(`Insufficient data for ${windowDays} days window`);
        continue;
      }

      // Split into training and testing data
      const trainingSize = Math.floor(ohlcv.length * (windowDays / totalDays));
      const trainingData = ohlcv.slice(0, trainingSize);
      const testingData = ohlcv.slice(trainingSize);

      // Analyze training data to find best time slots
      const slotPerformance: { [key: string]: { returns: number[]; avgReturn: number } } = {};
      
      for (const candle of trainingData) {
        const date = new Date(Number(candle[0]));
        let slotKey: string;

        if (timeframe === '1h') {
          slotKey = `${date.getUTCHours().toString().padStart(2, '0')}:00`;
        } else if (timeframe === '4h') {
          const hour = Math.floor(date.getUTCHours() / 4) * 4;
          slotKey = `${hour.toString().padStart(2, '0')}:00`;
        } else if (timeframe === '1d') {
          slotKey = 'Daily';
        } else if (timeframe === '15m') {
          const hour = date.getUTCHours();
          const minute = Math.floor(date.getUTCMinutes() / 15) * 15;
          slotKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        } else {
          continue;
        }

        if (!slotPerformance[slotKey]) {
          slotPerformance[slotKey] = { returns: [], avgReturn: 0 };
        }

        const open = Number(candle[1]);
        const close = Number(candle[4]);
        if (open > 0 && close > 0) {
          const logReturn = Math.log(close / open);
          slotPerformance[slotKey].returns.push(logReturn);
        }
      }

      // Calculate average returns for each slot
      for (const slot in slotPerformance) {
        const returns = slotPerformance[slot].returns;
        if (returns.length > 0) {
          slotPerformance[slot].avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        }
      }

      // Get top 3 best performing slots
      const sortedSlots = Object.entries(slotPerformance)
        .sort(([, a], [, b]) => b.avgReturn - a.avgReturn)
        .slice(0, 3)
        .map(([slot]) => slot);

      console.log(`Top slots for ${windowDays}d: ${sortedSlots.join(', ')}`);

      // Test these slots on testing data
      const trades = [];
      for (const candle of testingData) {
        const date = new Date(Number(candle[0]));
        let slotKey: string;

        if (timeframe === '1h') {
          slotKey = `${date.getUTCHours().toString().padStart(2, '0')}:00`;
        } else if (timeframe === '4h') {
          const hour = Math.floor(date.getUTCHours() / 4) * 4;
          slotKey = `${hour.toString().padStart(2, '0')}:00`;
        } else if (timeframe === '1d') {
          slotKey = 'Daily';
        } else if (timeframe === '15m') {
          const hour = date.getUTCHours();
          const minute = Math.floor(date.getUTCMinutes() / 15) * 15;
          slotKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        } else {
          continue;
        }

        // If this is one of our predicted good slots, record the trade
        if (sortedSlots.includes(slotKey)) {
          const open = Number(candle[1]);
          const close = Number(candle[4]);
          if (open > 0 && close > 0) {
            const logReturn = Math.log(close / open);
            trades.push(logReturn);
          }
        }
      }

      if (trades.length === 0) {
        console.log(`No trades for ${windowDays} days window`);
        continue;
      }

      // Calculate metrics
      const winningTrades = trades.filter(t => t > 0);
      const winRate = (winningTrades.length / trades.length) * 100;
      const avgReturn = trades.reduce((sum, t) => sum + t, 0) / trades.length;
      const bestTrade = Math.max(...trades);
      const worstTrade = Math.min(...trades);
      const totalPnL = trades.reduce((sum, t) => sum + t, 0);

      backtestResults.push({
        daysBack: windowDays,
        winRate,
        avgReturn,
        bestTrade,
        worstTrade,
        totalPnL,
        totalTrades: trades.length,
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error testing ${windowDays} days window:`, error);
      continue;
    }
  }

  console.log(`Backtest complete. Tested ${backtestResults.length} windows`);

  return new Response(
    JSON.stringify({ backtestResults }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}
