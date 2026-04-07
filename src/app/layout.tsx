

import type {Metadata} from 'next';
import {GeistSans} from 'geist/font/sans';
import {GeistMono} from 'geist/font/mono';
import { Cairo } from 'next/font/google'; // Import Cairo for Arabic
import './globals.css';
import {ThemeProvider} from '@/components/theme-provider';
import {Toaster} from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://badytrades-production.up.railway.app'),
  title: 'BadyTrades Dashboard',
  description: 'Your comprehensive digital trading journal and analytics platform, hosted on Railway.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Apply font variables to the html tag
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${cairo.variable}`}>
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
