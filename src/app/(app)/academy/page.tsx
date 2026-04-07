
// src/app/(app)/academy/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Video, ChevronRight, Target, BarChart3, Zap, Brain, Shield } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Featured ICT and Order Flow courses
const courses = [
  { 
    id: 'ict-mastery', 
    title: 'ICT Concepts: The Inner Circle', 
    icon: Target, 
    thumbnail: '/images/academy/ict-thumbnail.png',
    description: 'Master institutional order flow, liquidity raids, and market structure shifts for precision entries.', 
    modules: ['Market Structure', 'Liquidity & Inducement', 'Killzones'],
    difficulty: 'Intermediate',
    link: '#' 
  },
  { 
    id: 'dom-order-flow', 
    title: 'DOM & Order Flow Analysis', 
    icon: BarChart3, 
    thumbnail: '/images/academy/orderflow-thumbnail.png',
    description: 'Learn to read the tape and identify institutional footprints using Depth of Market and Footprint charts.', 
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
    <div className="container mx-auto py-8 max-w-7xl px-4 animate-fade-in">
      <div className="mb-10 text-center md:text-left rtl:md:text-right">
        <h1 className="text-4xl font-black mb-3 flex items-center justify-center md:justify-start rtl:md:justify-start gap-3 tracking-tight">
          <GraduationCap className="h-10 w-10 text-primary" /> {t('BadyTrades Academy')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl rtl:max-w-none rtl:mx-0 font-medium">
          {t('Elevate your edge with professional-grade trading education. From ICT concepts to institutional order flow analysis.')}
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Link key={course.id} href={course.link} className="block group h-full">
            <Card className="h-full flex flex-col bg-card/40 backdrop-blur-xl border-primary/10 hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(var(--primary-rgb),0.15)] cursor-pointer relative overflow-hidden group-hover:-translate-y-2">
               {/* Decorative background element */}
               <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
               
               {course.thumbnail && (
                 <div className="relative h-56 w-full overflow-hidden">
                    <img 
                      src={course.thumbnail} 
                      alt={course.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60" />
                    <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 shadow-xl">
                            {t(course.difficulty)}
                        </span>
                    </div>
                 </div>
               )}

              <CardHeader className={cn(course.thumbnail ? "pt-4" : "pt-6")}>
                 <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors shadow-inner">
                      <course.icon className="h-6 w-6 text-primary" />
                    </div>
                    {!course.thumbnail && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-muted rounded-full text-muted-foreground">
                          {t(course.difficulty)}
                      </span>
                    )}
                 </div>
                 <CardTitle className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors leading-tight">{t(course.title)}</CardTitle>
                 <CardDescription className="line-clamp-2 mt-2 leading-relaxed text-sm font-medium">
                   {t(course.description)}
                 </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-2 mt-2">
                    {course.modules.map(mod => (
                        <span key={mod} className="text-[10px] px-2.5 py-1.5 bg-primary/5 border border-primary/10 rounded-lg text-primary font-bold whitespace-nowrap tracking-wide">
                            {t(mod)}
                        </span>
                    ))}
                </div>
              </CardContent>

              <CardFooter className="pt-6 pb-6 border-t border-primary/5">
                 <div className="w-full flex items-center justify-between">
                    <span className="text-sm font-black text-primary tracking-wide uppercase">{t('Start Course')}</span>
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-12 transition-all duration-300 shadow-lg shadow-primary/5">
                       <ChevronRight className="h-5 w-5 rtl:rotate-180" />
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
