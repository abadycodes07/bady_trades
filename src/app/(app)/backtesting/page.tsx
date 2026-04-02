import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, History, Settings, BarChart } from 'lucide-react';

export default function BacktestingPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Backtesting</h1>
      <p className="text-muted-foreground mb-8">
        Test your trading strategies against historical market data. Access up to a decade of data.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1 h-fit hover-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary"/> Backtest Setup</CardTitle>
            <CardDescription>Define your strategy and parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <Label htmlFor="strategy">Strategy</Label>
                 <Select>
                   <SelectTrigger id="strategy" className="hover-effect">
                     <SelectValue placeholder="Select or create strategy" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="breakout">Breakout Strategy</SelectItem>
                     <SelectItem value="mean-reversion">Mean Reversion</SelectItem>
                     {/* Add option to create new */}
                     <SelectItem value="new" disabled>Create New...</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
            <div>
              <Label htmlFor="asset">Asset</Label>
              <Input id="asset" placeholder="e.g., AAPL, EUR/USD" className="hover-effect"/>
            </div>
             <div>
               <Label htmlFor="timeframe">Timeframe</Label>
                <Select>
                  <SelectTrigger id="timeframe" className="hover-effect">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5m">5 Minute</SelectItem>
                    <SelectItem value="15m">15 Minute</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                     <SelectItem value="4h">4 Hour</SelectItem>
                     <SelectItem value="1d">Daily</SelectItem>
                  </SelectContent>
                </Select>
             </div>
              <div>
               <Label htmlFor="date-range">Date Range</Label>
                {/* Use date range picker component here */}
                <Input id="date-range" placeholder="Select date range" className="hover-effect"/>
             </div>
              <div>
               <Label htmlFor="initial-capital">Initial Capital</Label>
               <Input id="initial-capital" type="number" placeholder="e.g., 10000" className="hover-effect"/>
             </div>
              {/* Add more parameters: Stop Loss, Take Profit, Commission, etc. */}
            <Button className="w-full hover-effect">
              <PlayCircle className="mr-2 h-4 w-4" /> Run Backtest
            </Button>
          </CardContent>
        </Card>

        {/* Results Area */}
        <Card className="lg:col-span-2 flex flex-col hover-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5 text-primary"/> Backtest Results</CardTitle>
             <CardDescription>Results for [Strategy] on [Asset]</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center bg-muted/30 rounded-b-lg p-6">
            {/* Placeholder for Results Summary and Charts */}
            <History className="h-16 w-16 text-muted-foreground mb-4"/>
            <p className="text-muted-foreground text-center">Run a backtest to see the results here.</p>
            {/* Display key metrics: Total P/L, Win Rate, Max Drawdown, Equity Curve Chart, etc. */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
