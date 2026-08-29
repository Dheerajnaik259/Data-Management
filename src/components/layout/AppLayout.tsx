import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CommandPalette } from '../common/CommandPalette';

export const AppLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-text)] relative">
      {/* Desktop Sidebar (Persistent) */}
      <div className="hidden md:flex shrink-0 h-screen sticky top-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 bg-[#1C1917]/50 backdrop-blur-xs"
            />

            {/* Slide menu */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 max-w-[80vw] bg-[var(--color-surface)] h-full shadow-2xl flex flex-col z-10"
            >
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="absolute top-4 right-4 p-2 text-[#78716C] hover:text-[#1C1917] rounded-md"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
              <Sidebar onCloseMobile={() => setMobileNavOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Outlet key={location.pathname} context={{ onOpenMobileNav: () => setMobileNavOpen(true) }} />
      </div>

      <CommandPalette />
    </div>
  );
};
