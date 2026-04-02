

import type { ReactNode } from 'react';

// Simple layout for auth pages, allows underlying content to show through modal-like forms
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen"> {/* Removed background color */}
      {children}
    </div>
  );
}
