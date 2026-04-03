'use client';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ModeToggle } from './theme-toggle';
import { usePathname } from 'next/navigation';
import { useSidebar } from './ui/sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export function AppHeader() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { language, toggleLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
       {!isMobile && <SidebarTrigger className="hover-effect" />}

      <div className="flex-1">
        {/* breadcrumbs or page title */}
      </div>
      <div className="flex items-center gap-2">
        {/* Arabic / English toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="hover-effect h-8 px-2 text-xs font-medium gap-1.5 min-w-[56px]"
          title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
        >
          <Globe className="h-3.5 w-3.5" />
          {language === 'en' ? 'عر' : 'EN'}
        </Button>
        {!isMobile && <ModeToggle />}
      </div>
    </header>
  );
}
