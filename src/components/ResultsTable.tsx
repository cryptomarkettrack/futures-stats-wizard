import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TimeSlotData {
  avgReturn: number;
  positivePercent: number;
}

interface SymbolData {
  symbol: string;
  timeSlots: { [key: string]: TimeSlotData };
}

interface ResultsTableProps {
  data: SymbolData[];
  timeframe: string;
  timeSlots: string[];
}

const getColorClass = (value: number) => {
  if (value > 0) {
    const intensity = Math.min(Math.abs(value) * 100, 100);
    if (intensity > 20) return "bg-positive/20 text-positive";
    return "bg-positive/10 text-positive/80";
  } else if (value < 0) {
    const intensity = Math.min(Math.abs(value) * 100, 100);
    if (intensity > 20) return "bg-negative/20 text-negative";
    return "bg-negative/10 text-negative/80";
  }
  return "bg-muted/50 text-neutral";
};

export const ResultsTable = ({ data, timeframe, timeSlots }: ResultsTableProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No data available. Click "Calculate All" to fetch analytics.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Time Analytics - Futures - {timeframe} Returns ({data.length} pairs)
        </h3>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="sticky left-0 z-20 bg-card font-semibold text-foreground border-r border-border min-w-[150px]">
                SYMBOL
              </TableHead>
              {timeSlots.map((slot) => (
                <TableHead key={slot} className="text-center font-semibold text-foreground min-w-[100px]">
                  {slot}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.symbol} className="border-border hover:bg-secondary/30">
                <TableCell className="sticky left-0 z-10 bg-card font-medium text-foreground border-r border-border">
                  {item.symbol}
                </TableCell>
                {timeSlots.map((slot) => {
                  const slotData = item.timeSlots[slot];
                  if (!slotData) {
                    return (
                      <TableCell key={slot} className="text-center bg-muted/20 p-2">
                        <div className="text-xs text-muted-foreground">-</div>
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell
                      key={slot}
                      className={`text-center p-2 transition-colors ${getColorClass(slotData.avgReturn)}`}
                    >
                      <div className="font-semibold text-sm">
                        {(slotData.avgReturn * 100).toFixed(3)}%
                      </div>
                      <div className="text-xs opacity-80">
                        {slotData.positivePercent.toFixed(1)}%
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </ScrollArea>
    </div>
  );
};

const TrendingUp = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
