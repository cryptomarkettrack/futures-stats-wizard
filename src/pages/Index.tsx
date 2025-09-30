import { useState } from "react";
import { ConfigurationPanel } from "@/components/ConfigurationPanel";
import { ResultsTable } from "@/components/ResultsTable";
import { BacktestPanel } from "@/components/BacktestPanel";
import { BacktestResults } from "@/components/BacktestResults";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TimeSlotData {
  avgReturn: number;
  positivePercent: number;
}

interface SymbolData {
  symbol: string;
  timeSlots: { [key: string]: TimeSlotData };
}

interface BacktestWindow {
  daysBack: number;
  winRate: number;
  avgReturn: number;
  bestTrade: number;
  worstTrade: number;
  totalPnL: number;
  totalTrades: number;
}

const Index = () => {
  const [daysBack, setDaysBack] = useState("60");
  const [timeframe, setTimeframe] = useState("1h");
  const [metric, setMetric] = useState("returns");
  const [exchange, setExchange] = useState("binance");
  const [specificPair, setSpecificPair] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SymbolData[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [maxDaysBack, setMaxDaysBack] = useState("5");
  const [backtestResults, setBacktestResults] = useState<BacktestWindow[]>([]);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const { toast } = useToast();

  const handleCalculate = async () => {
    setIsLoading(true);
    console.log("Starting calculation with params:", { daysBack, timeframe, metric, exchange, specificPair });

    try {
      const { data, error } = await supabase.functions.invoke("binance-analytics", {
        body: {
          daysBack: parseInt(daysBack),
          timeframe,
          metric,
          exchange,
          specificPair: specificPair.trim() || undefined,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      console.log("Received data:", data);

      if (data && data.results && data.timeSlots) {
        setResults(data.results);
        setTimeSlots(data.timeSlots);
        toast({
          title: "Calculation Complete",
          description: `Analyzed ${data.results.length} trading pairs successfully.`,
        });
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (error: any) {
      console.error("Error calculating analytics:", error);
      toast({
        title: "Calculation Failed",
        description: error.message || "Failed to calculate analytics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBacktest = async () => {
    if (results.length === 0) {
      toast({
        title: "No Data",
        description: "Please run the scanner first before backtesting.",
        variant: "destructive",
      });
      return;
    }

    setIsBacktesting(true);
    console.log("Starting backtest with params:", { maxDaysBack, timeframe, exchange, specificPair });

    try {
      const { data, error } = await supabase.functions.invoke("binance-analytics", {
        body: {
          action: "backtest",
          maxDaysBack: parseInt(maxDaysBack),
          timeframe,
          exchange,
          specificPair: specificPair.trim() || undefined,
        },
      });

      if (error) {
        console.error("Backtest error:", error);
        throw error;
      }

      console.log("Backtest results:", data);

      if (data && data.backtestResults) {
        setBacktestResults(data.backtestResults);
        toast({
          title: "Backtest Complete",
          description: `Tested ${data.backtestResults.length} different windows.`,
        });
      } else {
        throw new Error("Invalid backtest data format received");
      }
    } catch (error: any) {
      console.error("Error running backtest:", error);
      toast({
        title: "Backtest Failed",
        description: error.message || "Failed to run backtest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBacktesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Crypto Futures Analytics Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate mean log returns and volumes for crypto futures symbols across different exchanges and timeframes
          </p>
        </header>

        <ConfigurationPanel
          daysBack={daysBack}
          setDaysBack={setDaysBack}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          metric={metric}
          setMetric={setMetric}
          exchange={exchange}
          setExchange={setExchange}
          specificPair={specificPair}
          setSpecificPair={setSpecificPair}
          onCalculate={handleCalculate}
          isLoading={isLoading}
        />

        <ResultsTable data={results} timeframe={timeframe} timeSlots={timeSlots} />

        <BacktestPanel
          maxDaysBack={maxDaysBack}
          setMaxDaysBack={setMaxDaysBack}
          onRunBacktest={handleBacktest}
          isLoading={isBacktesting}
          disabled={results.length === 0}
        />

        <BacktestResults results={backtestResults} />
      </div>
    </div>
  );
};

export default Index;
