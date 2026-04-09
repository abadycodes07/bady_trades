
import * as React from 'react';
import { cn } from '@/lib/utils';
import { BadyTradesMarkLogo } from './badytrades-mark-logo';

interface BadyTradesLogoProps extends React.SVGProps<SVGSVGElement> {
  // No additional props needed for now
}

export const BadyTradesLogo: React.FC<BadyTradesLogoProps> = ({ className, ...props }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <BadyTradesMarkLogo className="h-6 w-6" />
    <span className="text-xl font-black tracking-tight text-white uppercase font-sans">
      BADYTRADES
    </span>
  </div>
);
