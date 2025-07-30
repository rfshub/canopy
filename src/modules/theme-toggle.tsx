/* /src/modules/theme-toggle.tsx */

'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { motion } from 'framer-motion';
import { Sun, Laptop, Moon } from 'lucide-react';

const options = [
  { value: 'light', icon: Sun },
  { value: 'system', icon: Laptop },
  { value: 'dark', icon: Moon },
];

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const placeholder = (
    <div
      className="relative flex items-center h-7 w-[78px] p-0.5 rounded-full"
      style={{ backgroundColor: 'var(--secondary-color)' }}
    />
  );

  if (!mounted || !theme) {
    return placeholder;
  }

  const handleThemeChange = (newTheme: string) => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextResolvedTheme =
      newTheme === 'system' ? (isDark ? 'dark' : 'light') : newTheme;

    if (nextResolvedTheme === resolvedTheme) {
      setTheme(newTheme);
      return;
    }

    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }
    document.startViewTransition(() => setTheme(newTheme));
  };

  return (
    <ToggleGroup.Root
      type="single"
      value={theme}
      onValueChange={(newTheme) => {
        if (newTheme) handleThemeChange(newTheme);
      }}
      className="relative flex items-center h-7 p-0.5 space-x-px rounded-full"
      style={{ backgroundColor: 'var(--secondary-color)' }}
      aria-label="Theme toggle"
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className="relative flex items-center justify-center h-6 w-6 rounded-full transition-colors duration-300 focus:outline-none"
          aria-label={option.value}
        >
          {theme === option.value && (
            <motion.div
              layoutId="theme-toggle-active-background"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute inset-0 h-full w-full rounded-full shadow-sm"
              style={{
                backgroundColor: 'var(--primary-color)',
                borderColor: 'var(--tertiary-color)',
                borderWidth: '1px',
              }}
            />
          )}
          <option.icon
            className="h-4 w-4 relative z-10"
            style={{
              color:
                theme === option.value
                  ? 'var(--text-color)'
                  : 'var(--subtext-color)',
            }}
          />
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}