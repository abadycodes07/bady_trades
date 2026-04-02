import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress'; // Ensure Progress component is imported if used

// Define Currency type locally or import if shared
interface Currency {
    code: string;
    name: string;
    symbol: string | React.ReactNode; // Allow ReactNode for SVG/span symbol
    rate: number;
}

interface GaugeData {
    wins: number;
    losses: number;
    breakeven: number;
}

interface BarData {
    win: number;
    loss: number; // Should be negative
}

interface MetricCardProps {
    title: string;
    value: string | React.ReactNode; // Allow ReactNode for currency values
    metric?: string | React.ReactNode; // Optional secondary metric or label
    iconType?: 'info' | 'progressCircle' | 'gauge' | 'bar';
    progressValue?: number; // For progressCircle
    gaugeData?: GaugeData; // For gauge
    barData?: BarData; // For bar
    color?: 'green' | 'red' | 'neutral'; // Affects main value color
    selectedCurrency?: Currency; // Add selected currency for formatting bar data
    className?: string;
}

// Helper to render the icon/visual element based on iconType
const renderVisual = (
    iconType?: MetricCardProps['iconType'],
    progressValue?: number,
    gaugeData?: GaugeData,
    barData?: BarData
) => {
    switch (iconType) {
        case 'info':
            // Info icon is now rendered directly in the title part
            return null;
        case 'progressCircle': {
            const circumference = 2 * Math.PI * 18; // 2 * pi * radius (radius=18)
            const offset = circumference - ((progressValue ?? 0) / 100) * circumference;
            return (
                 <svg className="h-10 w-10" viewBox="0 0 40 40">
                    <circle
                      className="stroke-current text-muted opacity-20"
                      strokeWidth="4"
                      fill="transparent"
                      r="18"
                      cx="20"
                      cy="20"
                    />
                    <circle
                      className="stroke-current text-green-500" // Use appropriate color
                      strokeWidth="4"
                      fill="transparent"
                      r="18"
                      cx="20"
                      cy="20"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                       strokeLinecap="round"
                       transform="rotate(-90 20 20)" // Start from the top
                     />
                  </svg>
            );
        }
        case 'gauge': {
             const wins = gaugeData?.wins ?? 0;
             const losses = gaugeData?.losses ?? 0;
             const breakeven = gaugeData?.breakeven ?? 0;
             const total = wins + losses + breakeven;

             const winPercent = total > 0 ? (wins / total) : 0;
             const lossPercent = total > 0 ? (losses / total) : 0;
             const breakevenPercent = total > 0 ? (breakeven / total) : 0;

             const radius = 40;
             const circumference = Math.PI * radius;
             const strokeWidth = 10;

             // Start angles for each segment (0 to PI for semicircle)
             const winEndAngle = Math.PI * winPercent;
             const breakevenEndAngle = winEndAngle + Math.PI * breakevenPercent;
             const lossEndAngle = breakevenEndAngle + Math.PI * lossPercent;

             const centerX = 50;
             const centerY = 50;

             // Function to describe an arc
             const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
                const start = {
                    x: x + radius * Math.cos(startAngle + Math.PI), // Add PI to start from left
                    y: y + radius * Math.sin(startAngle + Math.PI),
                };
                const end = {
                    x: x + radius * Math.cos(endAngle + Math.PI), // Add PI to start from left
                    y: y + radius * Math.sin(endAngle + Math.PI),
                };
                 // Ensure angles are slightly different if they are the same to draw the arc
                 if (Math.abs(startAngle - endAngle) < 1e-6) endAngle += 1e-6;
                const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
                const d = [
                    "M", start.x, start.y,
                    "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
                ].join(" ");
                return d;
             };


             return (
                <div className="flex flex-col items-center w-full"> {/* Ensure gauge container takes width */}
                    <div className="relative h-10 w-20"> {/* Container for SVG */}
                         <svg viewBox="0 0 100 50" className="absolute inset-0 h-full w-full overflow-visible">
                             {/* Background Arc */}
                             <path
                                d={describeArc(centerX, centerY, radius, 0, Math.PI)}
                                fill="none"
                                stroke="hsl(var(--muted)/0.3)"
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                             />
                             {/* Win Arc (Green) */}
                             {wins > 0 && (
                                 <path
                                    d={describeArc(centerX, centerY, radius, 0, winEndAngle)}
                                    fill="none"
                                    stroke="hsl(145 63% 42%)" // Use the correct green
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                 />
                             )}
                              {/* Breakeven Arc (Gray) */}
                              {breakeven > 0 && (
                                 <path
                                    d={describeArc(centerX, centerY, radius, winEndAngle, breakevenEndAngle)}
                                    fill="none"
                                    stroke="hsl(220 15% 50%)" // Muted blue/gray
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                 />
                              )}
                             {/* Loss Arc (Red) */}
                             {losses > 0 && (
                                <path
                                    d={describeArc(centerX, centerY, radius, breakevenEndAngle, lossEndAngle)}
                                    fill="none"
                                    stroke="hsl(0 80% 65%)" // Coral/Red
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                />
                             )}
                         </svg>
                    </div>
                    <div className="flex justify-between w-full px-1 mt-0.5 text-xs">
                         <span className="font-bold" style={{ color: 'hsl(145 63% 42%)' }}>{wins}</span>
                         <span className="font-bold" style={{ color: 'hsl(220 15% 50%)' }}>{breakeven}</span>
                         <span className="font-bold" style={{ color: 'hsl(0 80% 65%)' }}>{losses}</span>
                    </div>
                </div>
             );
        }
        case 'bar': {
             const positiveWin = Math.max(0, barData?.win ?? 0);
             const positiveLoss = Math.max(0, Math.abs(barData?.loss ?? 0));
             const totalValue = positiveWin + positiveLoss;

             if (totalValue === 0) {
                 return <div className="w-full h-1 rounded bg-muted"></div>; // Neutral bar if no data
             }

             const winPercent = (positiveWin / totalValue) * 100;
             const lossPercent = 100 - winPercent;

             // Check if lossPercent is extremely small and adjust to prevent visual glitches
             const effectiveLossPercent = lossPercent < 1 && lossPercent > 0 ? 1 : lossPercent;
             const effectiveWinPercent = 100 - effectiveLossPercent;

             return (
                 <div className="flex items-center w-full h-1.5 rounded overflow-hidden"> {/* Increased height slightly */}
                   {/* Green part */}
                    {effectiveWinPercent > 0 && (
                        <div
                            className="h-full bg-green-500 dark:bg-green-600 transition-all duration-300"
                            style={{ width: `${effectiveWinPercent}%` }}
                        />
                    )}
                   {/* Red part */}
                    {effectiveLossPercent > 0 && (
                        <div
                            className="h-full bg-red-500 dark:bg-red-600 transition-all duration-300"
                            style={{ width: `${effectiveLossPercent}%` }}
                        />
                   )}
               </div>
             );
         }
        default:
            return null;
    }
};

// Helper function to format currency values, handling ReactNode symbols
const formatCurrencyValue = (amount: number, currency: Currency): React.ReactNode => {
    const convertedAmount = amount * currency.rate;
    const formattedAmount = Math.abs(convertedAmount).toLocaleString('en-US', {
        maximumFractionDigits: 0, // No decimal places for this display
    });
    // Prefix with '-' only if the original amount was negative, regardless of conversion rate
    const sign = amount < 0 ? '-' : '';
    return (
        <>
            {sign}
             {/* Render span/SVG correctly */}
             {typeof currency.symbol === 'string' ? currency.symbol : currency.symbol}
            {formattedAmount}
        </>
    );
};


export function MetricCard({
    title,
    value,
    metric,
    iconType,
    progressValue,
    gaugeData,
    barData,
    color = 'neutral',
    selectedCurrency,
    className,
}: MetricCardProps) {
    const valueColor =
        color === 'green' ? 'text-green-500' :
        color === 'red' ? 'text-red-500' :
        'text-foreground';

    const visualElement = renderVisual(iconType, progressValue, gaugeData, barData);

    return (
        <Card className={cn(
            "relative overflow-hidden transition-all duration-300 group",
            "bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl",
            "hover:bg-white/10 hover:border-white/20 hover:shadow-primary/20",
            "flex flex-col justify-center items-center text-center p-4 h-full",
            className
        )}>
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-all duration-500" />
            
            <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 flex items-center justify-center gap-1.5 mb-2">
                 {title}
                 {iconType === 'info' && <Info className="h-3 w-3 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />}
            </CardTitle>
            
            <div className={cn("text-2xl font-black tracking-tight mb-2 drop-shadow-sm", valueColor)}>
                {value}
            </div>

            {/* Render visual element if it exists */}
             {visualElement && (
                 <div className={cn(
                     "flex items-center justify-center w-full mt-2 mb-2",
                      iconType === 'bar' ? 'h-2' : '',
                      iconType === 'gauge' ? 'h-14' : ''
                 )}>
                     {visualElement}
                 </div>
             )}

            {/* Render metric */}
             {(metric || (iconType === 'bar' && barData && selectedCurrency)) && (
                  <div className={cn(
                      "text-[10px] font-medium text-muted-foreground/80 mt-2 w-full text-center"
                  )}>
                     {iconType === 'bar' && barData && selectedCurrency ? (
                          <div className="flex justify-between px-2 bg-black/20 py-1 rounded-full border border-white/5">
                             <span className="text-green-400 font-bold">
                                 {formatCurrencyValue(barData.win, selectedCurrency)}
                             </span>
                              <span className="text-red-400 font-bold">
                                  {formatCurrencyValue(barData.loss, selectedCurrency)}
                             </span>
                          </div>
                      ) : (
                         <span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            {metric}
                         </span>
                      )}
                  </div>
             )}
        </Card>
    );
}