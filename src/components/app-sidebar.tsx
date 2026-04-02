
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
  RotateCw, // Changed from ArrowAround
  Users, // Changed from PersonBoard
  GraduationCap,
  Menu,
  UserCircle, // Added UserCircle icon
  Settings, // Added Settings icon
  LogOut, // Added LogOut icon
  PlusCircle, // Added PlusCircle for add account action
  Check, // Added Check icon for active account
  Replace, // Use Replace icon for switching accounts
  Target, // Added Target icon for Tracking
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { auth } from '@/lib/firebase/clientApp'; // Import Firebase auth instance
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar
import { BadyTradesLogo } from '@/components/icons/badytrades-logo';
import { BadyTradesMarkLogo } from '@/components/icons/badytrades-mark-logo'; // Import the new mark logo


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
  { href: '/tracking', label: 'Tracking', icon: Target }, // Added Tracking page
  { href: '/playbooks', label: 'Playbooks', icon: ClipboardList },
  { href: '/progress-tracker', label: 'Progress Tracker', icon: TrendingUp },
  { href: '/trade-replay', label: 'Trade Replay', icon: PlayCircle },
  { href: '/resource-center', label: 'Resource Center', icon: Library },
];

const bottomNavItems = [
    { href: '/profile', label: 'Profile', icon: UserCircle },
    { href: '/settings', label: 'Settings', icon: Settings },
];

interface Account {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    isActive: boolean;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state: sidebarState, open: sidebarOpen } = useSidebar(); // Added sidebarOpen
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const storedAccounts = localStorage.getItem('badytrades_accounts');
    const storedActiveId = localStorage.getItem('badytrades_active_account_id');
    let initialAccounts: Account[] = [];

    if (storedAccounts) {
        try {
            initialAccounts = JSON.parse(storedAccounts);
        } catch (e) {
            console.error("Failed to parse stored accounts", e);
            initialAccounts = [];
        }
    }

    if (user && !initialAccounts.some(acc => acc.id === user.uid)) {
        initialAccounts.push({
            id: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isActive: false, // Will be set correctly below
        });
    }
    
    // Determine the active account
    let currentActiveId = storedActiveId;
    // If no stored active ID, or stored ID is not in current user list, default to current Firebase user
    if (user && (!storedActiveId || !initialAccounts.some(acc => acc.id === storedActiveId))) {
       currentActiveId = user.uid;
    } else if (!user && storedActiveId && !initialAccounts.some(acc => acc.id === storedActiveId)){
        // If no firebase user and stored ID is invalid, clear it
        currentActiveId = null;
    } else if (!user && !storedActiveId && initialAccounts.length > 0){
        // If no firebase user, no stored ID, but accounts exist, make the first one active (edge case)
        currentActiveId = initialAccounts[0].id;
    }


     initialAccounts = initialAccounts.map(acc => ({
       ...acc,
       isActive: acc.id === currentActiveId,
     }));

    setAccounts(initialAccounts);
    setActiveAccountId(currentActiveId);

    // Persist to localStorage
    localStorage.setItem('badytrades_accounts', JSON.stringify(initialAccounts));
    if (currentActiveId) {
        localStorage.setItem('badytrades_active_account_id', currentActiveId);
    } else {
        localStorage.removeItem('badytrades_active_account_id');
    }

  }, [user]); // Rerun when Firebase user changes

  const activeAccount = accounts.find(acc => acc.id === activeAccountId);

  const handleLogout = async () => {
    if (!activeAccountId) return; // No active account to log out from
    const currentActiveAccount = accounts.find(acc => acc.id === activeAccountId);

    try {
      await signOut(auth); // Sign out from Firebase
      
      // Remove the logged-out account from the list
      const remainingAccounts = accounts.filter(acc => acc.id !== activeAccountId);
      let nextActiveId: string | null = null;

      if (remainingAccounts.length > 0) {
          // If there are other accounts, make the first one active
          nextActiveId = remainingAccounts[0].id;
          remainingAccounts[0].isActive = true; 
      }
      
      setAccounts(remainingAccounts);
      setActiveAccountId(nextActiveId);
      localStorage.setItem('badytrades_accounts', JSON.stringify(remainingAccounts));

       if (nextActiveId) {
           localStorage.setItem('badytrades_active_account_id', nextActiveId);
           toast({
               title: 'Logged Out & Switched',
               description: `Signed out of ${currentActiveAccount?.email}. Please log in with ${remainingAccounts[0].email} to continue.`,
               duration: 7000,
           });
           // Redirect to login for the next active account
           router.push('/login'); 
       } else {
           // No accounts left, fully logged out
           localStorage.removeItem('badytrades_active_account_id');
           toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
           if (isMobile) setOpenMobile(false);
           router.push('/login'); // Redirect to login page after full logout
       }
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddAccountClick = () => {
      // Intention is to add a new account, so go to login page.
      // The login page should handle if a user tries to log in with an existing linked account or a new one.
      router.push('/login?addAccount=true'); // `addAccount` query param can hint the login page behavior
      if (isMobile) setOpenMobile(false);
  }

  const handleSwitchAccount = async (accountId: string) => {
      if (activeAccountId === accountId) {
          toast({ title: 'Switch Account', description: 'This is already the active account.' });
          return;
      }
      // Sign out current Firebase user *before* switching context
      try {
        if (auth.currentUser) { 
            await signOut(auth);
        }
      } catch (error: any) {
        console.error("Error signing out current Firebase user before switch:", error);
        // Non-fatal, proceed with context switch but user might need to re-login for the target account
        toast({ title: 'Warning', description: 'Could not sign out previous session cleanly. You may need to log in again.', variant: 'default', duration: 6000 });
      }

      // Update local state and localStorage for active account
      const updatedAccounts = accounts.map(acc => ({ ...acc, isActive: acc.id === accountId }));
      const targetAccount = updatedAccounts.find(a => a.id === accountId);

      setAccounts(updatedAccounts);
      setActiveAccountId(accountId);
      localStorage.setItem('badytrades_accounts', JSON.stringify(updatedAccounts));
      localStorage.setItem('badytrades_active_account_id', accountId);

      toast({ title: 'Switching Account', description: `Please log in as ${targetAccount?.email || 'the selected account'}.` });
      router.push('/login'); // Redirect to login for the new active account
      if (isMobile) setOpenMobile(false);
  }

  const SidebarNav = ({ items }: { items: typeof leftNavItems | typeof rightNavItems | typeof bottomNavItems }) => (
     <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={item.label}
                className="hover-effect"
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {item.label}
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
           className="fixed top-4 left-4 z-50 md:hidden hover-effect"
           onClick={() => setOpenMobile(true)}
         >
           <Menu />
           <span className="sr-only">Open Sidebar</span>
         </Button>
       )}
       <Sidebar side="left" variant="sidebar" collapsible="icon">
          <SidebarHeader className="p-2 flex items-center justify-between">
            <Link href="/dashboard" passHref legacyBehavior>
                <a className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 hover:opacity-80 transition-opacity px-1">
                    {sidebarOpen ? (
                         <BadyTradesLogo className="h-6" />
                    ) : (
                        <BadyTradesMarkLogo className="h-6 w-6" /> 
                    )}
                </a>
            </Link>
          </SidebarHeader>
          <SidebarContent className="flex flex-row gap-0 p-0">
            <div className="flex flex-col items-center w-[--sidebar-width-icon] border-r bg-muted/40 p-2">
              <SidebarMenu className="flex-grow">
                {leftNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href} passHref legacyBehavior>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        className="hover-effect justify-center !p-2 !size-10"
                        variant="ghost"
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="sr-only">{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
               <div className={cn(
                   "flex flex-col items-center transition-opacity duration-200 ease-in-out",
                   sidebarState === 'expanded' ? "opacity-0 pointer-events-none h-0" : "opacity-100 delay-150" // Use sidebarState
               )}>
                  <Separator className="my-2 bg-border mx-auto w-3/4" />
                  <SidebarMenu>
                      {bottomNavItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <Link href={item.href} passHref legacyBehavior>
                            <SidebarMenuButton
                              isActive={pathname === item.href}
                              tooltip={item.label}
                              className="hover-effect justify-center !p-2 !size-10"
                              variant="ghost"
                              onClick={() => isMobile && setOpenMobile(false)}
                            >
                              <item.icon className="h-5 w-5" />
                              <span className="sr-only">{item.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                      {activeAccount && (
                          <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Logout Current Account"
                                className="hover-effect justify-center !p-2 !size-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                variant="ghost"
                                onClick={handleLogout}
                              >
                                <LogOut className="h-5 w-5" />
                                <span className="sr-only">Logout</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                      )}
                  </SidebarMenu>
               </div>
            </div>
            <div className="flex flex-col flex-1 p-2 overflow-y-auto">
               <SidebarNav items={rightNavItems} />
                <div className="mt-auto flex flex-col gap-1 group-data-[collapsible=icon]:hidden">
                    <Separator className="my-2 bg-border" />
                    <SidebarNav items={bottomNavItems} />
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <button
                                className="p-2 flex items-center gap-2 border-t mt-2 pt-3 w-full text-left rounded-md hover:bg-sidebar-accent hover-effect transition-colors"
                                aria-label="Account options"
                                disabled={loading}
                             >
                                {activeAccount ? (
                                    <>
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={activeAccount.photoURL || undefined} alt={activeAccount.displayName || activeAccount.email || 'User'} />
                                            <AvatarFallback>{activeAccount.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-xs truncate flex-1">
                                            <p className="font-medium">{activeAccount.displayName || activeAccount.email}</p>
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
                             <DropdownMenuLabel>My Accounts</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             {accounts.map((account) => (
                                <DropdownMenuItem
                                  key={account.id}
                                  onClick={() => handleSwitchAccount(account.id)}
                                  disabled={account.isActive && auth.currentUser?.uid === account.id} // Disable if active AND current Firebase user matches
                                  className="cursor-pointer flex items-center gap-2"
                                >
                                     <Avatar className="h-6 w-6">
                                         <AvatarImage src={account.photoURL || undefined} alt={account.displayName || account.email || 'User'} />
                                         <AvatarFallback>{account.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                                     </Avatar>
                                     <span className="truncate flex-1">{account.email}</span>
                                     {account.isActive && auth.currentUser?.uid === account.id && <Check className="ml-auto h-4 w-4 text-primary" />}
                                     {(!account.isActive || auth.currentUser?.uid !== account.id) && <Replace className="ml-auto h-4 w-4 text-muted-foreground" />}
                                </DropdownMenuItem>
                             ))}
                             {accounts.length === 0 && !loading && (
                                 <DropdownMenuItem disabled>No accounts linked</DropdownMenuItem>
                             )}
                              <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={handleAddAccountClick} className="cursor-pointer">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                <span>Add Account</span>
                             </DropdownMenuItem>
                              {activeAccount && auth.currentUser?.uid === activeAccount.id && ( // Only show logout if current Firebase user matches active account
                                 <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                                      <LogOut className="mr-2 h-4 w-4" />
                                      <span>Sign out {activeAccount.email}</span>
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

