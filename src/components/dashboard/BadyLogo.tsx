import React from 'react';
import { cn } from '@/lib/utils';

interface BadyLogoProps {
    className?: string;
    showText?: boolean;
    iconSize?: number;
}

export function BadyLogo({ className, showText = true, iconSize = 24 }: BadyLogoProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="flex items-center gap-0.5" style={{ height: iconSize }}>
                <div className="w-1.5 h-[60%] bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <div className="w-1.5 h-[100%] bg-emerald-400 rounded-sm shadow-[0_0_12px_rgba(16,185,129,0.6)]"></div>
                <div className="w-1.5 h-[40%] bg-white/20 rounded-sm"></div>
                <div className="w-1.5 h-[75%] bg-rose-500 rounded-sm shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
            </div>
            {showText && (
                <span className="font-black tracking-[0.2em] text-white uppercase" style={{ fontSize: iconSize * 0.7 }}>
                    BadyTrades
                </span>
            )}
        </div>
    );
}
