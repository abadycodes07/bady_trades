
// src/app/(app)/academy/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Video, ChevronRight, Target, BarChart3, Zap, Brain, Shield } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

// Featured ICT and Order Flow courses
const courses = [
  { 
    id: 'ict-mastery', 
    title: 'ICT Concepts: The Inner Circle', 
    icon: Target, 
    description: 'Master institutional order flow, liquidity raids, and market structure shifts for precision entries.', 
    modules: ['Market Structure', 'Liquidity & Inducement', 'Killzones'],
    difficulty: 'Intermediate',
    link: '#' 
  },
  { 
    id: 'dom-order-flow', 
    title: 'DOM & Order Flow Analysis', 
    icon: BarChart3, 
    description: 'Learn to read the tape and indentify institutional footprints using Depth of Market and Footprint charts.', 
    modules: ['Tape Reading', 'Imbalance Charts', 'Cumulative Delta'],
    difficulty: 'Advanced',
    link: '#' 
  },
  { 
    id: 'psychology', 
    title: 'Trading Psychology Bootcamp', 
    icon: Brain, 
    description: 'Master your mindset, control emotions, and build the discipline required for professional trading.', 
    modules: ['Emotional Control', 'Risk Tolerance', 'Daily PnL Trauma'],
    difficulty: 'All Levels',
    link: '#' 
  },
  { 
    id: 'risk-management', 
    title: 'Risk Management Essentials', 
    icon: Shield, 
    description: 'Protect your capital with professional-grade position sizing and drawdown control strategies.', 
    modules: ['Kelly Criterion', 'Anti-Martingale', 'Position Sizing'],
    difficulty: 'Beginner',
    link: '#' 
  },
  { 
    id: 'automation', 
    title: 'Algorithm & EA Development', 
    icon: Zap, 
    description: 'Automate your ICT or DOM strategies using MQL4/5 and Python for 24/7 market monitoring.', 
    modules: ['MQL Basics', 'API Integration', 'Backtesting Algos'],
    difficulty: 'Advanced',
    link: '#' 
  },
];

export default function AcademyPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto py-8 max-w-7xl px-4">
      <div className="mb-10 text-center md:text-left rtl:md:text-right">
        <h1 className="text-4xl font-bold mb-3 flex items-center justify-center md:justify-start rtl:md:justify-start gap-3">
          <GraduationCap className="h-10 w-10 text-primary" /> {t('BadyTrades Academy')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl rtl:max-w-none rtl:mx-0">
          {t('Elevate your edge with professional-grade trading education. From ICT concepts to institutional order flow analysis.')}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Link key={course.id} href={course.link} className="block group">
            <Card className="h-full bg-card/50 backdrop-blur-md border-primary/10 hover:border-primary/40 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
               
              <CardHeader>
                 <div className="flex justify-between items-start mb-2">
                    <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <course.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-muted rounded-full text-muted-foreground">
                        {t(course.difficulty)}
                    </span>
                 </div>
                 <CardTitle className="text-xl group-hover:text-primary transition-colors">{t(course.title)}</CardTitle>
                 <CardDescription className="line-clamp-2 mt-2 leading-relaxed">
                   {t(course.description)}
                 </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex flex-wrap gap-2 mt-2">
                    {course.modules.map(mod => (
                        <span key={mod} className="text-[10px] px-2 py-1 bg-primary/5 border border-primary/10 rounded text-primary/80 font-medium whitespace-nowrap">
                            {t(mod)}
                        </span>
                    ))}
                </div>
              </CardContent>

              <CardFooter className="pt-6 mt-auto">
                 <div className="w-full flex items-center justify-between group-hover:px-1 transition-all">
                    <span className="text-sm font-semibold text-primary">{t('Start Course')}</span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                       <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                    </div>
                 </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>

      {/* Coming soon banner */}
      <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-primary/5 border border-primary/20 text-center">
         <h3 className="text-xl font-bold mb-2">{t('Weekly Live Webinars')}</h3>
         <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            {t('Join 100,000+ traders every Sunday for the BadyTrades Weekly Outlook. We breakdown ICT setups and DOM imbalances for the week ahead.')}
         </p>
         <Button variant="default" className="hover-effect">
            <Video className="mr-2 h-4 w-4" /> {t('Subscribe for Invites')}
         </Button>
      </div>
    </div>
  );
}
