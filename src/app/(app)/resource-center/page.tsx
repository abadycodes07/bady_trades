import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Video, Users } from 'lucide-react'; // Example icons
import Link from 'next/link';

// Mock data
const resources = [
  { id: '1', title: 'Trading Psychology Bootcamp', type: 'Bootcamp', icon: GraduationCap, description: 'Master your mindset for consistent trading.', link: '/academy/psychology' },
  { id: '2', title: 'Risk Management Guide', type: 'Article', icon: BookOpen, description: 'Learn essential risk management techniques.', link: '#' },
  { id: '3', title: 'Strategy Development Webinar', type: 'Webinar', icon: Video, description: 'Watch our latest webinar on building profitable strategies.', link: '#' },
  { id: '4', title: 'Community Forum', type: 'Community', icon: Users, description: 'Connect with other traders in our Discord community.', link: '#' },
  { id: '5', title: 'Backtesting Best Practices', type: 'Article', icon: BookOpen, description: 'Tips for effective strategy backtesting.', link: '#' },
];

export default function ResourceCenterPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Resource Center</h1>
      <p className="text-muted-foreground mb-8">
        Access educational content, bootcamps, webinars, and community resources to enhance your trading skills.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <Link key={resource.id} href={resource.link} passHref legacyBehavior>
             <a className="block hover-effect rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                 <Card className="h-full flex flex-col cursor-pointer transition-shadow duration-200 hover:shadow-lg">
                   <CardHeader>
                     <div className="flex items-center gap-3 mb-2">
                         <resource.icon className="h-6 w-6 text-primary" />
                        <CardTitle>{resource.title}</CardTitle>
                     </div>
                     <CardDescription>{resource.description}</CardDescription>
                   </CardHeader>
                   <CardContent className="flex-grow"></CardContent> {/* To push footer down */}
                    <div className="px-6 pb-4 text-xs text-muted-foreground">
                       Type: {resource.type}
                    </div>
                 </Card>
             </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
