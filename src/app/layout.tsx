

import type {Metadata} from 'next';
import {GeistSans} from 'geist/font/sans'; // Import GeistSans
import {GeistMono} from 'geist/font/mono'; // Import GeistMono
import './globals.css';
import {ThemeProvider} from '@/components/theme-provider';
import {Toaster} from '@/components/ui/toaster'; // Import Toaster
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider

// Removed individual font definitions as they are directly imported

export const metadata: Metadata = {
  title: 'BadyTrades',
  description: 'Your comprehensive digital trading journal and analytics platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Apply font variables to the html tag
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      {/* Removed font variables from body className */}
      <body className={`antialiased font-sans`}>
        <AuthProvider> {/* Wrap with AuthProvider */}
          <ThemeProvider
            attribute="class"
            defaultTheme="system" // Keep system default
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster /> {/* Add Toaster here */}
          </ThemeProvider>
        </AuthProvider> {/* Close AuthProvider */}
      </body>
    </html>
  );
}
