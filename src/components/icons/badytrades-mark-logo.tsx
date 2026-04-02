
import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadyTradesMarkLogoProps extends React.SVGProps<SVGSVGElement> {
  // No additional props needed for now
}

export const BadyTradesMarkLogo: React.FC<BadyTradesMarkLogoProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 30 30" // Adjusted viewBox for a more compact icon
    xmlns="http://www.w3.org/2000/svg"
    className={cn('h-6 w-6', className)} // Default size, can be overridden
    {...props}
  >
    <g fill="hsl(120 70% 45%)" stroke="white" strokeWidth="0.75">
      {/* Candlestick 1 (Left) - Medium body, long top wick, short bottom wick */}
      <rect x="4" y="12" width="3" height="10" rx="0.5" />
      <rect x="4.75" y="4" width="1.5" height="8" />
      <rect x="4.75" y="22" width="1.5" height="2" />

      {/* Candlestick 2 - Long body, short top & bottom wicks */}
      <rect x="10" y="6" width="3" height="18" rx="0.5" />
      <rect x="10.75" y="4" width="1.5" height="2" />
      <rect x="10.75" y="24" width="1.5" height="2" />

      {/* Candlestick 3 - Short body, long top wick, medium bottom wick */}
      <rect x="16" y="14" width="3" height="6" rx="0.5" />
      <rect x="16.75" y="4" width="1.5" height="10" />
      <rect x="16.75" y="20" width="1.5" height="4" />

      {/* Candlestick 4 (Right) - Long body (like 2), short top & bottom wicks */}
      <rect x="22" y="6" width="3" height="18" rx="0.5" />
      <rect x="22.75" y="4" width="1.5" height="2" />
      <rect x="22.75" y="24" width="1.5" height="2" />
    </g>
  </svg>
);
