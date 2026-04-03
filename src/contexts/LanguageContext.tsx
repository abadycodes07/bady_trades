'use client';

// src/contexts/LanguageContext.tsx
// Global language context for site-wide English <-> Arabic (RTL) toggle

import React, { createContext, useState, useContext, useEffect, type ReactNode, useCallback } from 'react';
import { t as translate } from '@/lib/i18n/ar';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
  isArabic: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  toggleLanguage: () => {},
  t: (key: string) => key,
  isArabic: false,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('badytrades_language') as Language | null;
    if (stored === 'ar' || stored === 'en') {
      setLanguage(stored);
    }
  }, []);

  // Apply dir and lang to <html> whenever language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => {
      const next: Language = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('badytrades_language', next);
      return next;
    });
  }, []);

  const t = useCallback((key: string) => translate(key, language), [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, isArabic: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};
