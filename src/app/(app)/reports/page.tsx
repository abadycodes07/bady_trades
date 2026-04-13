'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, LineChart, PieChart } from 'lucide-react'; // Example icons
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReportsPage() {
  const { t, isArabic } = useLanguage();

  return (
    <div className="container mx-auto py-8" dir={isArabic ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-bold mb-6">{t('Reports')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('Analyze your trading performance with over 50 detailed reports.')}
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Example Report Cards - Replace with actual report components */}
        <Card className="hover-effect cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Performance Overview')}</CardTitle>
            <BarChart className={isArabic ? "h-4 w-4 text-muted-foreground" : "h-4 w-4 text-muted-foreground"} />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('Key metrics like P&L, Win Rate, R-Multiple.')}
            </p>
          </CardContent>
        </Card>
        <Card className="hover-effect cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Equity Curve')}</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('Visualize your account balance growth over time.')}
            </p>
          </CardContent>
        </Card>
         <Card className="hover-effect cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Asset Performance')}</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('Breakdown of profitability by traded asset.')}
            </p>
          </CardContent>
        </Card>
         <Card className="hover-effect cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Setup Analysis')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('Compare performance across different trade setups.')}
            </p>
          </CardContent>
        </Card>
         <Card className="hover-effect cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Mistake Analysis')}</CardTitle>
             <BarChart className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('Identify and analyze common trading errors.')}
            </p>
          </CardContent>
        </Card>
         <Card className="hover-effect cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Risk Management')}</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
               {t('Evaluate the effectiveness of your risk rules.')}
            </p>
          </CardContent>
        </Card>
        {/* Add more report card placeholders */}
      </div>
    </div>
  );
}
