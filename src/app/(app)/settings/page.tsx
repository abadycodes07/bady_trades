
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Palette, Bell, UploadCloud, RotateCcw } from 'lucide-react'; // Import icons
import { useTheme } from 'next-themes'; 
import { ModeToggle } from '@/components/theme-toggle'; 
import { useTradeData } from '@/contexts/TradeDataContext'; // Import useTradeData
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';


export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { clearTrades, isLoading: isTradeDataLoading } = useTradeData(); // Get clearTrades function
  const { toast } = useToast();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultChartType, setDefaultChartType] = useState('candlestick');
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);
  const [isResetTradesDialogOpen, setIsResetTradesDialogOpen] = useState(false);

  const handleResetTrades = async () => {
    try {
      await clearTrades();
      toast({
        title: "Trades Reset",
        description: "All trade data has been cleared. You can now upload new CSV files.",
      });
    } catch (error) {
      console.error("Failed to reset trades:", error);
      toast({
        title: "Error Resetting Trades",
        description: "Could not clear trade data. Please try again.",
        variant: "destructive",
      });
    }
    setIsResetTradesDialogOpen(false);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><Settings /> Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account preferences, appearance, and notification settings.
      </p>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

        {/* Appearance Settings */}
        <Card className="hover-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette /> Appearance</CardTitle>
            <CardDescription>Customize the look and feel of BadyTrades.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between rounded-lg border p-4">
               <Label htmlFor="theme-mode" className="font-medium">Theme Mode</Label>
               <ModeToggle />
             </div>
            <div>
               <Label htmlFor="chart-type">Default Chart Type</Label>
               <Select value={defaultChartType} onValueChange={setDefaultChartType}>
                   <SelectTrigger id="chart-type" className="hover-effect">
                       <SelectValue placeholder="Select chart type" />
                   </SelectTrigger>
                   <SelectContent>
                       <SelectItem value="candlestick">Candlestick</SelectItem>
                       <SelectItem value="line">Line</SelectItem>
                       <SelectItem value="area">Area</SelectItem>
                       <SelectItem value="bar">Bar (OHLC)</SelectItem>
                   </SelectContent>
               </Select>
             </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="hover-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell /> Notifications</CardTitle>
            <CardDescription>Control how you receive alerts and updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between rounded-lg border p-4">
               <div>
                  <Label htmlFor="enable-notifications" className="font-medium">Enable Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive important updates.</p>
               </div>
               <Switch
                id="enable-notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                aria-label="Enable Notifications"
                className="hover-effect"
              />
            </div>
          </CardContent>
        </Card>

        {/* Data & Import Settings */}
        <Card className="hover-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UploadCloud /> Data & Import</CardTitle>
            <CardDescription>Manage data sources and import settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between rounded-lg border p-4">
               <div>
                  <Label htmlFor="auto-import" className="font-medium">Auto Trade Import</Label>
                  <p className="text-xs text-muted-foreground">Sync trades automatically (if broker connected).</p>
               </div>
               <Switch
                id="auto-import"
                checked={autoImportEnabled}
                onCheckedChange={setAutoImportEnabled}
                aria-label="Enable Auto Import"
                className="hover-effect"
                disabled // Disable until broker integration is implemented
              />
            </div>
            <Button variant="outline" className="w-full hover-effect" disabled>Manage Broker Connections</Button>
            <Button variant="outline" className="w-full hover-effect" disabled>Export Trade Data</Button>
            
            <AlertDialog open={isResetTradesDialogOpen} onOpenChange={setIsResetTradesDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full hover-effect" disabled={isTradeDataLoading}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {isTradeDataLoading ? "Resetting..." : "Reset All Trades"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to reset all trades?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All your trade data will be permanently deleted. 
                    You will be able to upload new CSV files afterwards.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="hover-effect">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetTrades}
                    className="bg-destructive hover:bg-destructive/90 hover-effect"
                    disabled={isTradeDataLoading}
                  >
                    {isTradeDataLoading ? "Resetting..." : "Yes, Reset Trades"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground text-center">
              Resetting trades will clear all currently stored trade data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
