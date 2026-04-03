// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { BadyTradesLogo } from '@/components/icons/badytrades-logo';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ArrowRight } from 'lucide-react';

const EXTERNAL_LANDING_PAGE = 'https://similar-list-469638.framer.app/';
const APP_ROOT_ROUTE = '/dashboard';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showIframe, setShowIframe] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push(APP_ROOT_ROUTE);
      } else {
        setShowIframe(true);
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <BadyTradesLogo className="h-12 w-auto animate-pulse" />
      </div>
    );
  }

  if (showIframe) {
    return (
      <div className="relative w-full h-screen overflow-hidden bg-black">
        {/* The Landing Page Iframe */}
        <iframe
          src={EXTERNAL_LANDING_PAGE}
          className="w-full h-full border-none shadow-2xl"
          title="BadyTrades Landing Page"
        />

        {/* Floating "Bridge" UI to Local App (REMOVED) */}
        {/* Floating Dashboard Shortcut (REMOVED) */}
      </div>
    );
  }

  return null;
}
