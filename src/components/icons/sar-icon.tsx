import React from 'react';
import { cn } from '@/lib/utils';

interface SarIconProps extends React.SVGProps<SVGSVGElement> {}

export const SarIcon: React.FC<SarIconProps> = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 12 12" // Adjusted viewBox for better sizing
    fill="currentColor"
    className={cn('w-4 h-4', className)} // Default size, customizable via className
    {...props}
  >
    {/* Simplified path based on the visual appearance */}
    <path d="M4.5 0 L 4.5 5 L 0 5 L 2 8 L 2 12 L 3.5 12 L 3.5 8 L 7.5 8 L 7.5 12 L 9 12 L 9 8 L 11 5 L 6.5 5 L 6.5 0 L 4.5 0 Z M 3 6 L 8 6 L 9.5 4 L 7.5 4 L 7.5 1 L 3.5 1 L 3.5 4 L 1.5 4 L 3 6 Z" />
  </svg>
);
