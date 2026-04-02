
'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { BadyTradesLogo } from '@/components/icons/badytrades-logo';

const AUTH_ROUTES = ['/login', '/signup'];
const APP_ROOT_ROUTE = '/dashboard';
const EXTERNAL_LANDING_PAGE = 'https://similar-list-469638.framer.app/';

export default function AuthWrapper({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const isAuthRoute = AUTH_ROUTES.includes(pathname);
      const isAppRoot = pathname === '/';

      if (user) {
        // User is logged in.
        // If they are on an auth page or the marketing root, redirect to dashboard.
        if (isAuthRoute || isAppRoot) {
          router.push(APP_ROOT_ROUTE);
        }
        // Otherwise, they are on a protected app page and are allowed.
        return;
      }

      if (!user) {
        // User is not logged in.
        // Allow access only to auth routes.
        // Redirect all other requests to the external landing page.
        if (!isAuthRoute) {
          window.location.href = EXTERNAL_LANDING_PAGE;
        }
      }
    }
  }, [user, loading, router, pathname]);

  // While loading auth state, show a loader.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <BadyTradesLogo className="h-12 w-auto animate-pulse" />
      </div>
    );
  }

  // If authenticated and on an app page, or if on an auth route, render children.
  // The useEffect handles redirecting away from these pages if state is incorrect.
  if (user || AUTH_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // Fallback loader for the brief moment before redirection for unauthorized users.
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <BadyTradesLogo className="h-12 w-auto animate-pulse" />
    </div>
  );
}
