import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Basic',
    priceMonthly: 29,
    priceYearly: 290, // Example yearly price (10 months)
    description: 'Essential journaling and basic analytics.',
    features: [
      'Automated Trade Import (1 Account)',
      'Basic Performance Metrics',
      'Calendar View',
      '1 GB Data Storage',
      'Community Access (Discord)',
    ],
    isPopular: false,
  },
  {
    name: 'Pro',
    priceMonthly: 49,
    priceYearly: 490,
    description: 'Advanced analytics, reporting, and replay.',
    features: [
      'Automated Trade Import (5 Accounts)',
      'Advanced Performance Metrics (50+ Reports)',
      'Trade Tagging & Filtering',
      'Trade Replay Functionality',
      'Strategy Backtesting (Limited)',
      '3 GB Data Storage',
      'Priority Support',
    ],
    isPopular: true,
  },
  {
    name: 'Elite',
    priceMonthly: 79,
    priceYearly: 790,
    description: 'Full suite for serious traders and mentors.',
    features: [
      'Automated Trade Import (20 Accounts)',
      'All Advanced Metrics & Reports',
      'Advanced Trade Replay (L2 Data)',
      'Unlimited Backtesting',
      'Trading Playbook Creation',
      'Mentor Mode Access',
      '5 GB Data Storage',
      'Bady University Access',
      'Dedicated Support',
    ],
    isPopular: false,
  },
];

export default function PricingPage() {
   // Add state for monthly/yearly toggle if needed
   // const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Choose Your Plan</h1>
        <p className="mt-3 text-xl text-muted-foreground sm:mt-4">
          Start improving your trading performance today with the right tools.
        </p>
         {/* Add Monthly/Yearly Toggle Here */}
         {/* <div className="mt-6"> Toggle Component </div> */}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              'flex flex-col rounded-xl shadow-lg hover-effect transition-all duration-300',
              plan.isPopular ? 'border-2 border-primary scale-105' : 'border'
            )}
          >
             {plan.isPopular && (
               <div className="py-1 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-t-lg text-center">
                 Most Popular
               </div>
             )}
            <CardHeader className="p-6 text-center">
              <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
              <CardDescription className="mt-2 text-muted-foreground">{plan.description}</CardDescription>
               <div className="mt-4">
                 <span className="text-4xl font-bold tracking-tight">${plan.priceMonthly}</span>
                 <span className="text-base font-medium text-muted-foreground">/month</span>
               </div>
                <p className="text-sm text-muted-foreground mt-1">
                   or ${plan.priceYearly}/year (Save ~17%)
                </p>
            </CardHeader>
            <CardContent className="flex-1 p-6 pt-0">
              <ul role="list" className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mr-2 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button className={cn('w-full hover-effect', !plan.isPopular && 'variant="outline"')} size="lg">
                {plan.isPopular ? 'Get Started' : 'Choose Plan'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       <div className="text-center mt-12 text-sm text-muted-foreground">
         Need something different? <a href="#" className="font-medium text-primary hover:underline">Contact Sales</a> for enterprise solutions.
       </div>
    </div>
  );
}
