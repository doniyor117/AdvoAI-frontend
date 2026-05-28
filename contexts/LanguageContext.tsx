'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import locales from '@/locales.json';

export type Language = 'en' | 'uz' | 'ru';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>('en');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const savedLang = localStorage.getItem('advoai_lang') as Language;
    if (savedLang && ['en', 'uz', 'ru'].includes(savedLang)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('advoai_lang', newLang);
  };

  const t = (key: string, params?: Record<string, string>) => {
    const keys = key.split('.');
    let value: any = (locales as any)[lang];
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        return key; // fallback to key
      }
    }
    
    if (typeof value === 'string' && params) {
      let interpolated = value;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        interpolated = interpolated.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue);
      }
      return interpolated;
    }
    
    return value;
  };

  // Prevent hydration mismatch by not rendering until mounted
  // We should still render children, just maybe not with the correct language initially
  // Returning null here breaks SSR for the entire app
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
