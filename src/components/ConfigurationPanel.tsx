import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";

interface ConfigurationPanelProps {
  daysBack: string;
  setDaysBack: (value: string) => void;
  timeframe: string;
  setTimeframe: (value: string) => void;
  metric: string;
  setMetric: (value: string) => void;
  timezone: string;
  setTimezone: (value: string) => void;
  onCalculate: () => void;
  isLoading: boolean;
}

export const ConfigurationPanel = ({
  daysBack,
  setDaysBack,
  timeframe,
  setTimeframe,
  metric,
  setMetric,
  timezone,
  setTimezone,
  onCalculate,
  isLoading,
}: ConfigurationPanelProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
          <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">Configuration</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="daysBack" className="text-muted-foreground text-sm">
            Days Back:
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="daysBack"
              type="number"
              value={daysBack}
              onChange={(e) => setDaysBack(e.target.value)}
              className="bg-secondary border-border text-foreground"
              min="1"
              max="365"
            />
            <span className="text-muted-foreground text-sm whitespace-nowrap">days</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeframe" className="text-muted-foreground text-sm">
            Timeframe:
          </Label>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger id="timeframe" className="bg-secondary border-border text-foreground">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="4h">4 Hours</SelectItem>
              <SelectItem value="1d">1 Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="metric" className="text-muted-foreground text-sm">
            Metric:
          </Label>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger id="metric" className="bg-secondary border-border text-foreground">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="returns">Returns + Positive %</SelectItem>
              <SelectItem value="volume">Quote Volume</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone" className="text-muted-foreground text-sm">
            Timezone:
          </Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone" className="bg-secondary border-border text-foreground">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="UTC">UTC (UTC+0)</SelectItem>
              <SelectItem value="Asia/Bangkok">Bangkok (UTC+7)</SelectItem>
              <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
              <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo (UTC+9)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={onCalculate}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-10"
        >
          {isLoading ? (
            <>
              <TrendingUp className="mr-2 h-4 w-4 animate-pulse" />
              Calculating...
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Calculate All
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
