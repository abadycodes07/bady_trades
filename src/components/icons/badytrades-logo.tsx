
import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadyTradesLogoProps extends React.SVGProps<SVGSVGElement> {
  // No additional props needed for now
}

export const BadyTradesLogo: React.FC<BadyTradesLogoProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 160 40"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('h-10 w-auto', className)}
    {...props}
  >
    {/* Stick 1 */}
    <rect x="5" y="10" width="4" height="12" fill="hsl(120 70% 45%)" rx="1"/>
    <rect x="6" y="4" width="2" height="20" fill="hsl(120 70% 45%)" />
    {/* Stick 2 */}
    <rect x="13" y="12" width="4" height="10" fill="hsl(120 70% 45%)" rx="1"/>
    <rect x="14" y="6" width="2" height="18" fill="hsl(120 70% 45%)" />
    {/* Stick 3 */}
    <rect x="21" y="8" width="4" height="14" fill="hsl(120 70% 45%)" rx="1"/>
    <rect x="22" y="4" width="2" height="22" fill="hsl(120 70% 45%)" />
     {/* Stick 4 */}
    <rect x="29" y="12" width="4" height="10" fill="hsl(120 70% 45%)" rx="1"/>
    <rect x="30" y="6" width="2" height="18" fill="hsl(120 70% 45%)" />

    {/* Text "BADYTRADES" */}
    <text
      x="45"
      y="24"
      fontFamily="Inter, sans-serif, sans-serif"
      fontSize="18"
      fontWeight="900"
      fill="white"
      letterSpacing="1.5"
      className="fill-foreground font-black uppercase"
    >
      BADYTRADES
    </text>
  </svg>
);
