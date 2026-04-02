
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Mail, Edit } from 'lucide-react'; // Import icons
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export default function ProfilePage() {
  const { user, loading } = useAuth();
  // Add state for editing profile if needed
  // const [isEditing, setIsEditing] = useState(false);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><UserCircle /> User Profile</h1>
         <Card className="max-w-2xl mx-auto">
             <CardHeader>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
             </CardHeader>
             <CardContent className="space-y-4">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-1/3" />
             </CardContent>
         </Card>
      </div>
    );
  }

  if (!user) {
    // Should be handled by AuthWrapper, but good practice to check
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><UserCircle /> User Profile</h1>

      <Card className="max-w-2xl mx-auto hover-effect">
        <CardHeader>
           <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback className="text-2xl">{user.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                    <CardTitle className="text-xl">{user.displayName || 'Trader'}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-sm">
                        <Mail className="h-4 w-4"/> {user.email}
                    </CardDescription>
                     {/* Add Verification Status if available */}
                     {/* <p className={`text-xs ${user.emailVerified ? 'text-green-600' : 'text-orange-500'}`}>
                        {user.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                     </p> */}
                    </div>
                </div>
                 {/* Edit Button Placeholder */}
                <Button variant="outline" size="icon" className="hover-effect">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit Profile</span>
                 </Button>
           </div>
        </CardHeader>
        <CardContent className="space-y-4">
           {/* Add profile fields here */}
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={user.displayName || ''} readOnly placeholder="Your Name" className="bg-muted/50"/>
            </div>
           {/* More fields: Timezone, Connected Accounts, etc. */}
           {/* Example: */}
           {/* <div>
               <Label htmlFor="timezone">Timezone</Label>
               <Input id="timezone" value="America/New_York" readOnly className="bg-muted/50"/>
           </div> */}

            <div className="pt-4">
                <h3 className="text-lg font-semibold mb-2">Account Actions</h3>
                <div className="flex gap-2">
                    <Button variant="outline" className="hover-effect">Change Password</Button>
                    <Button variant="destructive" className="hover-effect">Delete Account</Button>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
