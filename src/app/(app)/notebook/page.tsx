'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  PlusCircle,
  Edit,
  Trash2,
  Save,
  X,
  Folder as FolderIcon,
  FileText,
  Tag as TagIcon,
  Link2,
  MoreHorizontal,
  ListFilter,
  Plus,
  Search,
  Undo,
  Redo,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Palette,
  Link as LinkIconExternal,
  List,
  ListOrdered,
  ListChecks,
  ImageIcon,
  Settings2,
  Trash,
  ChevronDown,
  ChevronRight,
  ChevronsLeftRight,
  Check,
} from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { Folder, Tag, Note, NoteContentBlock } from '@/types/notebook';
import { useTradeData } from '@/contexts/TradeDataContext';
import type { CsvTradeData } from '@/app/(app)/dashboard/page';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';


const initialFolders: Folder[] = [
  { id: 'all', name: 'All notes', icon: FileText },
  { id: 'tradenotes', name: 'Trade Notes', icon: FileText },
  { id: 'dailyjournal', name: 'Daily Journal', icon: FileText },
  { id: 'sessionsrecap', name: 'Sessions Recap', icon: FileText },
  { id: 'quarterlygoals', name: 'Quarterly Goals', icon: FolderIcon },
  { id: 'tradingplan', name: 'Trading Plan', icon: FolderIcon },
  { id: 'goalsplan', name: '2023 Goals + Plan', icon: FolderIcon },
  { id: 'actionplan', name: 'Plan of Action', icon: FolderIcon },
  { id: 'templates', name: 'Templates', icon: FolderIcon },
];

const initialTags: Tag[] = [
  { id: 'fomc', name: 'FOMC', color: 'bg-blue-500' },
  { id: 'equities', name: 'Equities', color: 'bg-green-500' },
  { id: 'futures', name: 'Futures', color: 'bg-purple-500' },
];

import { useLanguage } from '@/contexts/LanguageContext';

export default function NotebookPage() {
  const { t } = useLanguage();
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isLinkingTrade, setIsLinkingTrade] = useState(false);
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);
  const [isNewNoteDialogOpen, setIsNewNoteDialogOpen] = useState(false);
  const [tradeSearchTerm, setTradeSearchTerm] = useState('');

  const { tradeData } = useTradeData();

  useEffect(() => {
    const storedNotes = localStorage.getItem('badytrades_notes_v2');
    if (storedNotes) {
      try {
        const parsedNotes = JSON.parse(storedNotes).map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
          content: Array.isArray(note.content) ? note.content : [{ type: 'paragraph', children: [{ text: note.content || '' }] }]
        }));
        setNotes(parsedNotes);
      } catch (error) {
        console.error("Failed to parse notes from local storage:", error);
        setNotes([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('badytrades_notes_v2', JSON.stringify(notes));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let folderFilteredNotes = notes;
    if (selectedFolderId === 'tradenotes') {
      folderFilteredNotes = notes.filter(note => !!note.linkedTradeId);
    } else if (selectedFolderId !== 'all') {
      folderFilteredNotes = notes.filter(note => note.folderId === selectedFolderId);
    }

    return folderFilteredNotes.filter(note => {
      const tagMatch = selectedTagIds.length === 0 || selectedTagIds.every(tagId => note.tagIds?.includes(tagId));
      return tagMatch;
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [notes, selectedFolderId, selectedTagIds]);

  const handleAddFolder = () => {
    const folderName = prompt("Enter folder name:");
    if (folderName) {
      setFolders([...folders, { id: crypto.randomUUID(), name: folderName, icon: FolderIcon }]);
    }
  };

  const handleCreateEmptyNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: t('Untitled Note'),
      content: [{ type: 'paragraph', children: [{ text: t('Start writing...') }] }],
      createdAt: new Date(),
      updatedAt: new Date(),
      folderId: selectedFolderId === 'all' || !folders.find(f => f.id === selectedFolderId) ? undefined : selectedFolderId,
      tagIds: [],
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setEditingNote({ ...newNote });
    setIsNewNoteDialogOpen(false);
  };

  const handleCreateNoteFromTrade = (trade: CsvTradeData) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: `${trade.Symbol || 'Trade'} : ${trade.Date || new Date().toLocaleDateString()}`,
      content: [{ type: 'paragraph', children: [{ text: `Notes for trade ${trade.Symbol} on ${trade.Date}...` }] }],
      createdAt: new Date(),
      updatedAt: new Date(),
      folderId: 'tradenotes', // Automatically put in Trade Notes
      tagIds: [],
      linkedTradeId: trade.id as string,
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setEditingNote({ ...newNote });
    setIsNewNoteDialogOpen(false);
    setSelectedFolderId('tradenotes'); // Switch to trade notes folder
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setEditingNote({ ...note });
  };

  const handleSaveNote = () => {
    if (editingNote && selectedNote) {
      const updatedNote: Note = {
        ...selectedNote,
        title: editingNote.title || selectedNote.title,
        content: editingNote.content || selectedNote.content,
        tagIds: editingNote.tagIds || selectedNote.tagIds,
        folderId: editingNote.folderId || selectedNote.folderId,
        updatedAt: new Date(),
      };
      setNotes(notes.map(n => (n.id === updatedNote.id ? updatedNote : n)));
      setSelectedNote(updatedNote);
      setEditingNote(null);
    }
  };

  const handleCancelEdit = () => {
    if(selectedNote) setEditingNote({...selectedNote});
    else setEditingNote(null);
  }

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setEditingNote(null);
    }
  };

  const handleLinkTrade = (trade: CsvTradeData) => {
    if (selectedNote) {
      const updatedNote = {
        ...selectedNote,
        linkedTradeId: trade.id as string,
        updatedAt: new Date(),
        folderId: 'tradenotes' // Move to tradenotes folder
      };
      // Auto-set title if it's 'Untitled Note'
      if (updatedNote.title === t('Untitled Note') || !updatedNote.title) {
        updatedNote.title = `${trade.Symbol || 'Trade'} : ${trade.Date || new Date().toLocaleDateString()}`;
      }
      setNotes(notes.map(n => (n.id === updatedNote.id ? updatedNote : n)));
      setSelectedNote(updatedNote);
      if(editingNote) setEditingNote(updatedNote);
      setIsLinkingTrade(false);
      if (selectedFolderId !== 'tradenotes' && selectedFolderId !== 'all') setSelectedFolderId('tradenotes');
    }
  };

  const selectedTradeDetails = useMemo(() => {
    if (selectedNote?.linkedTradeId) {
      return tradeData.find(trade => String(trade.id) === String(selectedNote.linkedTradeId));
    }
    return null;
  }, [selectedNote, tradeData]);

  const renderNoteContent = (content: NoteContentBlock[]) => {
    if (!Array.isArray(content)) return '';
    return content.map((block, index) => {
      if (block.type === 'paragraph') {
        return block.children.map(child => child.text).join('');
      }
      return '';
    }).join('\n\n');
  };

  const toggleTagForNote = (tagId: string) => {
    if (editingNote) {
      const currentTags = editingNote.tagIds || [];
      const newTags = currentTags.includes(tagId)
        ? currentTags.filter(id => id !== tagId)
        : [...currentTags, tagId];
      setEditingNote(prev => ({ ...prev, tagIds: newTags }));
    }
  };

  const filteredTradeDataForDialog = useMemo(() => {
    if (!tradeSearchTerm) return tradeData;
    const lowerSearchTerm = tradeSearchTerm.toLowerCase();
    return tradeData.filter(trade => {
      const symbolMatch = trade.Symbol?.toLowerCase().includes(lowerSearchTerm);
      const dateMatch = trade.Date?.includes(tradeSearchTerm);
      const pnl = parseFloat(trade.NetPnL || '0');
      const pnlMatch =
        (lowerSearchTerm === 'win' && pnl > 0) ||
        (lowerSearchTerm === 'loss' && pnl < 0) ||
        String(pnl).includes(lowerSearchTerm);
      return symbolMatch || dateMatch || pnlMatch;
    });
  }, [tradeData, tradeSearchTerm]);


  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] gap-2 p-2 bg-background">
      {/* Left Column: Folders & Tags */}
      <Card className="w-60 flex-shrink-0 flex flex-col border-r">
        <CardHeader className="p-3">
          <Button onClick={handleAddFolder} variant="outline" size="sm" className="w-full hover-effect">
            <Plus className="mr-2 h-4 w-4" /> {t('Add folder')}
          </Button>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="p-3 space-y-3">
            <div>
              <Button variant="ghost" size="sm" className="w-full justify-between px-2 text-xs font-semibold text-muted-foreground mb-1" onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}>
                {t('FOLDERS')} {isFoldersExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              {isFoldersExpanded && folders.map(folder => (
                <Button
                  key={folder.id}
                  variant={selectedFolderId === folder.id ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start h-8 pl-2 pr-1 text-sm hover-effect"
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <folder.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate flex-1">{t(folder.name)}</span>
                </Button>
              ))}
            </div>
            <div>
              <Button variant="ghost" size="sm" className="w-full justify-between px-2 text-xs font-semibold text-muted-foreground mb-1" onClick={() => setIsTagsExpanded(!isTagsExpanded)}>
                {t('TAGS')} {isTagsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              {isTagsExpanded && tags.map(tag => (
                <Button
                  key={tag.id}
                  variant={selectedTagIds.includes(tag.id) ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start h-8 pl-2 pr-1 text-sm hover-effect"
                  onClick={() => {
                    setSelectedTagIds(prev =>
                      prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                    );
                  }}
                >
                  <div className={cn("w-2 h-2 rounded-full mr-2 flex-shrink-0", tag.color)} />
                  <span className="truncate flex-1">{t(tag.name)}</span>
                  <Badge variant="secondary" className="ml-auto text-xs h-5">
                    {notes.filter(n => n.tagIds?.includes(tag.id)).length}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </ScrollArea>
        <CardFooter className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start h-8 pl-2 text-sm hover-effect">
            <Trash2 className="mr-2 h-4 w-4" /> {t('Recently Deleted')}
          </Button>
        </CardFooter>
      </Card>

      {/* Middle Column: Notes List */}
      <Card className="w-72 flex-shrink-0 flex flex-col">
        <CardHeader className="p-3 flex flex-row items-center justify-between border-b">
          <Dialog open={isNewNoteDialogOpen} onOpenChange={setIsNewNoteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="h-8 hover-effect">
                <FileText className="mr-2 h-4 w-4" /> {t('New note')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>{t('Create New Note')}</DialogTitle>
                <DialogDescription>{t('Choose how you want to start your new note.')}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Button onClick={handleCreateEmptyNote} variant="outline" className="w-full justify-start hover-effect">
                  <FileText className="mr-2 h-4 w-4" /> {t('Create Empty Note')}
                </Button>
                <Separator />
                <h3 className="text-md font-semibold">{t('Create from Trade History')}</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('Search trades by symbol, date, P&L (e.g. win/loss)...')}
                    value={tradeSearchTerm}
                    onChange={(e) => setTradeSearchTerm(e.target.value)}
                    className="pl-8 w-full hover-effect"
                  />
                </div>
                <ScrollArea className="h-[300px] w-full rounded-md border p-2">
                  {filteredTradeDataForDialog.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('No trades found or matching search.')}</p>}
                  {filteredTradeDataForDialog.map(trade => (
                    <div
                      key={trade.id}
                      className="p-2 mb-2 border rounded-md hover:bg-accent cursor-pointer flex justify-between items-center hover-effect"
                      onClick={() => handleCreateNoteFromTrade(trade)}
                    >
                      <div>
                        <p className="font-medium text-sm">{trade.Symbol || 'N/A'} - <span className="text-xs text-muted-foreground">{trade.Date}</span></p>
                        <p className={cn("text-xs", parseFloat(trade.NetPnL!) >= 0 ? 'text-green-600' : 'text-red-600')}>
                          P&amp;L: {parseFloat(trade.NetPnL!).toFixed(2)}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80">Select</Button>
                    </div>
                  ))}
                </ScrollArea>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" className="hover-effect">{t('Cancel')}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-1">
            <Checkbox id="select-all-notes" className="h-4 w-4" />
            <Label htmlFor="select-all-notes" className="text-xs font-normal">{t('Select All')}</Label>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect">
              <ListFilter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="p-1 space-y-1">
            {filteredNotes.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">{t('No notes found.')}</p>}
            {filteredNotes.map(note => {
              const linkedTrade = note.linkedTradeId ? tradeData.find(t => String(t.id) === String(note.linkedTradeId)) : null;
              const displayTitle = note.title || (linkedTrade ? `${linkedTrade.Symbol || 'Trade'} : ${linkedTrade.Date || new Date(note.createdAt).toLocaleDateString()}` : t('Untitled Note'));
              return (
                <Button
                  key={note.id}
                  variant={selectedNote?.id === note.id ? 'secondary' : 'ghost'}
                  className={cn(
                    "w-full h-auto py-2 px-3 text-left flex flex-col items-start hover-effect rounded-md",
                    selectedNote?.id === note.id && "bg-primary/10 dark:bg-primary/20"
                  )}
                  onClick={() => handleSelectNote(note)}
                >
                  <span className="font-medium text-sm truncate w-full mb-0.5">{displayTitle}</span>
                  {linkedTrade && linkedTrade.NetPnL && (
                    <span className={cn(
                      "text-xs font-semibold",
                      parseFloat(linkedTrade.NetPnL) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      NET P&amp;L: {parseFloat(linkedTrade.NetPnL).toFixed(2)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString()}</span>
                </Button>
              );
            })}
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Right Column: Note Editor/Viewer */}
      <Card className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            <CardHeader className="p-3 border-b">
              <div className="flex items-center justify-between">
                {editingNote ? (
                  <Input
                    value={editingNote.title || ''}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('Note Title')}
                    className="text-lg font-semibold flex-1 h-9 mr-2 border-0 shadow-none focus-visible:ring-0 pl-1"
                  />
                ) : (
                  <CardTitle className="text-lg flex-1 truncate pl-1">{selectedNote.title || t('Untitled Note')}</CardTitle>
                )}
                <div className="flex items-center gap-1">
                   {editingNote ? (
                    <>
                      <Button size="sm" onClick={handleSaveNote} title={t("Save")} className="h-8 hover-effect"><Save className="h-4 w-4 mr-1" /> {t('Save')}</Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit} title={t("Cancel")} className="h-8 hover-effect"><X className="h-4 w-4 mr-1" /> {t('Cancel')}</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditingNote({...selectedNote})} title={t("Edit")} className="h-8 hover-effect"><Edit className="h-4 w-4 mr-1" /> {t('Edit')}</Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover-effect"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsLinkingTrade(true)} className="hover-effect">
                        <Link2 className="mr-2 h-4 w-4" /> {selectedNote.linkedTradeId ? t('Change Linked Trade') : t('Link Trade')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive hover-effect">
                            <Trash2 className="mr-2 h-4 w-4" /> {t('Delete Note')}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('This action cannot be undone. This will permanently delete the note "')}{selectedNote.title || t('Untitled Note')}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="hover-effect">{t('Cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteNote(selectedNote.id)} className="bg-destructive hover:bg-destructive/90 hover-effect">
                              {t('Delete Permanently')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1 pl-1">
                {t('Created')}: {new Date(selectedNote.createdAt).toLocaleString()} | {t('Updated')}: {new Date(selectedNote.updatedAt).toLocaleString()}
              </div>

              {selectedTradeDetails && (
                <div className="mt-2 p-3 border rounded-md bg-muted/30">
                  <div className="flex justify-between items-start">
                    <div>
                       <h4 className="text-base font-semibold mb-0.5">{t('Net P&L')}: <span className={parseFloat(selectedTradeDetails.NetPnL!) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{parseFloat(selectedTradeDetails.NetPnL!).toFixed(2)}</span></h4>
                    </div>
                    <Link href={`/notebook/tracking/${selectedTradeDetails.id}`} passHref legacyBehavior>
                      <Button asChild variant="default" size="sm" className="h-8 hover-effect"><a>{t('View Trade Details')}</a></Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-1 text-xs mt-2">
                    <div><span className="text-muted-foreground">{t('Contracts Traded')}:</span> <span className="font-medium">{selectedTradeDetails.Qty || 'N/A'}</span></div>
                    <div><span className="text-muted-foreground">{t('Volume')}:</span> <span className="font-medium">N/A</span></div> {/* Volume might not be in CSV */}
                    <div><span className="text-muted-foreground">{t('Commissions')}:</span> <span className="font-medium">{selectedTradeDetails.Comm || '$0.00'}</span></div>
                    <div><span className="text-muted-foreground">{t('Net ROI')}:</span> <span className="font-medium">N/A</span></div> {/* ROI might not be in CSV */}
                    <div><span className="text-muted-foreground">{t('Gross P&L')}:</span> <span className="font-medium">{selectedTradeDetails.GrossPnl || selectedTradeDetails.NetPnL || 'N/A'}</span></div>
                  </div>
                </div>
              )}

              {editingNote && (
                 <div className="mt-3 flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs hover-effect">
                            <TagIcon className="mr-2 h-3 w-3" />
                            {t('Add Tag')} ({editingNote.tagIds?.length || 0})
                            <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                        {tags.map(tag => (
                            <DropdownMenuItem key={tag.id} onClick={() => toggleTagForNote(tag.id)} className="text-xs">
                            <div className={cn("w-2 h-2 rounded-full mr-2", tag.color)} />
                            {t(tag.name)}
                            {editingNote.tagIds?.includes(tag.id) && <Check className="ml-auto h-3 w-3" />}
                            </DropdownMenuItem>
                        ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
              )}
            </CardHeader>

            {editingNote && (
              <div className="p-2 border-b flex flex-wrap items-center gap-0.5 text-sm bg-muted/50">
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Undo"><Undo className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Redo"><Redo className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" className="h-7 px-2 text-xs hover-effect">T <ChevronDown className="ml-1 h-3 w-3" /></Button>
                <Button variant="ghost" className="h-7 px-2 text-xs hover-effect">Arial <ChevronDown className="ml-1 h-3 w-3" /></Button>
                <Button variant="ghost" className="h-7 px-2 text-xs hover-effect">15px <ChevronDown className="ml-1 h-3 w-3" /></Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Bold"><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Italic"><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Underline"><Underline className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Strikethrough"><Strikethrough className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Text Color"><Palette className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Highlight Color"><Palette className="h-4 w-4" style={{transform: 'rotate(90deg)'}} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Code"><Code className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Link"><LinkIconExternal className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Image"><ImageIcon className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Align Left"><AlignLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Align Center"><AlignCenter className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Align Right"><AlignRight className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Bulleted List"><List className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Numbered List"><ListOrdered className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" title="Checklist"><ListChecks className="h-4 w-4" /></Button>
              </div>
            )}

            <CardContent className="flex-1 overflow-y-auto p-4">
              {editingNote ? (
                 <Textarea
                   value={editingNote.content ? renderNoteContent(editingNote.content) : ''}
                   onChange={(e) => setEditingNote(prev => ({ ...prev, content: [{ type: 'paragraph', children: [{ text: e.target.value }] }] }))}
                   placeholder={t('Jot down your notes...')}
                   className="h-full w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-1 text-base"
                 />
               ) : (
                 <div className="prose dark:prose-invert max-w-none p-1">
                   {selectedNote.content && selectedNote.content.length > 0 && selectedNote.content[0].children[0].text === t('Start writing...') ? (
                      <p className="text-muted-foreground italic text-sm">{t('Start writing...')}</p>
                   ) : (
                      <ReactMarkdown>{selectedNote.content ? renderNoteContent(selectedNote.content) : ''}</ReactMarkdown>
                   )}
                 </div>
               )}
            </CardContent>

            <CardFooter className="p-2 border-t flex items-center justify-between min-h-[57px]">
                <div className="text-xs text-muted-foreground">{t('Recently used template: ')}{t('Pre-Market & Post-Session')}</div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs hover-effect"><Plus className="mr-1.5 h-4 w-4" /> {t('Add Template')}</Button>
                    <Button variant="default" size="sm" className="h-8 text-xs hover-effect">{t('Use Template')}</Button>
                </div>
            </CardFooter>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('Select a note to view or add a new one.')}</p>
          </div>
        )}
      </Card>

      {/* Link Trade Modal */}
      {isLinkingTrade && selectedNote && (
        <AlertDialog open={isLinkingTrade} onOpenChange={setIsLinkingTrade}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('Link Trade to "')}{selectedNote.title}"</AlertDialogTitle>
              <AlertDialogDescription>{t('Select a trade from your history to link to this note.')}</AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-2">
                {tradeData.length === 0 && <p className="text-sm text-muted-foreground">{t('No trades available to link. Upload trades in the Dashboard or Trades page.')}</p>}
                {tradeData.map(trade => (
                  <div key={trade.id} className="p-2 border rounded-md hover:bg-accent flex justify-between items-center">
                    <div>
                      <p className="font-medium">{trade.Symbol} - <span className="text-xs text-muted-foreground">{trade.Date}</span></p>
                      <p className={cn("text-sm", parseFloat(trade.NetPnL!) >= 0 ? 'text-green-600' : 'text-red-600')}>
                        P&amp;L: {parseFloat(trade.NetPnL!).toFixed(2)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleLinkTrade(trade)} className="hover-effect">Link</Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <AlertDialogFooter>
              <AlertDialogCancel className="hover-effect">{t('Cancel')}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
