'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard caught error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full border-red-500/20 bg-red-500/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            Dashboard Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">
            A critical error occurred while loading the dashboard components.
          </p>
          <div className="bg-black/80 rounded-md p-4 overflow-x-auto">
            <code className="text-xs text-red-400 font-mono">
              {error.message || "Unknown Application Error"}
            </code>
          </div>
          <p className="text-xs text-muted-foreground">
            Please screenshot this error message to help us debug.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                // Clear local storage potential bad data
                localStorage.removeItem('dashboardLayouts');
                window.location.reload();
              }}
            >
              Clear Cache & Reload
            </Button>
            <Button
              onClick={
                // Attempt to recover by trying to re-render the segment
                () => reset()
              }
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
