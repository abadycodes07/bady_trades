import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Video, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// Mock data - Link to actual course/module pages
const courses = [
  { id: 'psy', title: 'Trading Psychology Bootcamp', icon: GraduationCap, description: 'Master your mindset, control emotions, and build discipline.', link: '#' },
  { id: 'rm', title: 'Risk Management Essentials', icon: BookOpen, description: 'Learn position sizing, stop-loss strategies, and risk control.', link: '#' },
  { id: 'strat', title: 'Strategy Development Workshop', icon: Video, description: 'From idea generation to backtesting and implementation.', link: '#' },
  { id: 'ta', title: 'Technical Analysis Masterclass', icon: BookOpen, description: 'Chart patterns, indicators, and market structure analysis.', link: '#' },
  { id: 'journal', title: 'Effective Journaling Techniques', icon: GraduationCap, description: 'Leverage your journal for maximum performance improvement.', link: '#' },
];

export default function AcademyPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><GraduationCap /> BadyTrades Academy</h1>
      <p className="text-muted-foreground mb-8">
        Level up your trading skills with our curated educational resources, bootcamps, and webinars.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Link key={course.id} href={course.link} passHref legacyBehavior>
             <a className="block hover-effect rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <Card className="h-full flex flex-col cursor-pointer transition-shadow duration-200 hover:shadow-lg">
                <CardHeader>
                   <div className="flex items-center gap-3 mb-2">
                      <course.icon className="h-6 w-6 text-primary" />
                      <CardTitle>{course.title}</CardTitle>
                   </div>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                 <CardContent className="flex-grow"></CardContent> {/* Pushes footer down */}
                <CardFooter className="pt-4 border-t flex justify-end">
                   <span className="text-sm font-medium text-primary flex items-center group">
                       Start Learning <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                   </span>
                </CardFooter>
              </Card>
             </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
