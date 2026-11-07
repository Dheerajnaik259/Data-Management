import React, { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CommandPalette } from '../common/CommandPalette';
import { KeyboardShortcuts } from '../common/KeyboardShortcuts';

export const AppLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const openMobileNav = () => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMobileNavOpen(true);
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    if (!mobileNavOpen) {
      if (wasOpenRef.current && previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileNav();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        mobileDialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter(element => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen flex bg-transparent text-[var(--color-text)] relative">
      {/* Desktop Sidebar (Persistent) */}
      <div className="hidden md:flex shrink-0 h-screen sticky top-0 py-3 pl-3 pr-1">
        <Sidebar />
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
              onClick={closeMobileNav}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Slide menu */}
            <motion.div
              ref={mobileDialogRef}
              initial={{ x: shouldReduceMotion ? 0 : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: shouldReduceMotion ? 0 : '-100%' }}
              transition={shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 max-w-[80vw] h-full flex flex-col z-10 p-3"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
            >
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMobileNav}
                className="absolute top-4 right-4 z-10 rounded-xl border border-white/[0.1] bg-white/[0.04] p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
              <Sidebar onCloseMobile={closeMobileNav} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Outlet context={{ onOpenMobileNav: openMobileNav }} />
      </div>

      <CommandPalette />
      <KeyboardShortcuts />
    </div>
  );
};
