'use client';

// src/app/(app)/settings/page.tsx
// Settings — includes Broker Connections panel with guided import wizards

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Settings, Palette, Bell, UploadCloud, RotateCcw, Link2, CheckCircle2, Clock, AlertCircle, ChevronRight, Copy, ExternalLink, Plus } from 'lucide-react';
import { ModeToggle } from '@/components/theme-toggle';
import { useTradeData, type TradingAccount } from '@/contexts/TradeDataContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, ShieldAlert, User, Wallet, Activity } from 'lucide-react';

// ─── Broker definitions ───────────────────────────────────────────────────────
type ConnectionMethod = 'ea_plugin' | 'guided_csv' | 'coming_soon';
type ConnectionStatus = 'connected' | 'not_connected' | 'coming_soon';

interface Broker {
  id: string;
  name: string;
  description: string;
  emoji: string;
  bgColor: string;           // Tailwind class
  accentColor: string;       // Tailwind text class
  status: ConnectionStatus;
  method: ConnectionMethod;
  badge?: string;
}

const BROKERS: Broker[] = [
  {
    id: 'exness',
    name: 'Exness',
    description: 'MetaTrader 4/5 via EA Plugin',
    emoji: '🟢',
    bgColor: 'bg-green-500/10 border-green-500/30',
    accentColor: 'text-green-500',
    status: 'not_connected',
    method: 'ea_plugin',
    badge: 'Supported',
  },
  {
    id: 'icmarkets',
    name: 'IC Markets',
    description: 'MetaTrader 4/5 · cTrader via EA Plugin',
    emoji: '🔵',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    accentColor: 'text-blue-500',
    status: 'not_connected',
    method: 'ea_plugin',
    badge: 'Supported',
  },
  {
    id: 'pepperstone',
    name: 'Pepperstone',
    description: 'MetaTrader 4/5 · cTrader via EA Plugin',
    emoji: '🟠',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    accentColor: 'text-orange-500',
    status: 'not_connected',
    method: 'ea_plugin',
    badge: 'Supported',
  },
  {
    id: 'fxpro',
    name: 'FxPro',
    description: 'MetaTrader 4/5 via EA Plugin',
    emoji: '🟣',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    accentColor: 'text-purple-500',
    status: 'not_connected',
    method: 'ea_plugin',
    badge: 'Supported',
  },
  {
    id: 'xm',
    name: 'XM',
    description: 'MetaTrader 4/5 via EA Plugin',
    emoji: '⚫',
    bgColor: 'bg-slate-500/10 border-slate-500/30',
    accentColor: 'text-slate-400',
    status: 'not_connected',
    method: 'ea_plugin',
    badge: 'Supported',
  },
  {
    id: 'oanda',
    name: 'OANDA',
    description: 'Direct REST API — coming soon',
    emoji: '🔴',
    bgColor: 'bg-red-500/10 border-red-500/30',
    accentColor: 'text-red-500',
    status: 'coming_soon',
    method: 'coming_soon',
    badge: 'Coming Soon',
  },
  {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    description: 'TWS API — coming soon',
    emoji: '🟡',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    accentColor: 'text-yellow-500',
    status: 'coming_soon',
    method: 'coming_soon',
    badge: 'Coming Soon',
  },
  {
    id: 'mt4_any',
    name: 'Any MT4/MT5 Broker',
    description: 'Works with ANY MetaTrader 4 or 5 broker',
    emoji: '📊',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    accentColor: 'text-cyan-500',
    status: 'not_connected',
    method: 'ea_plugin',
    badge: 'Universal',
  },
];

// ─── EA Plugin Install Guide ──────────────────────────────────────────────────
const EA_STEPS = [
  {
    step: 1,
    title: 'Open MetaTrader 4 or 5 on your PC',
    detail: 'The EA plugin runs locally inside MetaTrader and pushes your trades automatically every 30 seconds.',
    icon: '💻',
  },
  {
    step: 2,
    title: 'Open the MQL Editor',
    detail: 'In MetaTrader: click Tools → MetaQuotes Language Editor (or press F4). This opens the MQL4/MQL5 editor.',
    icon: '⚙️',
  },
  {
    step: 3,
    title: 'Create a new Expert Advisor file',
    detail: 'In the editor: File → New → Expert Advisor. Name it "BadyTrades_Sync". Paste the EA code (download below) and compile it (F7).',
    icon: '📄',
  },
  {
    step: 4,
    title: 'Copy your personal API key',
    detail: 'Your unique key is shown below. Paste it into the EA settings when you attach it to a chart.',
    icon: '🔑',
  },
  {
    step: 5,
    title: 'Attach the EA to any chart',
    detail: 'Drag "BadyTrades_Sync" from the Navigator panel onto any chart. Set the API Key in EA properties. Enable "Allow WebRequest" for badytrades.com in MetaTrader Options → Expert Advisors.',
    icon: '📈',
  },
  {
    step: 6,
    title: 'That\'s it — trades sync automatically',
    detail: 'Every 30 seconds the EA reads your account: balance, all open/closed trades, deposits, withdrawals — and sends them to BadyTrades. Your calendar balance will update live.',
    icon: '✅',
  },
];

// ─── Guided CSV Guide ─────────────────────────────────────────────────────────
const CSV_STEPS = [
  {
    step: 1,
    title: 'Open MetaTrader on your PC',
    icon: '💻',
    detail: 'Open MT4 or MT5. Go to the "Account History" tab at the bottom.',
  },
  {
    step: 2,
    title: 'Right-click → All History',
    icon: '🖱️',
    detail: 'Right-click anywhere in the Account History tab and select "All History" to make sure ALL trades are visible, not just the last month.',
  },
  {
    step: 3,
    title: 'Save as Detailed Report (IMPORTANT)',
    icon: '💾',
    detail: 'Right-click again → "Save as Detailed Report". This saves a file that includes BOTH trades AND balance operations (deposits/withdrawals). Do NOT use "Save as Report" — that version is missing balance info.',
  },
  {
    step: 4,
    title: 'Save as CSV from the report',
    icon: '📄',
    detail: 'Open the .htm file in your browser or MetaTrader. Right-click → Save As → change type to "CSV" or copy the table content. Upload the CSV on your Dashboard.',
  },
  {
    step: 5,
    title: 'Upload on Dashboard',
    icon: '📤',
    detail: 'On the Dashboard, click "Upload Trades CSV". BadyTrades will detect your initial deposit, all trades, and withdrawals automatically.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { 
    clearTrades, 
    isLoading: isTradeDataLoading, 
    accounts, 
    deleteAccount, 
    clearTradesForAccount 
  } = useTradeData();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultChartType, setDefaultChartType] = useState('candlestick');
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);
  const [isResetTradesDialogOpen, setIsResetTradesDialogOpen] = useState(false);

  // Broker connect dialog
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [dialogTab, setDialogTab] = useState<'ea' | 'csv'>('ea');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Fake API key for demo (in production, generate per user from Supabase)
  const DEMO_API_KEY = 'bt_ea_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  const handleResetTrades = async () => {
    try {
      await clearTrades();
      toast({ title: 'Trades Reset', description: 'All trade data has been cleared.' });
    } catch {
      toast({ title: 'Error Resetting Trades', variant: 'destructive' });
    }
    setIsResetTradesDialogOpen(false);
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(DEMO_API_KEY);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const openBrokerDialog = (broker: Broker) => {
    if (broker.method === 'coming_soon') {
      toast({ title: `${broker.name} — Coming Soon`, description: 'Direct API integration for this broker is in development.' });
      return;
    }
    setSelectedBroker(broker);
    setDialogTab('ea');
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-black mb-2 flex items-center gap-2 uppercase tracking-tighter">
        <Settings className="h-7 w-7 text-indigo-500" /> {t('Control Center')}
      </h1>
      <p className="text-muted-foreground mb-8 font-medium">
        {t('Manage your trading accounts, connections, and personal preferences.')}
      </p>

      <Tabs defaultValue="accounts" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 h-12 rounded-xl">
          <TabsTrigger value="accounts" className="rounded-lg px-6 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-background data-[state=active]:text-indigo-500 shadow-none">
            <Wallet className="h-4 w-4 mr-2" /> {t('Accounts')}
          </TabsTrigger>
          <TabsTrigger value="general" className="rounded-lg px-6 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-background data-[state=active]:text-indigo-500 shadow-none">
            <Settings className="h-4 w-4 mr-2" /> {t('General')}
          </TabsTrigger>
          <TabsTrigger value="connections" className="rounded-lg px-6 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-background data-[state=active]:text-indigo-500 shadow-none">
            <Link2 className="h-4 w-4 mr-2" /> {t('Connections')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-6">
          <Card className="border-border/50 overflow-hidden rounded-2xl shadow-xl bg-card/30 backdrop-blur-sm">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-500" /> {t('Trading Accounts')}
                  </CardTitle>
                  <CardDescription className="font-medium mt-1">
                    {t('Overview of all your connected portfolios and accounts.')}
                  </CardDescription>
                </div>
                <Button 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-widest px-6"
                    onClick={() => {
                        const event = new CustomEvent('open-add-trade-dialog');
                        window.dispatchEvent(event);
                    }}
                >
                  <Plus className="h-4 w-4 mr-2" /> {t('Add New')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t('Account Name')}</TableHead>
                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t('Broker')}</TableHead>
                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t('Status')}</TableHead>
                    <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.filter((a: TradingAccount) => a.id !== 'demo-account').map((account: TradingAccount) => (
                    <TableRow key={account.id} className="border-border/50 hover:bg-indigo-500/5 transition-colors group">
                      <TableCell className="py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{account.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{account.id.substring(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold px-3">
                          {account.broker || 'MetaTrader 4/5'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold text-emerald-500">{t('Active')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-indigo-500 transition-colors">
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl border-border bg-background/95 backdrop-blur-xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">{t('Reset Account?')}</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground font-medium">
                                  {t('This will permanently delete ALL trade data for this account. Your settings and account connection will remain.')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl border-white/10">{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={() => clearTradesForAccount(account.id)}
                                    className="bg-indigo-600 hover:bg-indigo-500 rounded-xl"
                                >
                                    {t('Yes, Reset')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl border-red-500/20 bg-background/95 backdrop-blur-xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-red-500">{t('Delete Account?')}</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground font-medium">
                                  {t('This action cannot be undone. All trades, settings, and connection data for this account will be permanently removed.')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl border-white/10">{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={() => deleteAccount(account.id)}
                                    className="bg-red-600 hover:bg-red-500 rounded-xl"
                                >
                                    {t('Delete Permanently')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {accounts.filter((a: TradingAccount) => a.id !== 'demo-account').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-40">
                          <Activity className="h-10 w-10 text-muted-foreground" />
                          <p className="text-sm font-bold uppercase tracking-widest">{t('No active accounts found')}</p>
                          <Button 
                            variant="link" 
                            className="text-xs text-indigo-400 font-black h-auto p-0"
                            onClick={() => {
                                const event = new CustomEvent('open-add-trade-dialog');
                                window.dispatchEvent(event);
                            }}
                          >
                            {t('Add your first account')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        {/* ── Broker Connections ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Broker Connections</h2>
            <Badge variant="outline" className="text-xs border-green-500/50 text-green-500">Beta</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your broker to automatically sync trades, deposits, and withdrawals — no manual CSV uploads needed.
            All supported brokers use the <strong>MT4/MT5 EA Plugin</strong> method which runs on your PC inside MetaTrader.
          </p>

          {/* How it works banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-5 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div className="text-sm">
              <p className="font-semibold text-blue-400 mb-1">How auto-sync works</p>
              <p className="text-muted-foreground">
                A small Expert Advisor (EA) plugin runs inside your MetaTrader app on your PC.
                It reads your account every 30 seconds and securely sends your trades, balance, deposits, and withdrawals to BadyTrades.
                This is the same method used by professional journaling platforms. 
                <strong> Your broker login credentials are NEVER shared with BadyTrades.</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {BROKERS.map((broker) => (
              <button
                key={broker.id}
                onClick={() => openBrokerDialog(broker)}
                className={cn(
                  'relative flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
                  broker.bgColor,
                  broker.status === 'coming_soon' ? 'opacity-60 cursor-default' : 'cursor-pointer hover:border-primary/50'
                )}
              >
                {/* Status dot */}
                <span className="absolute top-2 right-2">
                  {broker.status === 'connected' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : broker.status === 'coming_soon' ? (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <span className="h-3 w-3 rounded-full bg-muted-foreground/30 inline-block" />
                  )}
                </span>

                <span className="text-2xl">{broker.emoji}</span>
                <div>
                  <p className="font-semibold text-sm">{broker.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{broker.description}</p>
                </div>

                {broker.badge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 mt-auto',
                      broker.status === 'not_connected' ? 'border-green-500/40 text-green-500' :
                      broker.status === 'coming_soon' ? 'border-muted-foreground/30 text-muted-foreground' : 'border-green-500/40 text-green-500'
                    )}
                  >
                    {broker.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── Other settings grid ───────────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Appearance */}
          <Card className="hover-effect">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" /> Appearance</CardTitle>
              <CardDescription>Customize the look and feel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="theme-mode" className="font-medium">Theme Mode</Label>
                <ModeToggle />
              </div>
              <div>
                <Label htmlFor="chart-type">Default Chart Type</Label>
                <Select value={defaultChartType} onValueChange={setDefaultChartType}>
                  <SelectTrigger id="chart-type" className="hover-effect mt-1">
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

          {/* Notifications */}
          <Card className="hover-effect">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle>
              <CardDescription>Control alerts and updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="enable-notifications" className="font-medium">Enable Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive important updates.</p>
                </div>
                <Switch id="enable-notifications" checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} className="hover-effect" />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="auto-import" className="font-medium">Auto Trade Sync</Label>
                  <p className="text-xs text-muted-foreground">Enable when EA is connected.</p>
                </div>
                <Switch id="auto-import" checked={autoImportEnabled} onCheckedChange={setAutoImportEnabled} className="hover-effect" disabled />
              </div>
            </CardContent>
          </Card>

          {/* Data */}
          <Card className="hover-effect">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UploadCloud className="h-4 w-4" /> Data Management</CardTitle>
              <CardDescription>Manage and reset your trade data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full hover-effect" disabled>Export Trade Data (CSV)</Button>

              <AlertDialog open={isResetTradesDialogOpen} onOpenChange={setIsResetTradesDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full hover-effect" disabled={isTradeDataLoading}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {isTradeDataLoading ? 'Resetting...' : 'Reset All Trades'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all trades?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone. All trade data will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetTrades} className="bg-destructive hover:bg-destructive/90" disabled={isTradeDataLoading}>
                      {isTradeDataLoading ? 'Resetting...' : 'Yes, Reset'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground text-center">Resetting clears all stored trade data.</p>
            </CardContent>
          </Card>
        </div>
          </div>
        </TabsContent>

        <TabsContent value="connections">
          {/* ── Broker Connections ─────────────────────────────────────── */}
          <section>

      {/* ── Broker Connection Dialog ───────────────────────────────── */}
      <Dialog open={!!selectedBroker} onOpenChange={(open) => !open && setSelectedBroker(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">{selectedBroker?.emoji}</span>
              Connect {selectedBroker?.name}
            </DialogTitle>
            <DialogDescription>
              Choose your preferred sync method below.
            </DialogDescription>
          </DialogHeader>

          {/* Method tabs */}
          <div className="flex gap-2 mt-2">
            <Button
              variant={dialogTab === 'ea' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDialogTab('ea')}
              className="flex-1"
            >
              🤖 EA Auto-Sync (Recommended)
            </Button>
            <Button
              variant={dialogTab === 'csv' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDialogTab('csv')}
              className="flex-1"
            >
              📄 Guided CSV Import
            </Button>
          </div>

          {/* EA Tab */}
          {dialogTab === 'ea' && (
            <div className="space-y-4 mt-2">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
                <p className="font-semibold text-green-400 mb-1">🤖 Fully Automatic — Recommended</p>
                <p className="text-muted-foreground text-xs">
                  The EA plugin runs inside MetaTrader on your PC and syncs trades every 30 seconds.
                  Works with <strong>any MT4/MT5 broker</strong> including Exness. Your broker password is never shared.
                </p>
              </div>

              {/* Your API Key */}
              <div>
                <Label className="text-sm font-medium">Your BadyTrades API Key</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <code className="flex-1 bg-muted text-xs p-2.5 rounded-lg font-mono truncate">
                    {DEMO_API_KEY}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyApiKey}>
                    {apiKeyCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Paste this key into the EA settings in MetaTrader.</p>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {EA_STEPS.map((s) => (
                  <div key={s.step} className="flex gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {s.step}
                    </div>
                    <div>
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        <span>{s.icon}</span> {s.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full" variant="outline" asChild>
                <a href="https://github.com/abadycodes07/bady_trades/blob/main/ea/BadyTrades_Sync.mq4" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Download EA Plugin (.mq4 file)
                </a>
              </Button>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-500" />
                <p>
                  In MetaTrader, you must enable <strong>Allow WebRequests for listed URLs</strong> and add
                  <code className="mx-1 bg-muted px-1 rounded">badytrades-production.up.railway.app</code>
                  to the list. This is in MetaTrader → Tools → Options → Expert Advisors.
                </p>
              </div>
            </div>
          )}

          {/* CSV Tab */}
          {dialogTab === 'csv' && (
            <div className="space-y-4 mt-2">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="font-semibold text-blue-400 mb-1">📄 Guided Full Account Statement Export</p>
                <p className="text-muted-foreground text-xs">
                  Export the <strong>detailed report</strong> (not just trade history) from MetaTrader.
                  This includes your initial deposit, deposits, withdrawals, and all trades — so BadyTrades can calculate your exact account balance per day.
                </p>
              </div>

              <div className="space-y-3">
                {CSV_STEPS.map((s) => (
                  <div key={s.step} className="flex gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {s.step}
                    </div>
                    <div>
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        <span>{s.icon}</span> {s.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-500" />
                <p>
                  <strong>Critical:</strong> You MUST use <strong>"Save as Detailed Report"</strong>, not "Save as Report". 
                  Only the Detailed Report includes balance rows (your deposits/withdrawals and initial capital).
                  Without those rows, BadyTrades cannot calculate your account balance.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
