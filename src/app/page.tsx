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

        {/* Floating "Bridge" UI to Local App */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl pointer-events-auto animate-fade-in-up">
                <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                    <BadyTradesLogo className="h-5 w-auto" />
                    <span className="text-sm font-bold tracking-tight text-white/90">LOCAL PREVIEW</span>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 rounded-full px-4"
                        onClick={() => router.push('/login')}
                    >
                        Login
                    </Button>
                    <Button 
                        size="sm" 
                        className="text-xs font-bold bg-primary hover:bg-primary/80 text-white rounded-full px-6 shadow-lg shadow-primary/20 flex items-center gap-2 group"
                        onClick={() => router.push('/signup')}
                    >
                        Get Started
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </div>

        {/* Floating Dashboard Shortcut */}
        <div className="absolute bottom-10 right-10 z-50 animate-bounce">
             <Button 
                onClick={() => router.push('/dashboard')}
                className="rounded-full h-14 w-14 p-0 bg-primary/20 backdrop-blur-md border border-primary/40 text-primary hover:bg-primary hover:text-white transition-all duration-300 shadow-2xl"
             >
                <LayoutDashboard className="h-6 w-6" />
             </Button>
        </div>
      </div>
    );
  }

  return null;
}
