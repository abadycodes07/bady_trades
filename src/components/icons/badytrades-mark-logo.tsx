
import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadyTradesMarkLogoProps extends React.SVGProps<SVGSVGElement> {
  // No additional props needed for now
}

export const BadyTradesMarkLogo: React.FC<BadyTradesMarkLogoProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 40 40"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('h-6 w-6', className)}
    {...props}
  >
    {/* Three green candles representation */}
    <rect x="5" y="10" width="8" height="20" rx="1" fill="#10b981" />
    <rect x="16" y="5" width="8" height="30" rx="1" fill="#10b981" />
    <rect x="27" y="15" width="8" height="20" rx="1" fill="#10b981" />
  </svg>
);
