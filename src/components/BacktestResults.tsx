import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BacktestWindow {
  daysBack: number;
  winRate: number;
  avgReturn: number;
  bestTrade: number;
  worstTrade: number;
  totalPnL: number;
  totalTrades: number;
}

interface BacktestResultsProps {
  results: BacktestWindow[];
}

export const BacktestResults = ({ results }: BacktestResultsProps) => {
  if (!results || results.length === 0) {
    return null;
  }

  // Find best performing window
  const bestWindow = results.reduce((best, current) => 
    current.winRate > best.winRate ? current : best
  , results[0]);

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Backtest Results</h3>
          <div className="text-sm text-muted-foreground">
            Best Window: <span className="text-primary font-semibold">{bestWindow.daysBack} Days Back</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground font-semibold">Days Back</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Win Rate</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Avg Return</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Best Trade</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Worst Trade</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Total PnL</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Total Trades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => {
                const isBest = result.daysBack === bestWindow.daysBack;
                return (
                  <TableRow 
                    key={result.daysBack} 
                    className={`border-border ${isBest ? 'bg-primary/10' : 'hover:bg-secondary/30'}`}
                  >
                    <TableCell className="font-medium text-foreground">
                      {result.daysBack} {isBest && '⭐'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={result.winRate >= 50 ? 'text-positive font-semibold' : 'text-negative'}>
                        {result.winRate.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={result.avgReturn >= 0 ? 'text-positive' : 'text-negative'}>
                        {(result.avgReturn * 100).toFixed(3)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-positive">
                      {(result.bestTrade * 100).toFixed(3)}%
                    </TableCell>
                    <TableCell className="text-right text-negative">
                      {(result.worstTrade * 100).toFixed(3)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={result.totalPnL >= 0 ? 'text-positive font-semibold' : 'text-negative font-semibold'}>
                        {(result.totalPnL * 100).toFixed(3)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {result.totalTrades}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};
