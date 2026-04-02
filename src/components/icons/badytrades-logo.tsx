
import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadyTradesLogoProps extends React.SVGProps<SVGSVGElement> {
  // No additional props needed for now
}

export const BadyTradesLogo: React.FC<BadyTradesLogoProps> = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 30" // Adjusted viewBox for better aspect ratio
    className={cn('h-8 w-auto', className)} // Default height, width auto
    {...props}
  >
    {/* Candlestick Icons - Green color */}
    {/* Stick 1 */}
    <rect x="5" y="8" width="4" height="14" fill="hsl(120 70% 45%)" rx="1"/> {/* Darker green for better visibility on light bg */}
    <rect x="6" y="4" width="2" height="22" fill="hsl(120 70% 45%)" />
    {/* Stick 2 */}
    <rect x="13" y="12" width="4" height="10" fill="hsl(120 70% 45%)" rx="1"/>
    <rect x="14" y="6" width="2" height="18" fill="hsl(120 70% 45%)" />
    {/* Stick 3 */}
    <rect x="21" y="8" width="4" height="14" fill="hsl(120 70% 45%)" rx="1"/>
    <rect x="22" y="4" width="2" height="22" fill="hsl(120 70% 45%)" />
     {/* Stick 4 */}
    <rect x="29" y="12" width="4" height="10" fill="hsl(120 70% 45%)" rx="1"/>
    <rect x="30" y="6" width="2" height="18" fill="hsl(120 70% 45%)" />

    {/* Text "BADYTRADES" - Uses foreground color for adaptability */}
    <text
      x="45" // Adjusted position
      y="21" // Vertically centered
      fontFamily="Arial, sans-serif" // Use a common sans-serif font
      fontSize="18" // Adjusted font size
      fontWeight="bold"
      fill="currentColor" // Use currentColor to inherit text color
      className="fill-foreground" // Tailwind class for foreground color (adapts to light/dark)
      letterSpacing="1"
    >
      BADYTRADES
    </text>
  </svg>
);

