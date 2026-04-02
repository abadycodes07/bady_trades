'use client';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Edit } from 'lucide-react'; // Fixed import: Replaced EditLayout with Edit
import { ModeToggle } from './theme-toggle';
import { usePathname } from 'next/navigation';
import { useSidebar } from './ui/sidebar';

export function AppHeader() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  // The Edit Layout button is now only shown on the Dashboard page itself
  // const showEditLayout = pathname === '/';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
      {/* Sidebar trigger is handled globally in AppSidebar for mobile */}
      {/* Desktop sidebar trigger (optional, if you want it in the header too) */}
       {!isMobile && <SidebarTrigger className="hover-effect" />}

      <div className="flex-1">
        {/* Maybe breadcrumbs or page title */}
      </div>
      <div className="flex items-center gap-2">
         {/* {showEditLayout && (
           <Button variant="outline" size="icon" className="hover-effect" >
             <Edit className="h-4 w-4" /> // Fixed usage: Replaced EditLayout with Edit
             <span className="sr-only">Edit Layout</span>
           </Button>
         )} */}
        {!isMobile && <ModeToggle />} {/* Mode toggle for desktop header */}
      </div>
    </header>
  );
}
