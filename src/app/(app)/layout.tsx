'use client';

import type { ReactNode } from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { TradeDataProvider } from '@/contexts/TradeDataContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { AddTradeDialog } from '@/components/dashboard/AddTradeDialog';

function AppLayoutContent({ children }: { children: ReactNode }) {
  const { isArabic } = useLanguage();
  const { open } = useSidebar();

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div
        className="flex flex-col flex-1 min-h-screen transition-all duration-300"
        style={{ marginLeft: open ? '16rem' : '88px' }}
      >
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <AddTradeDialog />
    </div>
  );
}

function AppLayoutWrapper({ children }: { children: ReactNode }) {
  const { isArabic } = useLanguage();
  return (
    <SidebarProvider defaultOpen={true} dir={isArabic ? 'rtl' : 'ltr'}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthWrapper>
        <TradeDataProvider>
           <AppLayoutWrapper>{children}</AppLayoutWrapper>
        </TradeDataProvider>
      </AuthWrapper>
    </LanguageProvider>
  );
}

