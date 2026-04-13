'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, Settings, MonitorPlay } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TradeReplayPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><MonitorPlay /> {t('Trade Replay')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('Replay historical price action at your own speed to practice your setups.')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 h-fit hover-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary"/> {t('Replay Setup')}</CardTitle>
            <CardDescription>{t('Set your practice parameters.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <Label htmlFor="asset">{t('Asset')}</Label>
                <Input id="asset" placeholder="e.g., XAU/USD" className="hover-effect"/>
              </div>
              <div>
                <Label htmlFor="date">{t('Date')}</Label>
                <Input id="date" type="date" className="hover-effect"/>
              </div>
               <div>
                 <Label htmlFor="speed">{t('Replay Speed')}</Label>
                  <Select>
                    <SelectTrigger id="speed" className="hover-effect">
                      <SelectValue placeholder={t('Select speed')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tick">{t('Tick by Tick')}</SelectItem>
                      <SelectItem value="realtime">{t('Real-time')}</SelectItem>
                      <SelectItem value="5x">5x</SelectItem>
                      <SelectItem value="10x">10x</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div>
                 <Label htmlFor="data-type">{t('Data Type')}</Label>
                  <Select>
                    <SelectTrigger id="data-type" className="hover-effect">
                      <SelectValue placeholder={t('Select data type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">{t('1m Bars')}</SelectItem>
                      <SelectItem value="5m">{t('5m Bars')}</SelectItem>
                      <SelectItem value="15m">15m Bars</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            <Button className="w-full hover-effect">
              <PlayCircle className="mr-2 h-4 w-4" /> {t('Start Replay')}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 min-h-[500px] flex flex-col hover-effect">
          <CardHeader>
            <CardTitle>{t('Replay Window')}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center bg-muted/30 rounded-b-lg p-6">
            <MonitorPlay className="h-16 w-16 text-muted-foreground mb-4 opacity-20"/>
            <p className="text-muted-foreground text-center italic">{t('Loading market data...')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
