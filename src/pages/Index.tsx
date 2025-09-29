import { useState } from "react";
import { ConfigurationPanel } from "@/components/ConfigurationPanel";
import { ResultsTable } from "@/components/ResultsTable";
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

const Index = () => {
  const [daysBack, setDaysBack] = useState("60");
  const [timeframe, setTimeframe] = useState("1h");
  const [metric, setMetric] = useState("returns");
  const [timezone, setTimezone] = useState("UTC");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SymbolData[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const { toast } = useToast();

  const handleCalculate = async () => {
    setIsLoading(true);
    console.log("Starting calculation with params:", { daysBack, timeframe, metric, timezone });

    try {
      const { data, error } = await supabase.functions.invoke("binance-analytics", {
        body: {
          daysBack: parseInt(daysBack),
          timeframe,
          metric,
          timezone,
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Binance Futures Analytics Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate mean log returns and volumes for Binance futures symbols across different timeframes
          </p>
        </header>

        <ConfigurationPanel
          daysBack={daysBack}
          setDaysBack={setDaysBack}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          metric={metric}
          setMetric={setMetric}
          timezone={timezone}
          setTimezone={setTimezone}
          onCalculate={handleCalculate}
          isLoading={isLoading}
        />

        <ResultsTable data={results} timeframe={timeframe} timeSlots={timeSlots} />
      </div>
    </div>
  );
};

export default Index;
