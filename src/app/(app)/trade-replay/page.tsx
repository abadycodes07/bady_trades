'use client'; // Add this directive

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, Rewind, FastForward, PauseCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import React from 'react';

export default function TradeReplayPage() {
   const [date, setDate] = React.useState<Date>();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Trade Replay</h1>
      <p className="text-muted-foreground mb-8">
        Replay your trades tick by tick to review execution and decision-making. Access historical market data.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1 h-fit hover-effect">
          <CardHeader>
            <CardTitle>Replay Setup</CardTitle>
            <CardDescription>Configure the replay session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="asset">Asset</Label>
              <Input id="asset" placeholder="e.g., AAPL, BTC/USD" className="hover-effect"/>
            </div>
             <div>
                <Label htmlFor="date">Date</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal hover-effect",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
             </div>
             <div>
               <Label htmlFor="speed">Replay Speed</Label>
                <Select>
                  <SelectTrigger id="speed" className="hover-effect">
                    <SelectValue placeholder="Select speed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x (Realtime)</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="5">5x</SelectItem>
                    <SelectItem value="10">10x</SelectItem>
                     <SelectItem value="tick">Tick by Tick</SelectItem>
                  </SelectContent>
                </Select>
             </div>
              <div>
               <Label htmlFor="data-type">Data Type</Label>
                <Select>
                  <SelectTrigger id="data-type" className="hover-effect">
                    <SelectValue placeholder="Select data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="l1">Level 1</SelectItem>
                    <SelectItem value="l2">Level 2 (Time & Sales)</SelectItem>
                  </SelectContent>
                </Select>
             </div>
            <Button className="w-full hover-effect">
              <PlayCircle className="mr-2 h-4 w-4" /> Start Replay
            </Button>
          </CardContent>
        </Card>

        {/* Replay Area (Chart and Controls) */}
        <Card className="lg:col-span-2 flex flex-col hover-effect">
          <CardHeader>
            <CardTitle>Replay Window</CardTitle>
             <CardDescription>Asset: [Selected Asset] | Date: {date ? format(date, "PPP") : 'N/A'}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center bg-muted/30 rounded-b-lg">
            {/* Placeholder for Chart */}
            <p className="text-muted-foreground">Trading Chart Area</p>
             {/* In a real app, this would be an interactive chart component */}
          </CardContent>
           <div className="p-4 border-t flex items-center justify-center gap-4 bg-background rounded-b-lg">
              <Button variant="outline" size="icon" className="hover-effect" title="Rewind">
                 <Rewind className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" className="hover-effect" title="Pause/Play">
                 {/* Toggle between Play and Pause icons based on state */}
                 <PauseCircle className="h-6 w-6" />
                 {/* <PlayCircle className="h-6 w-6" /> */}
              </Button>
               <Button variant="outline" size="icon" className="hover-effect" title="Fast Forward">
                 <FastForward className="h-5 w-5" />
              </Button>
              {/* Add speed control display/slider here? */}
           </div>
        </Card>
      </div>
    </div>
  );
}
