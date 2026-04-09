'use client';

import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { TradeDataProvider } from '@/contexts/TradeDataContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { AddTradeDialog } from '@/components/dashboard/AddTradeDialog';

function AppLayoutContent({ children }: { children: ReactNode }) {
  const { isArabic } = useLanguage();
  return (
    <SidebarProvider defaultOpen={true} dir={isArabic ? 'rtl' : 'ltr'}>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-h-screen">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <AddTradeDialog />
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthWrapper>
        <TradeDataProvider>
           <AppLayoutContent>{children}</AppLayoutContent>
        </TradeDataProvider>
      </AuthWrapper>
    </LanguageProvider>
  );
}
