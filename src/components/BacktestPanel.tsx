import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface BacktestPanelProps {
  maxDaysBack: string;
  setMaxDaysBack: (value: string) => void;
  onRunBacktest: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export const BacktestPanel = ({
  maxDaysBack,
  setMaxDaysBack,
  onRunBacktest,
  isLoading,
  disabled,
}: BacktestPanelProps) => {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Backtest Scanner</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Test the scanner's predictive performance across different historical windows
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxDaysBack" className="text-foreground">Max Days Back</Label>
            <Select value={maxDaysBack} onValueChange={setMaxDaysBack}>
              <SelectTrigger id="maxDaysBack" className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="5">5 Days</SelectItem>
                <SelectItem value="10">10 Days</SelectItem>
                <SelectItem value="20">20 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={onRunBacktest}
              disabled={isLoading || disabled}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? "Running Backtest..." : "Run Backtest"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
