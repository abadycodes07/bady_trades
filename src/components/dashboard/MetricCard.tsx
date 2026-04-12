import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

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
    barData?: BarData,
    t?: (s: string) => string
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
                      className="stroke-current text-[var(--win-green)]" // Use appropriate color
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

             const radius = 35;
             const strokeWidth = 8;
             const centerX = 50;
             const centerY = 45;

             const describeArc = (x: number, y: number, r: number, start: number, end: number) => {
                const s = { x: x + r * Math.cos(start + Math.PI), y: y + r * Math.sin(start + Math.PI) };
                const e = { x: x + r * Math.cos(end + Math.PI), y: y + r * Math.sin(end + Math.PI) };
                if (Math.abs(start - end) < 1e-6) end += 1e-6;
                return ["M", s.x, s.y, "A", r, r, 0, (end - start <= Math.PI ? "0" : "1"), 1, e.x, e.y].join(" ");
             };

             const winEnd = Math.PI * winPercent;
             const beEnd = winEnd + Math.PI * breakevenPercent;
             const lossEnd = beEnd + Math.PI * lossPercent;

             return (
                <div className="flex flex-col items-center w-full px-2">
                    <div className="relative h-14 w-full">
                         <svg viewBox="0 0 100 50" className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_0_8px_var(--win-green-glow)]">
                             <path d={describeArc(centerX, centerY, radius, 0, Math.PI)} fill="none" stroke="currentColor" className="text-muted-foreground/10" strokeWidth={strokeWidth} strokeLinecap="round" />
                             {wins > 0 && <path d={describeArc(centerX, centerY, radius, 0, winEnd)} fill="none" stroke="var(--win-green)" strokeWidth={strokeWidth} strokeLinecap="round" />}
                             {breakeven > 0 && <path d={describeArc(centerX, centerY, radius, winEnd, beEnd)} fill="none" stroke="#94a3b8" strokeWidth={strokeWidth} strokeLinecap="round" />}
                             {losses > 0 && <path d={describeArc(centerX, centerY, radius, beEnd, lossEnd)} fill="none" stroke="var(--loss-red)" strokeWidth={strokeWidth} strokeLinecap="round" />}
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                             <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{wins + losses + breakeven} {t ? t('Trades') : 'Trades'}</span>
                         </div>
                    </div>
                    <div className="flex justify-between w-full mt-2 px-1">
                         <div className="flex flex-col items-center">
                             <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">{t ? t('Wins') : 'Wins'}</span>
                             <span className="text-[11px] font-black text-[var(--win-green)]">{wins}</span>
                         </div>
                         <div className="flex flex-col items-center border-l border-r border-border px-4">
                             <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">{t ? t('BE') : 'BE'}</span>
                             <span className="text-[11px] font-black text-foreground/80">{breakeven}</span>
                         </div>
                         <div className="flex flex-col items-center">
                             <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">{t ? t('Losses') : 'Losses'}</span>
                             <span className="text-[11px] font-black text-[var(--loss-red)]">{losses}</span>
                         </div>
                    </div>
                </div>
             );
        }
        case 'bar': {
             const positiveWin = Math.max(0, barData?.win ?? 0);
             const positiveLoss = Math.max(0, Math.abs(barData?.loss ?? 0));
             const totalValue = positiveWin + positiveLoss;

             if (totalValue === 0) return <div className="w-full h-2 rounded-full bg-muted/10"></div>;

             const winPercent = (positiveWin / totalValue) * 100;
             return (
                 <div className="flex flex-col w-full gap-2 px-1">
                    <div className="flex items-center w-full h-2.5 rounded-full overflow-hidden bg-muted/10 border border-border">
                        <div className="h-full bg-gradient-to-r from-[var(--win-green)]/80 to-[var(--win-green)] transition-all duration-700" style={{ width: `${winPercent}%` }} />
                        <div className="h-full bg-gradient-to-r from-[var(--loss-red)]/80 to-[var(--loss-red)] transition-all duration-700" style={{ width: `${100 - winPercent}%` }} />
                    </div>
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
    const { t } = useLanguage();
    const valueColor =
        color === 'green' ? 'text-[var(--win-green)]' :
        color === 'red' ? 'text-[var(--loss-red)]' :
        'text-[var(--foreground)]';

    const visualElement = renderVisual(iconType, progressValue, gaugeData, barData, t);

    return (
        <Card className={cn(
            "relative overflow-hidden transition-all duration-300 group",
            "bg-card border-border shadow-2xl",
            "hover:bg-muted/10 hover:border-border/80 hover:shadow-primary/5",
            color === 'green' && "border-[var(--win-green)]/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]",
            color === 'red' && "border-[var(--loss-red)]/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
            "flex flex-col justify-center items-center text-center p-4 h-full",
            className
        )}>
            {/* Minimal Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/[0.05] blur-3xl rounded-full group-hover:bg-primary/[0.08] transition-all duration-700" />
            <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-white/[0.02] blur-2xl rounded-full group-hover:bg-white/[0.04] transition-all duration-700" />
            
            <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/40 flex items-center justify-center gap-1.5 mb-3">
                 {title}
                 {iconType === 'info' && <Info className="h-3 w-3 opacity-30 hover:opacity-100 transition-opacity cursor-pointer" />}
            </CardTitle>
            
            <div className={cn("text-3xl font-black tracking-tighter mb-1 drop-shadow-md", valueColor)}>
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
                          <div className="flex justify-between px-2 bg-muted/20 py-1 rounded-full border border-border">
                             <span className="text-[var(--win-green)] font-bold">
                                 {formatCurrencyValue(barData.win, selectedCurrency)}
                             </span>
                              <span className="text-[var(--loss-red)] font-bold">
                                  {formatCurrencyValue(barData.loss, selectedCurrency)}
                             </span>
                          </div>
                      ) : (
                         <span className="bg-muted/10 px-2 py-0.5 rounded-full border border-border">
                            {metric}
                         </span>
                      )}
                  </div>
             )}
        </Card>
    );
}