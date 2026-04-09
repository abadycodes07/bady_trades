
'use client';

import React from 'react'; // Import React
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter
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
} from "@/components/ui/dropdown-menu"; // Import DropdownMenu components
import {
  LayoutDashboard,
  BookOpen,
  Table,
  Notebook,
  BarChart,
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
  Replace,
  Target,
  Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadyTradesLogo } from '@/components/icons/badytrades-logo';
import { BadyTradesMarkLogo } from '@/components/icons/badytrades-mark-logo';
import { useLanguage } from '@/contexts/LanguageContext';


const leftNavItems = [
  { href: '/journaling', label: 'Journaling', icon: Pencil },
  { href: '/backtesting', label: 'Backtesting', icon: RotateCw },
  { href: '/mentor-mode', label: 'Mentor Mode', icon: Users },
  { href: '/academy', label: 'Academy', icon: GraduationCap },
];

const rightNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trades', label: 'Trades', icon: Table },
  { href: '/notebook', label: 'Notebook', icon: Notebook },
  { href: '/reports', label: 'Reports', icon: BarChart },
  { href: '/tracking', label: 'Tracking', icon: Target },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/playbooks', label: 'Playbooks', icon: ClipboardList },
  { href: '/progress-tracker', label: 'Progress Tracker', icon: TrendingUp },
  { href: '/trade-replay', label: 'Trade Replay', icon: PlayCircle },
  { href: '/resource-center', label: 'Resource Center', icon: Library },
];

const bottomNavItems = [
    { href: '/profile', label: 'Profile', icon: UserCircle },
    { href: '/settings', label: 'Settings', icon: Settings },
];

import { useTradeData } from '@/contexts/TradeDataContext';

// We removed the custom Account interface as we now use TradingAccount

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state: sidebarState, open: sidebarOpen } = useSidebar();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { isArabic, t } = useLanguage();
  const { accounts, selectedAccountId, setSelectedAccountId } = useTradeData();

  // Alias signOut to supabaseSignOut since we already use useAuth
  const { signOut: supabaseSignOut } = useAuth();

  const handleLogout = async () => {
    try {
      await supabaseSignOut(); 
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      if (isMobile) setOpenMobile(false);
      router.push('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddAccountClick = () => {
      // Intention is to add a new trading account. Navigate to settings -> broker connection.
      router.push('/settings'); 
      if (isMobile) setOpenMobile(false);
  };

  const handleSwitchAccount = (accountId: string) => {
      if (selectedAccountId === accountId) return;
      setSelectedAccountId(accountId);
      
      const targetAccount = accounts.find(a => a.id === accountId);
      toast({ title: 'Account Switched', description: `Now viewing ${targetAccount?.name || 'portfolio'}.` });
      if (isMobile) setOpenMobile(false);
  };

  const activeAccount = accounts.find(acc => acc.id === selectedAccountId);

  const SidebarNav = ({ items }: { items: typeof leftNavItems | typeof rightNavItems | typeof bottomNavItems }) => (
     <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={t(item.label)}
                className="hover-effect"
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {t(item.label)}
                </span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
  );

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
       <Sidebar side={isArabic ? "right" : "left"} variant="sidebar" collapsible="icon" className="border-r border-border bg-sidebar overflow-hidden transition-[width] duration-300">
          <SidebarHeader className="p-4 flex flex-col gap-4">
            <Link href="/dashboard" passHref legacyBehavior>
                <a className="flex items-center gap-4 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:w-10 group-data-[state=collapsed]:h-10 hover:opacity-80 transition-opacity px-1">
                    <div dir="ltr" className="flex items-center">
                        {sidebarOpen ? (
                             <div className="w-auto min-w-[160px]">
                                <BadyTradesLogo />
                             </div>
                        ) : (
                             <BadyTradesMarkLogo className="h-7 w-7" /> 
                        )}
                    </div>
                </a>
            </Link>

            <div className="group-data-[collapsible=icon]:hidden px-1">
                <Button 
                    variant="default" 
                    className="w-full bg-indigo-600/60 hover:bg-indigo-500/80 text-white font-black uppercase tracking-widest rounded-xl h-11 border border-white/20 backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    onClick={() => {
                        const event = new CustomEvent('open-add-trade-dialog');
                        window.dispatchEvent(event);
                    }}
                >
                    <PlusCircle className="h-4 w-4" />
                    <span>{t('Add Trade')}</span>
                </Button>
            </div>
            
            <Button 
                variant="ghost" 
                size="icon" 
                className="hidden group-data-[collapsible=icon]:flex h-10 w-10 mx-auto rounded-xl bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all shadow-none"
                onClick={() => {
                    const event = new CustomEvent('open-add-trade-dialog');
                    window.dispatchEvent(event);
                }}
            >
                <PlusCircle className="h-5 w-5" />
            </Button>
          </SidebarHeader>
          <SidebarContent className="flex flex-row p-0 overflow-hidden bg-sidebar relative">
            {/* Main Navigation Column (Left/First Column) */}
              <SidebarMenu className={cn(
                  "w-full flex flex-col items-center gap-1",
                  !sidebarOpen ? "grid grid-cols-2 gap-x-2 gap-y-1 p-1" : "flex flex-col"
              )}>
                {!sidebarOpen ? (
                  <>
                    {/* Collapsed Mode: Custom 2-Column Logic */}
                    {/* Left Column (0, 2, 4...) Navigation Items */}
                    {/* Right Column (1, 3, 5...) Main Navigation */}
                    {leftNavItems.map((item, idx) => {
                      const RightIcon = rightNavItems[idx]?.icon;
                      return (
                        <React.Fragment key={item.href}>
                          {/* Utility Column (Left/Start) */}
                          <SidebarMenuItem className="flex justify-center order-first">
                            <Link href={item.href} passHref legacyBehavior>
                              <SidebarMenuButton
                                isActive={pathname === item.href}
                                tooltip={t(item.label)}
                                className="hover-effect justify-center !p-1 !size-11 rounded-xl"
                                variant="default"
                                onClick={() => isMobile && setOpenMobile(false)}
                              >
                                <item.icon className="h-6 w-6" />
                                <span className="sr-only">{t(item.label)}</span>
                              </SidebarMenuButton>
                            </Link>
                          </SidebarMenuItem>

                          {/* Main Column (Right/End) - Pairing with corresponding rightNav item if exists */}
                          {RightIcon && (
                            <SidebarMenuItem className="flex justify-center order-last">
                              <Link href={rightNavItems[idx].href} passHref legacyBehavior>
                                <SidebarMenuButton
                                  isActive={pathname === rightNavItems[idx].href}
                                  tooltip={t(rightNavItems[idx].label)}
                                  className="hover-effect justify-center !p-1 !size-11 rounded-xl"
                                  variant="default"
                                  onClick={() => isMobile && setOpenMobile(false)}
                                >
                                  <RightIcon className="h-6 w-6" />
                                  <span className="sr-only">{t(rightNavItems[idx].label)}</span>
                                </SidebarMenuButton>
                              </Link>
                            </SidebarMenuItem>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Remaining Right Items (if more than left items) */}
                    {rightNavItems.slice(leftNavItems.length).map((item) => (
                      <SidebarMenuItem key={item.href} className="flex justify-center col-start-2">
                        <Link href={item.href} passHref legacyBehavior>
                          <SidebarMenuButton
                            isActive={pathname === item.href}
                            tooltip={t(item.label)}
                            className="hover-effect justify-center !p-1 !size-11 rounded-xl"
                            variant="default"
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <item.icon className="h-6 w-6" />
                            <span className="sr-only">{t(item.label)}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    ))}

                    {/* Bottom Utility Items mapped to columns */}
                    {bottomNavItems.map((item, idx) => (
                      <SidebarMenuItem key={item.href} className={cn("flex justify-center", idx % 2 === 0 ? "col-start-1" : "col-start-2")}>
                        <Link href={item.href} passHref legacyBehavior>
                          <SidebarMenuButton
                            isActive={pathname === item.href}
                            tooltip={t(item.label)}
                            className="hover-effect justify-center !p-1 !size-11 rounded-xl"
                            variant="default"
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <item.icon className="h-6 w-6" />
                            <span className="sr-only">{t(item.label)}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    ))}

                    {/* Profile & Settings (Always in Right Column for alignment) */}
                    <SidebarMenuItem className="flex justify-center col-start-2">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                 <button className="!size-11 rounded-xl hover:bg-sidebar-accent flex items-center justify-center transition-all bg-indigo-500/10 dark:bg-indigo-500/20">
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={user?.user_metadata?.avatar_url || undefined} />
                                        <AvatarFallback className="text-[10px]">{user?.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                                    </Avatar>
                                 </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" side="right" align="end">
                                 <DropdownMenuLabel>My Portfolios</DropdownMenuLabel>
                                 <DropdownMenuSeparator />
                                 {accounts.map((account) => (
                                     <DropdownMenuItem
                                         key={account.id}
                                         className="flex items-center justify-between group"
                                         onClick={() => setSelectedAccountId(account.id)}
                                     >
                                         <span className={cn(
                                             "flex items-center gap-2",
                                             selectedAccountId === account.id && "text-indigo-500 font-bold"
                                         )}>
                                             {account.name}
                                         </span>
                                         <Settings className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                     </DropdownMenuItem>
                                 ))}
                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem onClick={() => {
                                     const event = new CustomEvent('open-add-account-dialog');
                                     window.dispatchEvent(event);
                                 }}>
                                     <Plus className="mr-2 h-4 w-4" />
                                     <span>Add Account</span>
                                 </DropdownMenuItem>
                             </DropdownMenuContent>
                         </DropdownMenu>
                    </SidebarMenuItem>

                    <SidebarMenuItem className="flex justify-center col-start-2">
                        <Link href="/settings" passHref legacyBehavior>
                          <SidebarMenuButton
                            isActive={pathname === '/settings'}
                            tooltip={t('Settings')}
                            className="hover-effect justify-center !p-1 !size-11 rounded-xl"
                            variant="default"
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <Settings className="h-6 w-6" />
                            <span className="sr-only">{t('Settings')}</span>
                          </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                  </>
                ) : (
                  <>
                    {/* Expanded Mode: Original Single List Layout */}
                    {leftNavItems.map((item) => (
                      <SidebarMenuItem key={item.href} className="w-full flex justify-center">
                        <Link href={item.href} passHref legacyBehavior>
                          <SidebarMenuButton
                            isActive={pathname === item.href}
                            tooltip={t(item.label)}
                            className="hover-effect justify-center !p-2 !size-10 rounded-xl"
                            variant="default"
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <item.icon className="h-5 w-5" />
                            <span className="sr-only">{t(item.label)}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                  </>
                )}
              </SidebarMenu>

            {/* Expanded Right Column (Only visible when open) */}
            <div className={cn(
                "flex flex-col flex-1 p-2 overflow-y-auto bg-sidebar border-t border-border md:border-t-0 transition-all min-w-0 h-full",
                !sidebarOpen && "hidden"
            )}>
               <SidebarNav items={rightNavItems} />
                <div className="mt-auto flex flex-col gap-1">
                    <Separator className="my-2 bg-border" />
                    <SidebarNav items={bottomNavItems} />
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <button
                                className="p-2 flex items-center gap-2 border-t mt-2 pt-3 w-full text-left rounded-md hover:bg-sidebar-accent hover-effect transition-colors"
                                aria-label="Account options"
                                disabled={loading}
                             >
                                {user ? (
                                    <>
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={user.user_metadata?.avatar_url || undefined} alt={user.user_metadata?.name || user.email || 'User'} />
                                            <AvatarFallback>{user.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-xs truncate flex-1 flex flex-col items-start gap-0.5">
                                            <p className="font-semibold text-primary">{activeAccount?.name || 'Loading Portfolio...'}</p>
                                            <p className="font-medium text-muted-foreground opacity-80 text-[10px]">{user.user_metadata?.name || user.email}</p>
                                        </div>
                                    </>
                                ) : loading ? (
                                     <>
                                         <Avatar className="h-8 w-8 flex-shrink-0 bg-muted" />
                                         <div className="flex-1 space-y-1">
                                             <div className="h-3 w-20 bg-muted rounded" />
                                         </div>
                                     </>
                                ) : (
                                     <>
                                         <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarFallback>?</AvatarFallback>
                                         </Avatar>
                                         <div className="text-xs truncate flex-1">
                                            <p className="font-medium">Not Logged In</p>
                                         </div>
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
                                     {selectedAccountId === account.id && <Check className="ml-auto h-4 w-4 text-primary" />}
                                </DropdownMenuItem>
                             ))}
                             {accounts.length === 0 && !loading && (
                                 <DropdownMenuItem disabled>No portfolios found</DropdownMenuItem>
                             )}
                              <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={handleAddAccountClick} className="cursor-pointer">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                <span>Add Portfolio</span>
                             </DropdownMenuItem>
                              {user && ( 
                                 <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                                      <LogOut className="mr-2 h-4 w-4" />
                                      <span>Sign out session</span>
                                    </DropdownMenuItem>
                                 </>
                              )}
                         </DropdownMenuContent>
                     </DropdownMenu>
                </div>
            </div>
          </SidebarContent>
           <SidebarFooter className="p-2 border-t h-0 overflow-hidden">
           </SidebarFooter>
        </Sidebar>
     </>
  );
}

