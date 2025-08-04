/* /src/modules/mobile-header.tsx */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Menu, X } from 'lucide-react';
import {
  navItems,
  NavLink,
  CollapsibleNav,
  NodeStatusCard,
} from '~/modules/sidebar';

// --- Main Mobile Header Component ---
export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header
      className="md:hidden sticky top-0 z-40 glass-effect backdrop-blur-sm"
      style={{
        borderColor: 'var(--tertiary-color)',
        borderBottomWidth: '1px',
      }}
    >
      <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="p-2">
        <div className="flex items-center justify-between">
          <div className="w-56">
            <NodeStatusCard />
          </div>
          <Collapsible.Trigger asChild>
            <button className="p-1">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={isOpen ? 'x' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </motion.div>
              </AnimatePresence>
              <span className="sr-only">Toggle Menu</span>
            </button>
          </Collapsible.Trigger>
        </div>
        <Collapsible.Content asChild>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <nav className="pt-4 pb-2">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const isActive =
                    item.type === 'link'
                      ? pathname === item.href
                      : pathname.startsWith(item.basePath);
                  return (
                    <li key={item.label}>
                      {item.type === 'link' ? (
                        <NavLink item={item} isActive={isActive} />
                      ) : (
                        <CollapsibleNav item={item} isActive={isActive} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </motion.div>
        </Collapsible.Content>
      </Collapsible.Root>
    </header>
  );
}