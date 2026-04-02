// src/app/(app)/tracking/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

export default function TrackingOverviewPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Target className="h-7 w-7" /> Trade Tracking Overview
      </h1>
      <p className="text-muted-foreground mb-8">
        View and analyze individual trade performance in detail. Access specific trades from your Notebook.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Select a Trade</CardTitle>
          <CardDescription>
            To view detailed tracking information, please select a trade from your Notebook.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You can link trades to your notes in the Notebook section and then navigate to the detailed tracking page for each trade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
