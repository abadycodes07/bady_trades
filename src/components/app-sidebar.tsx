
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  BookOpen,
  Table,
  Notebook,
  BarChart3,
  ClipboardList,
  TrendingUp,
  PlayCircle,
  Library,
  Pencil,
  RotateCw,
  Users,
  GraduationCap,
  Menu,
  UserCircle,
  Settings,
  LogOut,
  PlusCircle,
  Plus,
  Check,
  Target,
  Newspaper,
  Bell,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  LineChart,
  BookMarked,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadyTradesLogo } from '@/components/icons/badytrades-logo';
import { BadyTradesMarkLogo } from '@/components/icons/badytrades-mark-logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTradeData } from '@/contexts/TradeDataContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Left column utility icons (Tradezilla-style: Journaling, Backtesting, Mentor, Academy)
const leftNavItems = [
  { href: '/journaling', label: 'Journaling', icon: Pencil },
  { href: '/backtesting', label: 'Backtesting', icon: RotateCw },
  { href: '/mentor-mode', label: 'Mentor Mode', icon: Users },
  { href: '/academy', label: 'Academy', icon: GraduationCap },
];

// Right column main navigation items (Tradezilla-style)
const rightNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trades', label: 'Day View', icon: CalendarCheck },
  { href: '/tracking', label: 'Trade View', icon: LineChart },
  { href: '/notebook', label: 'Notebook', icon: BookMarked },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/playbooks', label: 'Strategies', icon: ClipboardList },
  { href: '/trade-replay', label: 'Trade Replay', icon: PlayCircle },
  { href: '/progress-tracker', label: 'Progress Tracker', icon: TrendingUp },
  { href: '/resource-center', label: 'Resources', icon: Library },
  { href: '/news', label: 'News', icon: Newspaper },
];

interface NavIconButtonProps {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick?: () => void;
}

function NavIconButton({ href, label, icon: Icon, isActive, onClick }: NavIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href} passHref onClick={onClick}>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
              isActive
                ? "bg-indigo-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.4)]"
                : "text-muted-foreground/60 hover:bg-muted/20 hover:text-foreground"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-700 text-xs font-bold">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state: sidebarState, open: sidebarOpen, toggleSidebar } = useSidebar();
  const { user, loading, signOut: supabaseSignOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { isArabic, t } = useLanguage();
  const { accounts, selectedAccountId, setSelectedAccountId } = useTradeData();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabaseSignOut();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      if (isMobile) setOpenMobile(false);
      router.push('/login');
    } catch (error: any) {
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSwitchAccount = (accountId: string) => {
    if (selectedAccountId === accountId) return;
    setSelectedAccountId(accountId);
    const targetAccount = accounts.find(a => a.id === accountId);
    toast({ title: 'Account Switched', description: `Now viewing ${targetAccount?.name || 'portfolio'}.` });
    if (isMobile) setOpenMobile(false);
  };

  const activeAccount = accounts.find(acc => acc.id === selectedAccountId);
  const isCollapsed = !sidebarOpen;

  // ──────────────────────────────────────────
  // COLLAPSED SIDEBAR
  // ──────────────────────────────────────────
  if (isCollapsed && !isMobile) {
    return (
      <TooltipProvider delayDuration={100}>
        <div
          className={cn(
            "fixed left-0 top-0 h-screen z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          )}
          style={{ width: '88px' }}
        >
          {/* TOP SECTION (FULL WIDTH) */}
          <div className="flex flex-col items-center pt-3 pb-2 gap-3 border-b border-border w-full flex-shrink-0">
            {/* Logo + Collapse Button row */}
            <div className="flex items-center justify-between w-full px-2">
              <div className="h-8 w-8 flex items-center justify-center">
                <BadyTradesMarkLogo className="h-7 w-7 text-indigo-400" />
              </div>
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:bg-muted/20 hover:text-foreground transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Add Trade small button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="h-10 w-14 flex items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20"
                  onClick={() => {
                    const event = new CustomEvent('open-add-trade-dialog');
                    window.dispatchEvent(event);
                  }}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-700 text-xs font-bold">
                Add Trade
              </TooltipContent>
            </Tooltip>
          </div>

          {/* MIDDLE SECTION (TWO COLUMNS) */}
          <div className="flex flex-row flex-1 overflow-hidden w-full min-h-0">
            {/* LEFT UTILITY COLUMN */}
            <div className="flex flex-col items-center py-3 gap-1.5 w-1/2 border-r border-border flex-shrink-0 hide-scrollbar overflow-y-auto">
              {leftNavItems.map((item) => (
                <NavIconButton
                  key={item.href}
                  href={item.href}
                  label={t(item.label)}
                  icon={item.icon}
                  isActive={pathname === item.href}
                  onClick={() => isMobile && setOpenMobile(false)}
                />
              ))}
            </div>

            {/* RIGHT MAIN NAV COLUMN */}
            <div className="flex flex-col items-center py-3 gap-1.5 w-1/2 flex-shrink-0 hide-scrollbar overflow-y-auto w-[44px]">
              {rightNavItems.map((item) => (
                <NavIconButton
                  key={item.href}
                  href={item.href}
                  label={t(item.label)}
                  icon={item.icon}
                  isActive={pathname === item.href}
                  onClick={() => isMobile && setOpenMobile(false)}
                />
              ))}
            </div>
          </div>

          {/* BOTTOM SECTION (FULL WIDTH) */}
          <div className="flex flex-col items-center py-2 gap-1 border-t border-border mt-auto w-full flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground/50 hover:bg-muted/20 hover:text-foreground transition-all cursor-pointer">
                    <Trash2 className="h-[18px] w-[18px]" />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-700 text-xs font-bold">
                Settings
              </TooltipContent>
            </Tooltip>

            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground/50 hover:bg-muted/20 hover:text-foreground transition-all">
                      <Bell className="h-[18px] w-[18px]" />
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-700 text-xs font-bold">
                  Notifications
                </TooltipContent>
              </Tooltip>
              <PopoverContent side="right" className="w-72 bg-zinc-900 border-zinc-700 rounded-2xl p-4 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">Notifications</p>
                <p className="text-xs text-muted-foreground/50 text-center py-4">No new notifications</p>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground/50 hover:bg-indigo-600/20 hover:text-indigo-400 transition-all">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user?.user_metadata?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-indigo-600/20 text-indigo-400">
                          {user?.email?.[0]?.toUpperCase() ?? 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-700 text-xs font-bold">
                  Profile
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent className="w-56 mb-2 ml-2" side="right" align="end">
                <DropdownMenuLabel>My Portfolios</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accounts.map((account) => (
                  <DropdownMenuItem
                    key={account.id}
                    className="flex items-center justify-between group cursor-pointer"
                    onClick={() => handleSwitchAccount(account.id)}
                  >
                    <span className={cn("flex items-center gap-2", selectedAccountId === account.id && "text-indigo-500 font-bold")}>
                      {account.name}
                    </span>
                    {selectedAccountId === account.id && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}><UserCircle className="mr-2 h-4 w-4" /><span>Profile</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}><Settings className="mr-2 h-4 w-4" /><span>Settings</span></DropdownMenuItem>
                {user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" /><span>Sign out</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // ──────────────────────────────────────────
  // EXPANDED SIDEBAR
  // ──────────────────────────────────────────
  return (
    <>
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className={cn("fixed top-4 z-50 md:hidden hover-effect", isArabic ? "right-4" : "left-4")}
          onClick={() => setOpenMobile(true)}
        >
          <Menu />
          <span className="sr-only">Open Sidebar</span>
        </Button>
      )}

      <div 
        className={cn(
          "fixed top-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-300 h-screen",
          isArabic ? "right-0" : "left-0"
        )}
        style={{ width: '16rem' }}
      >
        <div className="p-4 flex flex-col gap-3 border-b border-border flex-shrink-0">
          {/* Logo + Collapse Button row */}
          <div className="flex items-center justify-between px-1">
            <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
                <div dir="ltr">
                  <BadyTradesLogo />
                </div>
            </Link>
            <button
              onClick={toggleSidebar}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:bg-muted/20 hover:text-foreground transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Add Trade button */}
          <Button
            variant="default"
            className="w-full bg-indigo-600/80 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-xl h-10 border border-indigo-400/20 shadow-[0_4px_24px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            onClick={() => {
              const event = new CustomEvent('open-add-trade-dialog');
              window.dispatchEvent(event);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>{t('Add Trade')}</span>
          </Button>
        </div>

        {/* MIDDLE SECTION */}
        <div className="flex flex-row flex-1 p-0 overflow-hidden min-h-0">
          {/* LEFT UTILITY COLUMN */}
          <div className="flex flex-col items-center py-3 gap-1 w-12 border-r border-border flex-shrink-0 hide-scrollbar overflow-y-auto">
            {leftNavItems.map((item) => (
              <TooltipProvider key={item.href} delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
                        pathname === item.href
                          ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                          : "text-muted-foreground/50 hover:bg-muted/20 hover:text-foreground"
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-700 text-xs font-bold">
                    {t(item.label)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          {/* RIGHT MAIN NAV COLUMN */}
          <div className="flex flex-col flex-1 hide-scrollbar overflow-y-auto py-2 px-2">
            <SidebarMenu className="gap-0.5">
              {rightNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    className={cn(
                      "h-9 rounded-xl px-3 gap-3 text-sm font-semibold transition-all hover-effect w-full",
                      pathname === item.href
                        ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                        : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/10"
                    )}
                    onClick={() => {
                      router.push(item.href);
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{t(item.label)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="p-2 border-t border-border flex-shrink-0 bg-sidebar/50">
          <Link href="/settings" onClick={() => isMobile && setOpenMobile(false)}>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-all cursor-pointer text-sm font-semibold mb-1">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </div>
          </Link>

          <Popover>
            <PopoverTrigger asChild>
              <button className="relative flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-all w-full text-sm font-semibold mb-1">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
                <span className="ml-auto h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-72 bg-zinc-900 border-zinc-700 rounded-2xl p-4 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">Notifications</p>
              <p className="text-xs text-muted-foreground/50 text-center py-4">No new notifications</p>
            </PopoverContent>
          </Popover>

          {/* Profile row */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/10 transition-all w-full text-left group border-t border-border mt-1 pt-3">
                {user ? (
                  <>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={user.user_metadata?.avatar_url || undefined} alt={user.user_metadata?.name || user.email || 'User'} />
                      <AvatarFallback className="bg-indigo-600/20 text-indigo-400 text-xs">
                        {user.email?.[0]?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-xs truncate flex-1 flex flex-col items-start">
                      <p className="font-bold text-foreground truncate">{activeAccount?.name || 'My Portfolio'}</p>
                      <p className="text-muted-foreground/60 text-[10px] truncate">{user.user_metadata?.name || user.email}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                  </>
                ) : loading ? (
                  <>
                    <Avatar className="h-8 w-8 flex-shrink-0 bg-muted" />
                    <div className="flex-1 space-y-1"><div className="h-3 w-20 bg-muted rounded" /></div>
                  </>
                ) : (
                  <>
                    <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback>?</AvatarFallback></Avatar>
                    <div className="text-xs truncate flex-1"><p className="font-medium">Not Logged In</p></div>
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2 ml-2" side="top" align="start">
              <DropdownMenuLabel>My Portfolios</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {accounts.map((account) => (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => handleSwitchAccount(account.id)}
                  disabled={selectedAccountId === account.id}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <span className="truncate flex-1">{account.name}</span>
                  {selectedAccountId === account.id && <Check className="ml-auto h-4 w-4 text-indigo-400" />}
                </DropdownMenuItem>
              ))}
              {accounts.length === 0 && !loading && (
                <DropdownMenuItem disabled>No portfolios found</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
                <UserCircle className="mr-2 h-4 w-4" /><span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" /><span>Settings</span>
              </DropdownMenuItem>
              {user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /><span>Sign out session</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
