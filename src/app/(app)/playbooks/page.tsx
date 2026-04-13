import { useLanguage } from '@/contexts/LanguageContext';

// Mock data
const mockPlaybooks = [
  { id: '1', title: 'Breakout Strategy', description: 'Rules for trading morning breakouts.', lastUpdated: '2024-07-20' },
  { id: '2', title: 'Mean Reversion Scalp', description: 'Quick scalps on 5-min chart.', lastUpdated: '2024-07-15' },
  { id: '3', title: 'Swing Trading Checklist', description: 'Criteria for entering swing trades.', lastUpdated: '2024-06-30' },
];

export default function PlaybooksPage() {
  const { t } = useLanguage();
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('Playbooks')}</h1>
        <Button className="hover-effect">
          <PlusCircle className="mr-2 h-4 w-4" /> {t('Create New Playbook')}
        </Button>
      </div>
      <p className="text-muted-foreground mb-8">
        {t('Document your trading strategies, setups, and lessons learned. Create custom templates.')}
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockPlaybooks.map((playbook) => (
          <Card key={playbook.id} className="flex flex-col justify-between hover-effect cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookCopy className="h-5 w-5 text-primary" />
                {t(playbook.title)}
              </CardTitle>
              <CardDescription>{t(playbook.description)}</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground pt-4 border-t">
              <span>{t('Last updated')}: {playbook.lastUpdated}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title={t("Share")}>
                <Share2 className="h-4 w-4" />
                 <span className="sr-only">{t('Share')}</span>
              </Button>
            </CardFooter>
          </Card>
        ))}
         {/* Placeholder for creating a new one */}
          <Card className="border-dashed border-2 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer hover-effect min-h-[200px]">
             <CardHeader>
                <CardTitle className="text-lg">{t('New Playbook')}</CardTitle>
             </CardHeader>
             <CardContent>
                <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t('Click to create')}</p>
             </CardContent>
          </Card>
      </div>
    </div>
  );
}
