'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, Eye, Mail } from 'lucide-react';

export default function MentorModePage() {
  const { t } = useLanguage();
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [mentorEmail, setMentorEmail] = useState('');

  const handleInviteMentor = () => {
      console.log(`Inviting mentor: ${mentorEmail}`);
      setMentorEmail('');
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><Users /> {t('Mentor Mode')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('Share your trading journal and progress with mentors for feedback and guidance. Grant view-only access securely.')}
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Sharing Settings */}
        <Card className="hover-effect">
          <CardHeader>
            <CardTitle>{t('Sharing Settings')}</CardTitle>
            <CardDescription>{t('Control access to your trading data.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
               <div>
                  <Label htmlFor="enable-sharing" className="font-medium">{t('Enable Mentor Access')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Allow invited mentors to view your journal.')}</p>
               </div>
               <Switch
                id="enable-sharing"
                checked={sharingEnabled}
                onCheckedChange={setSharingEnabled}
                aria-label={t("Enable Mentor Access")}
              />
            </div>
             <p className="text-xs text-muted-foreground italic">
                {sharingEnabled
                 ? t("Mentor access is enabled. Invited mentors can view your journal.")
                 : t("Mentor access is disabled. No one can view your journal.")}
             </p>
          </CardContent>
        </Card>

        {/* Invite Mentor */}
        <Card className="hover-effect">
          <CardHeader>
            <CardTitle>{t('Invite Mentor')}</CardTitle>
            <CardDescription>{t('Send an invitation to grant view-only access.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mentor-email">{t('Mentor\'s Email')}</Label>
              <div className="flex gap-2">
                 <Input
                   id="mentor-email"
                   type="email"
                   placeholder={t('mentor@example.com')}
                   value={mentorEmail}
                   onChange={(e) => setMentorEmail(e.target.value)}
                   disabled={!sharingEnabled}
                   className="hover-effect"
                 />
                <Button onClick={handleInviteMentor} disabled={!sharingEnabled || !mentorEmail} className="hover-effect">
                  <Mail className="mr-2 h-4 w-4" /> {t('Invite')}
                </Button>
              </div>
              {!sharingEnabled && <p className="text-xs text-destructive mt-1">{t('Enable sharing first to invite mentors.')}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List of Active Mentors */}
       <div className="mt-12">
           <h2 className="text-2xl font-semibold mb-4">{t('Active Mentors')}</h2>
           <Card>
                <CardContent className="pt-6">
                     <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                         <div>
                            <p className="font-medium">{t('Mentor Name Example')}</p>
                            <p className="text-sm text-muted-foreground">mentor@example.com</p>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 flex items-center gap-1"><Eye className="h-3 w-3"/> {t('Viewing')}</span>
                            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive hover-effect">{t('Revoke Access')}</Button>
                         </div>
                     </div>
                    <p className="text-muted-foreground mt-4 text-center">{t('No mentors have access yet.')}</p>
                </CardContent>
           </Card>
       </div>
    </div>
  );
}
