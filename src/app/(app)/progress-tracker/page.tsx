import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Target, TrendingUp, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { Button } from '@/components/ui/button'; // Added Button import

// Mock data
const goals = [
  { id: '1', title: 'Achieve 60% Win Rate', current: 58, target: 60, unit: '%' },
  { id: '2', title: 'Increase Avg. R-Multiple to 2.0', current: 1.8, target: 2.0, unit: ' R', step: 0.1 },
  { id: '3', title: 'Reduce Avg. Losing Trade Size', current: 45, target: 35, unit: '$', lowerIsBetter: true },
  { id: '4', title: 'Complete Bady University Module 3', current: 75, target: 100, unit: '%' },
];

export default function ProgressTrackerPage() {

  const calculateProgress = (current: number, target: number, lowerIsBetter = false) => {
     if (lowerIsBetter) {
        // Need a baseline/starting point if lower is better. Assume 0 is perfect? Or a starting value?
        // Let's assume target is the ideal minimum and current starts higher.
        // Example: Target $35, Current $45. Start $60? Progress is how far from start towards target.
        // This needs better definition based on actual use case.
        // Simplified: Percentage *towards* the target from an assumed higher start (e.g. 2*target).
         const start = target * 1.5; // Arbitrary starting point
         if (current <= target) return 100;
         if (current >= start) return 0;
         return Math.max(0, Math.min(100, ((start - current) / (start - target)) * 100));
     } else {
        if (target === 0) return 100; // Avoid division by zero
        return Math.max(0, Math.min(100, (current / target) * 100));
     }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Progress Tracker</h1>
      <p className="text-muted-foreground mb-8">
        Set trading goals and monitor your progress over time.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {goals.map((goal) => {
          const progress = calculateProgress(goal.current, goal.target, goal.lowerIsBetter);
          const isCompleted = goal.lowerIsBetter ? goal.current <= goal.target : goal.current >= goal.target;

          return (
          <Card key={goal.id} className="hover-effect">
            <CardHeader>
              <div className="flex justify-between items-start">
                 <div>
                    <CardTitle className="flex items-center gap-2">
                      {isCompleted ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Target className="h-5 w-5 text-primary" />}
                       {goal.title}
                    </CardTitle>
                    <CardDescription>
                        Target: {goal.target}{goal.unit} {goal.lowerIsBetter ? '(Lower is better)' : ''}
                     </CardDescription>
                 </div>
                 <span className={`font-semibold text-lg ${isCompleted ? 'text-green-500' : ''}`}>
                     {goal.current}{goal.unit}
                 </span>
              </div>

            </CardHeader>
            <CardContent>
              <Progress value={progress} className="w-full h-2" />
               <p className="text-xs text-muted-foreground mt-1 text-right">{progress.toFixed(0)}% Complete</p>
            </CardContent>
          </Card>
        )})}
      </div>

       {/* Add button to add new goals */}
       <div className="mt-8 text-center">
           <Button variant="outline" className="hover-effect">
             <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
           </Button>
       </div>
    </div>
  );
}
