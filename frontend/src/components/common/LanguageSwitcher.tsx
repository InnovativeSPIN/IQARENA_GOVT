import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'light' | 'compact';
}

export function LanguageSwitcher({ className, variant = 'default' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  if (variant === 'light') {
    // For colored / dark headers (like Faculty blue header)
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 p-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-xs font-medium',
          className
        )}
      >
        <span className="pl-1.5 pr-0.5 text-white/80">
          <Languages className="w-3.5 h-3.5" />
        </span>
        <button
          type="button"
          onClick={() => setLanguage('ta')}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200',
            language === 'ta'
              ? 'bg-white text-primary shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          )}
        >
          தமிழ்
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200',
            language === 'en'
              ? 'bg-white text-primary shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          )}
        >
          English
        </button>
      </div>
    );
  }

  // Default pill switcher for TopNavbar and Student Layout
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs',
        className
      )}
    >
      <span className="pl-1.5 pr-0.5 text-muted-foreground flex items-center">
        <Languages className="w-3.5 h-3.5" />
      </span>
      <button
        type="button"
        onClick={() => setLanguage('ta')}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200',
          language === 'ta'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
        )}
        title="தமிழில் பார்க்க"
      >
        தமிழ்
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200',
          language === 'en'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
        )}
        title="View in English"
      >
        English
      </button>
    </div>
  );
}

export default LanguageSwitcher;
