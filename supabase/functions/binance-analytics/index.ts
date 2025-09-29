import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  daysBack: number;
  timeframe: string;
  metric: string;
  timezone: string;
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
    console.log('Binance analytics function invoked');
    const { daysBack, timeframe, metric, timezone }: RequestBody = await req.json();
    
    console.log('Request params:', { daysBack, timeframe, metric, timezone });

    // Import ccxt dynamically
    const ccxt = await import('https://esm.sh/ccxt@4.2.25');
    const exchange = new ccxt.binance({ enableRateLimit: true });

    // Fetch all USDT futures symbols
    console.log('Loading markets...');
    await exchange.loadMarkets();
    const markets = exchange.markets;
    const futuresSymbols = Object.keys(markets).filter(
      symbol => markets[symbol].type === 'swap' && symbol.endsWith('/USDT:USDT')
    );

    console.log(`Found ${futuresSymbols.length} futures symbols`);

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

    // Process symbols (limit to first 50 for demo to avoid rate limits)
    const symbolsToProcess = futuresSymbols.slice(0, 50);
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

    console.log(`Successfully processed ${results.length} symbols`);

    return new Response(
      JSON.stringify({ results, timeSlots }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in binance-analytics function:', error);
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
