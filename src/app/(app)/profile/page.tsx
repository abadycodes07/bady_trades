'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Mail, Edit } from 'lucide-react'; 
import { Skeleton } from '@/components/ui/skeleton'; 
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><UserCircle /> {t('User Profile')}</h1>
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
    return <p>{t('Please log in to view your profile.')}</p>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><UserCircle /> {t('User Profile')}</h1>

      <Card className="max-w-2xl mx-auto hover-effect">
        <CardHeader>
           <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || t('User')} />
                    <AvatarFallback className="text-2xl">{user.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                    <CardTitle className="text-xl">{user.displayName || t('Trader')}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-sm">
                        <Mail className="h-4 w-4"/> {user.email}
                    </CardDescription>
                    </div>
                </div>
                <Button variant="outline" size="icon" className="hover-effect">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">{t('Edit Profile')}</span>
                 </Button>
           </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
              <Label htmlFor="displayName">{t('Display Name')}</Label>
              <Input id="displayName" value={user.displayName || ''} readOnly placeholder={t('Your Name')} className="bg-muted/50"/>
            </div>
            <div className="pt-4">
                <h3 className="text-lg font-semibold mb-2">{t('Account Actions')}</h3>
                <div className="flex gap-2">
                    <Button variant="outline" className="hover-effect">{t('Change Password')}</Button>
                    <Button variant="destructive" className="hover-effect">{t('Delete Account')}</Button>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
