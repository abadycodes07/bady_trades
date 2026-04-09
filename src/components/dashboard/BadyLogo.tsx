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
            <div className="relative flex items-center justify-center font-black tracking-tighter italic" style={{ fontSize: iconSize, height: iconSize }}>
                <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">ICT</span>
                <div className="absolute -inset-1 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
            </div>
            {showText && (
                <span className="font-black tracking-[0.2em] text-foreground uppercase" style={{ fontSize: iconSize * 0.7 }}>
                    Trading
                </span>
            )}
        </div>
    );
}
