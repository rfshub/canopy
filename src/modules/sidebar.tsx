/* /src/modules/sidebar.tsx */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
  Home,
  Container,
  Settings,
  Server,
  ChevronDown,
  Activity,
  Cpu,
  MemoryStick,
  ChevronsLeftRightEllipsis,
  HardDrive,
} from 'lucide-react';

// --- Type Definitions for Navigation Items ---
type NavLinkItem = {
  type: 'link';
  href: string;
  label: string;
  icon: ElementType;
};

type SubItem = {
  href: string;
  label: string;
  icon: ElementType;
};

type CollapsibleNavItem = {
  type: 'collapsible';
  label: string;
  icon: ElementType;
  basePath: string;
  subItems: SubItem[];
};

type NavItem = NavLinkItem | CollapsibleNavItem;

// --- Navigation Data ---
const navItems: NavItem[] = [
  { type: 'link', href: '/', label: 'Overview', icon: Home },
  { type: 'link', href: '/container', label: 'Container', icon: Container },
  {
    type: 'collapsible',
    label: 'System',
    icon: Server,
    basePath: '/system',
    subItems: [
      { href: '/system', label: 'Insight', icon: Activity },
      { href: '/system/cpu', label: 'CPU', icon: Cpu },
      { href: '/system/memory', label: 'Memory', icon: MemoryStick },
      { href: '/system/network', label: 'Network', icon: ChevronsLeftRightEllipsis },
      { href: '/system/storage', label: 'Storage', icon: HardDrive },
    ],
  },
  { type: 'link', href: '/settings', label: 'Settings', icon: Settings },
];

// --- Sub-components for rendering navigation ---
const NavLink = ({ item, isActive }: { item: NavLinkItem; isActive: boolean }) => (
  <Link
    href={item.href}
    className={`relative flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
      isActive
        ? 'text-[var(--text-color)] bg-[var(--secondary-color)]'
        : 'text-[var(--subtext-color)] hover:bg-[var(--secondary-color)] hover:text-[var(--text-color)]'
    }`}
  >
    {isActive && (
      <motion.div
        layoutId="active-sidebar-indicator"
        className="absolute left-0 w-1 h-5 rounded-full bg-[var(--theme-color)]"
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      />
    )}
    <item.icon className="w-4 h-4 mr-3 ml-2" />
    <span>{item.label}</span>
  </Link>
);

const CollapsibleNav = ({ item, isActive }: { item: CollapsibleNavItem; isActive: boolean }) => {
  const [isOpen, setIsOpen] = useState(isActive);
  const pathname = usePathname();

  // This effect handles the auto-collapse logic by watching for path changes.
  useEffect(() => {
    if (!pathname.startsWith(item.basePath)) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [pathname, item.basePath]);

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Collapsible.Trigger className="w-full">
        <div
          className={`relative flex items-center w-full p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
            isActive
              ? 'text-[var(--text-color)] bg-[var(--secondary-color)]'
              : 'text-[var(--subtext-color)] hover:bg-[var(--secondary-color)] hover:text-[var(--text-color)]'
          }`}
        >
          {isActive && (
            <motion.div
              layoutId="active-sidebar-indicator"
              className="absolute left-0 w-1 h-5 rounded-full bg-[var(--theme-color)]"
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          )}
          <item.icon className="w-4 h-4 mr-3 ml-2" />
          <span className="flex-1 text-left">{item.label}</span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </Collapsible.Trigger>
      <AnimatePresence>
        {isOpen && (
          <Collapsible.Content asChild forceMount>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <ul className="pl-5 pt-2 space-y-1">
                {item.subItems.map((subItem) => {
                  const isSubItemActive = pathname === subItem.href;
                  return (
                    <li key={subItem.href} className="relative">
                      <Link
                        href={subItem.href}
                        className={`group flex items-center p-1.5 rounded-md text-sm transition-colors duration-200 ${
                          isSubItemActive
                            ? 'text-[var(--text-color)]'
                            : 'text-[var(--subtext-color)] hover:text-[var(--text-color)]'
                        }`}
                      >
                        <subItem.icon
                          className={`w-3.5 h-3.5 mr-2.5 transition-colors duration-200 ${
                            isSubItemActive
                              ? 'text-[var(--text-color)]'
                              : 'text-[var(--subtext-color)] group-hover:text-[var(--text-color)]'
                          }`}
                        />
                        <span>{subItem.label}</span>
                      </Link>
                      {isSubItemActive && (
                        <motion.div
                          layoutId="active-sub-indicator"
                          className="absolute left-[-0.25rem] top-0 bottom-0 flex items-center"
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 40,
                          }}
                        >
                          <div className="w-1 h-1 bg-[var(--theme-color)] rounded-full" />
                        </motion.div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </Collapsible.Content>
        )}
      </AnimatePresence>
    </Collapsible.Root>
  );
};

// --- Main Sidebar Component ---
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-44 flex-shrink-0 border-r glass-effect h-dvh overflow-y-auto"
      style={{ borderColor: 'var(--tertiary-color)' }}
    >
      <nav className="p-2">
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
    </aside>
  );
}
