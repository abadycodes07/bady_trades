

import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import AuthWrapper from '@/components/auth/AuthWrapper'; // Import AuthWrapper
import { TradeDataProvider } from '@/contexts/TradeDataContext'; // Import TradeDataProvider

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    // AuthWrapper will handle redirection if user is not logged in
    <AuthWrapper>
      <TradeDataProvider> {/* Wrap with TradeDataProvider */}
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-screen">
            <AppHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </TradeDataProvider> {/* Close TradeDataProvider */}
    </AuthWrapper>
  );
}
