// src/app/(app)/notebook/tracking/[tradeId]/page.tsx
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTradeData } from '@/contexts/TradeDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Star, ChevronDown, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import type { CsvTradeData } from '@/app/(app)/dashboard/page';
import { RunningPnLChart } from '@/components/notebook/RunningPnLChart';
import TradingViewWidget from '@/components/notebook/TradingViewWidget';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import type { Note, NoteContentBlock } from '@/types/notebook';
import { format as formatDateFns, parse as parseDateFns, isValid as isValidDate } from 'date-fns';


// Mock currency for now, this should ideally come from a context or props
const mockSelectedCurrency = { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 };

// Mock data for dropdowns - these could eventually come from a user's settings or a global config
const mockPlaybooksData = [
    { id: 'pb1', name: 'Morning Breakout Scalp' },
    { id: 'pb2', name: 'Mean Reversion 5min' },
    { id: 'pb3', name: 'Earnings Play Pre-Market' },
    { id: 'pb4', name: 'Trend Following Daily' },
    { id: 'pb5', name: 'News Catalyst Momentum' },
];

const mockSetupsData = [
    { id: 's1', name: 'ORB (Opening Range Breakout)' },
    { id: 's2', name: 'Bull Flag' },
    { id: 's3', name: 'Reversal at Support' },
    { id: 's4', name: 'VWAP Bounce' },
    { id: 's5', name: 'Red to Green Move' },
];
const mockMistakesData = [
    { id: 'm1', name: 'Over-trading' },
    { id: 'm2', name: 'Revenge Trading' },
    { id: 'm3', name: 'FOMO Entry' },
    { id: 'm4', name: 'Ignored Stop Loss' },
    { id: 'm5', name: 'Sized too big' },
];
const mockCustomTagsData = [
    { id: 't1', name: 'High Volatility' },
    { id: 't2', name: 'News Driven' },
    { id: 't3', name: 'Low Float' },
    { id: 't4', name: 'Fed Day' },
    { id: 't5', name: 'Quad Witching' },
];

interface NoteDetails {
  pt?: string;
  sl?: string;
  rating?: number;
  playbookId?: string;
  setupIds?: string[];
  mistakeIds?: string[];
  customTagIds?: string[];
}


export default function TradeTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { tradeId } = params;
  const { tradeData, isLoading: tradeDataLoading, addTrades } = useTradeData(); 
  const { theme } = useTheme(); 
  const { toast } = useToast();

  const [tradeRating, setTradeRating] = useState(0);
  const [profitTarget, setProfitTarget] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  
  // State for dynamic tag lists
  const [playbooks, setPlaybooks] = useState(mockPlaybooksData);
  const [setups, setSetups] = useState(mockSetupsData);
  const [mistakes, setMistakes] = useState(mockMistakesData);
  const [customTags, setCustomTags] = useState(mockCustomTagsData);

  // State for selected tags
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | undefined>(undefined);
  const [selectedSetups, setSelectedSetups] = useState<string[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [selectedCustomTags, setSelectedCustomTags] = useState<string[]>([]);


  const trade = useMemo(() => {
    if (tradeId && tradeData.length > 0) {
      return tradeData.find(t => String(t.id) === String(tradeId)) as CsvTradeData | undefined;
    }
    return undefined;
  }, [tradeId, tradeData]);

  useEffect(() => {
    if (trade) {
      if (trade.Note) {
        try {
          const parsedNote: NoteDetails = JSON.parse(trade.Note);
          setProfitTarget(parsedNote.pt || '');
          setStopLoss(parsedNote.sl || '');
          setTradeRating(parsedNote.rating || 0);
          setSelectedPlaybook(parsedNote.playbookId || undefined);
          setSelectedSetups(parsedNote.setupIds || []);
          setSelectedMistakes(parsedNote.mistakeIds || []);
          setSelectedCustomTags(parsedNote.customTagIds || []);
        } catch (e) {
          const ptMatch = trade.Note.match(/PT:([^|]+)/);
          const slMatch = trade.Note.match(/SL:([^|]+)/);
          setProfitTarget(ptMatch ? ptMatch[1].trim() : '');
          setStopLoss(slMatch ? slMatch[1].trim() : '');
          setTradeRating(0);
          setSelectedPlaybook(undefined);
          setSelectedSetups([]);
          setSelectedMistakes([]);
          setSelectedCustomTags([]);
          console.warn("Failed to parse trade.Note as JSON, attempting legacy or defaults for PT/SL.", e);
        }
      } else {
        setProfitTarget('');
        setStopLoss('');
        setTradeRating(0);
        setSelectedPlaybook(undefined);
        setSelectedSetups([]);
        setSelectedMistakes([]);
        setSelectedCustomTags([]);
      }
    }
  }, [trade]);


  const handleSaveTradeDetails = () => {
    if (trade) {
        const noteDetails: NoteDetails = {
            pt: profitTarget,
            sl: stopLoss,
            rating: tradeRating,
            playbookId: selectedPlaybook,
            setupIds: selectedSetups,
            mistakeIds: selectedMistakes,
            customTagIds: selectedCustomTags,
        };
        const updatedNoteString = JSON.stringify(noteDetails);
        const updatedTrade = { ...trade, Note: updatedNoteString };
        
        addTrades([updatedTrade]); 
        
        try {
            const storedNotesRaw = localStorage.getItem('badytrades_notes_v2');
            let notes: Note[] = storedNotesRaw ? JSON.parse(storedNotesRaw) : [];
            notes = notes.map(n => ({
                ...n,
                createdAt: new Date(n.createdAt),
                updatedAt: new Date(n.updatedAt)
            }));
            const existingNoteIndex = notes.findIndex(n => String(n.linkedTradeId) === String(trade.id));

            const summaryLines = [
              `Trade Review: ${trade.Symbol || 'N/A'} on ${trade.Date || 'N/A'}`,
              `- Net P&L: ${formatCurrencyDisplay(parseFloat(trade.NetPnL || '0'))}`,
              `- Rating: ${tradeRating}/5 stars`,
              `- Profit Target: ${profitTarget || 'Not set'}`,
              `- Stop Loss: ${stopLoss || 'Not set'}`,
              `- Playbook: ${playbooks.find(p => p.id === selectedPlaybook)?.name || 'None selected'}`,
              `- Setups: ${selectedSetups.length > 0 ? selectedSetups.map(id => setups.find(s => s.id === id)?.name).join(', ') : 'None identified'}`,
              `- Mistakes: ${selectedMistakes.length > 0 ? selectedMistakes.map(id => mistakes.find(m => m.id === id)?.name).join(', ') : 'None identified'}`,
              `- Custom Tags: ${selectedCustomTags.length > 0 ? selectedCustomTags.map(id => customTags.find(t => t.id === id)?.name).join(', ') : 'None'}`,
            ];
            const noteContentText = summaryLines.join('\n');
            const newNoteContent: NoteContentBlock[] = [{ type: 'paragraph', children: [{ text: noteContentText }] }];

            let toastMessage = "Trade details saved. Note updated in Notebook.";

            if (existingNoteIndex > -1) { 
                const existingNote = notes[existingNoteIndex];
                notes[existingNoteIndex] = {
                    ...existingNote,
                    title: existingNote.title === 'Untitled Note' || !existingNote.title ? `${trade.Symbol || 'Trade'} : ${trade.Date || new Date().toLocaleDateString()}` : existingNote.title,
                    content: newNoteContent,
                    updatedAt: new Date(),
                    folderId: existingNote.folderId || 'tradenotes', 
                };
            } else { 
                const newNote: Note = {
                    id: crypto.randomUUID(),
                    title: `${trade.Symbol || 'Trade'} : ${trade.Date || new Date().toLocaleDateString()}`,
                    content: newNoteContent,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    folderId: 'tradenotes',
                    tagIds: [],
                    linkedTradeId: String(trade.id),
                };
                notes.push(newNote);
                toastMessage = "Trade details saved. New note created in Notebook.";
            }

            localStorage.setItem('badytrades_notes_v2', JSON.stringify(notes));
            toast({ title: "Details & Note Saved", description: toastMessage });

        } catch (error) {
            console.error("Error updating/creating note in localStorage:", error);
            toast({ title: "Details Saved", description: "Trade details updated. Could not update notebook note.", variant: "default" });
        }
    }
  };

  const pnl = parseFloat(trade?.NetPnL || '0');
  const pnlColor = pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  
  const entryPrice = trade?.Price ? parseFloat(trade.Price) : null;
  const quantity = trade?.Qty ? parseFloat(trade.Qty) : null;
  let netROI: number | null = null;
  // Use GrossPnl for cost basis if NetPnL is used for profit, and entryPrice and quantity are for single leg.
  // Or if Adjusted Cost is available, use that. For now, placeholder for ROI.
  const grossPnlForCost = trade?.GrossPnl ? parseFloat(trade.GrossPnl) : null;
  const costBasis = entryPrice && quantity ? Math.abs(entryPrice * quantity) : (grossPnlForCost ? Math.abs(grossPnlForCost - pnl) : null);

  if (pnl !== null && costBasis !== null && costBasis !== 0) {
      netROI = (pnl / costBasis) * 100;
  }

  const grossPnl = trade?.GrossPnl ? parseFloat(trade.GrossPnl) : (pnl !== null ? pnl + parseFloat(trade?.Comm || '0') : null) ;


  const renderStars = (currentRating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={cn(
            "h-5 w-5 cursor-pointer transition-colors",
            i <= currentRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/50 hover:text-yellow-300"
          )}
          onClick={() => setTradeRating(i)}
        />
      );
    }
    return <div className="flex">{stars}</div>;
  };

  const formatCurrencyDisplay = (value: string | number | null | undefined, addSign = false, defaultVal = 'N/A') => {
    if (value === null || value === undefined || value === '') return defaultVal;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return defaultVal;
    const sign = addSign ? (numValue >= 0 ? '+' : '-') : (numValue < 0 ? '-' : '');
    return `${sign}${mockSelectedCurrency.symbol}${Math.abs(numValue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };
  
  const formatPercentageDisplay = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    const sign = value >=0 ? '' : '-'; // Only show sign if negative for percentages usually, but image shows (34.46%)
    return `(${Math.abs(value).toFixed(2)}%)`; // Match image format
  }

  const displayTagSelection = (selectedIds: string[], allTags: {id: string, name: string}[], placeholder: string) => {
    if (selectedIds.length === 0) return placeholder;
    const selectedNames = selectedIds.map(id => allTags.find(tag => tag.id === id)?.name).filter(name => name);
    if (selectedNames.length === 0) return placeholder;
    // Show first tag and "+ X more" if too many for button width
    const firstTag = selectedNames[0];
    if (selectedNames.length > 1) {
        return `${firstTag}, +${selectedNames.length - 1}`;
    }
    return firstTag;
  }

  if (tradeDataLoading && !trade) { // Show skeleton only if trade is not yet loaded
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-1 h-fit min-h-[700px]" />
          <Skeleton className="md:col-span-2 h-[700px]" />
        </div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Trade Not Found</h1>
        <p className="text-muted-foreground mb-6">The trade you are looking for does not exist or could not be loaded.</p>
        <Button onClick={() => router.push('/notebook')} className="hover-effect">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notebook
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button onClick={() => router.push('/notebook')} variant="outline" size="sm" className="mb-6 hover-effect">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notebook
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 hover-effect">
          <Tabs defaultValue="stats" className="w-full">
            <CardHeader className="p-0 border-b">
              <TabsList className="grid w-full grid-cols-4 rounded-t-lg rounded-b-none h-12">
                <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
                <TabsTrigger value="playbook" className="text-xs">Playbook</TabsTrigger>
                <TabsTrigger value="executions" className="text-xs">Executions</TabsTrigger>
                <TabsTrigger value="attachments" className="text-xs">Attachments</TabsTrigger>
              </TabsList>
            </CardHeader>
            <TabsContent value="stats">
              <CardContent className="space-y-3 p-4 text-sm">
                <div className="flex items-center">
                    <div className={cn("w-1.5 h-12 mr-3 rounded-full", pnl >= 0 ? 'bg-green-500' : 'bg-red-500')}></div>
                    <div>
                        <Label className="text-xs text-muted-foreground">Net P&amp;L</Label>
                        <div className={`text-3xl font-bold ${pnlColor}`}>
                            {formatCurrencyDisplay(pnl)}
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Options Traded:</span> <span className="font-medium">{trade.Qty || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Commissions &amp; Fees:</span> <span className="font-medium">{formatCurrencyDisplay(trade.Comm, false, '$0.00')}</span></div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Net ROI:</span> 
                        <span className={cn("font-medium", netROI === null ? "" : (netROI >= 0 ? "text-green-600" : "text-red-500"))}>{netROI !== null ? formatPercentageDisplay(netROI) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Gross P&amp;L:</span> <span className="font-medium">{formatCurrencyDisplay(grossPnl)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Adjusted Cost:</span> <span className="font-medium">{formatCurrencyDisplay(61149.00)}</span></div> {/* Static as per image */}
                    
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-muted-foreground">Playbook:</span>
                        <Select value={selectedPlaybook} onValueChange={setSelectedPlaybook}>
                            <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Select Playbook" /></SelectTrigger>
                            <SelectContent>
                                {playbooks.map(pb => <SelectItem key={pb.id} value={pb.id}>{pb.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-1 pt-1">
                    <Label className="text-xs text-muted-foreground">Bady Scale</Label>
                    <Progress value={tradeRating * 20} className="h-1.5 bady-score-progress" /> 
                </div>
                 <div className="flex justify-between text-xs pt-1">
                     <span className="text-muted-foreground">MAE / MFE:</span> 
                     <div>
                        <span className="font-medium text-red-500">$11.05</span> / <span className="font-medium text-green-500">$23.25</span> {/* Static as per image */}
                     </div>
                 </div>
                
                <div className="pt-1">
                    <Label className="text-xs text-muted-foreground">Trade Rating</Label>
                    <div className="flex items-center mt-0.5">{renderStars(tradeRating)}</div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-1">
                    <div><Label htmlFor="profit-target" className="text-muted-foreground">Profit Target</Label><Input id="profit-target" value={profitTarget} onChange={(e) => setProfitTarget(e.target.value)} placeholder="$ 0.00" className="h-7 mt-0.5" /></div>
                    <div><Label htmlFor="stop-loss" className="text-muted-foreground">Stop Loss</Label><Input id="stop-loss" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="$ 0.00" className="h-7 mt-0.5"/></div>
                    <div><span className="text-muted-foreground">Initial Target:</span> <span className="font-medium">{formatCurrencyDisplay(12350.00)}</span></div> {/* Static */}
                    <div><span className="text-muted-foreground">Trade Risk:</span> <span className="font-medium">{formatCurrencyDisplay(-28000.00)}</span></div> {/* Static */}
                    <div><span className="text-muted-foreground">Planned R-Multiple:</span> <span className="font-medium">0.44R</span></div> {/* Static */}
                    <div><span className="text-muted-foreground">Realized R-Multiple:</span> <span className="font-medium text-red-500">-0.75R</span></div> {/* Static */}
                </div>
                
                <div className="space-y-2 pt-2 border-t mt-2">
                    <Label className="text-xs text-muted-foreground">Setups</Label>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs w-full mt-0.5 justify-between hover-effect text-left">
                                <span className="truncate">{displayTagSelection(selectedSetups, setups, "No set...")}</span>
                                <ChevronDown className="h-3 w-3 opacity-50 ml-1 flex-shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                            {setups.map(setup => (
                                <DropdownMenuCheckboxItem key={setup.id} checked={selectedSetups.includes(setup.id)} onCheckedChange={() => setSelectedSetups(prev => prev.includes(setup.id) ? prev.filter(id => id !== setup.id) : [...prev, setup.id])}>
                                    {setup.name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                     </DropdownMenu>
               
                    <Label className="text-xs text-muted-foreground">Mistakes</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button variant="outline" size="sm" className="h-7 text-xs w-full mt-0.5 justify-between hover-effect text-left">
                                <span className="truncate">{displayTagSelection(selectedMistakes, mistakes, "No mistakes...")}</span>
                                <ChevronDown className="h-3 w-3 opacity-50 ml-1 flex-shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                            {mistakes.map(mistake => (
                                <DropdownMenuCheckboxItem key={mistake.id} checked={selectedMistakes.includes(mistake.id)} onCheckedChange={() => setSelectedMistakes(prev => prev.includes(mistake.id) ? prev.filter(id => id !== mistake.id) : [...prev, mistake.id])}>
                                    {mistake.name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                     </DropdownMenu>
                
                    <Label className="text-xs text-muted-foreground">Custom</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button variant="outline" size="sm" className="h-7 text-xs w-full mt-0.5 justify-between hover-effect text-left">
                                <span className="truncate">{displayTagSelection(selectedCustomTags, customTags, "Add tags...")}</span>
                                <ChevronDown className="h-3 w-3 opacity-50 ml-1 flex-shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                             {customTags.map(tag => (
                                <DropdownMenuCheckboxItem key={tag.id} checked={selectedCustomTags.includes(tag.id)} onCheckedChange={() => setSelectedCustomTags(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}>
                                    {tag.name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                     </DropdownMenu>
                </div>
                <Button onClick={handleSaveTradeDetails} size="sm" className="w-full mt-4 hover-effect">Save Details</Button>
              </CardContent>
            </TabsContent>
            <TabsContent value="playbook" className="p-4 text-sm text-muted-foreground">Playbook details will be shown here. Select or create a playbook in the Stats tab.</TabsContent>
            <TabsContent value="executions" className="p-4 text-sm text-muted-foreground">Execution log (time &amp; sales) will be shown here if data is available.</TabsContent>
            <TabsContent value="attachments" className="p-4 text-sm text-muted-foreground">Attachments (e.g., screenshots of charts) will be listed here.</TabsContent>
          </Tabs>
        </Card>

        <div className="md:col-span-2 space-y-6">
             <TradingViewWidget symbol={trade.Symbol || 'NASDAQ:AAPL'} theme={theme === 'dark' ? 'dark' : 'light'} className="h-[400px]" />
            
            <RunningPnLChart 
              trade={trade} 
              allTrades={tradeData} 
              selectedCurrency={mockSelectedCurrency}
            /> 
        </div>
      </div>
    </div>
  );
}
