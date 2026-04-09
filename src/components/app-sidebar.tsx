
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
                <a className="flex items-center gap-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 hover:opacity-80 transition-opacity px-1">
                    {sidebarOpen ? (
                         <BadyTradesLogo />
                    ) : (
                         <BadyTradesMarkLogo className="h-6 w-6" /> 
                    )}
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
            <div className={cn(
                "flex flex-col items-center bg-sidebar transition-all duration-300",
                sidebarOpen ? "w-[--sidebar-width-icon] border-r border-border/50 p-2" : "w-full p-2"
            )}>
              <SidebarMenu className="space-y-1 w-full flex flex-col items-center">
                {/* Always show Left Nav Items */}
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

                {/* In collapsed mode, also show Right Nav Items here in a grid or stack */}
                {!sidebarOpen && (
                    <>
                        <Separator className="my-2 bg-border/40 w-8 mx-auto" />
                        {rightNavItems.map((item) => (
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
                        <Separator className="my-2 bg-border/40 w-8 mx-auto" />
                        {bottomNavItems.map((item) => (
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
            </div>

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

