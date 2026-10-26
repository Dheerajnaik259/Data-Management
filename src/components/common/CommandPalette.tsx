import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { Search, User, Film, Camera, Receipt, Settings, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousOverflowRef = useRef('');
  const wasOpenRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { clients, shoots, cameramen, expenses } = useData();

  useEffect(() => {
    const handlePaletteEvent = (event: Event) => {
      const action = (event as CustomEvent<'toggle' | 'close'>).detail;
      if (action === 'toggle' && !isOpen) {
        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      setIsOpen(previous => action === 'toggle' ? !previous : false);
    };
    window.addEventListener('app:command-palette', handlePaletteEvent);
    return () => window.removeEventListener('app:command-palette', handlePaletteEvent);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => inputRef.current?.focus());
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      document.body.style.overflow = previousOverflowRef.current;
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
      wasOpenRef.current = false;
    }
    return () => {
      if (wasOpenRef.current) document.body.style.overflow = previousOverflowRef.current;
    };
  }, [isOpen]);

  const items = [
    { id: 'nav-dashboard', title: 'Go to Dashboard', subtitle: 'Home', icon: Film, onSelect: () => navigate('/'), type: 'action' },
    { id: 'nav-shoots', title: 'Go to Shoots', subtitle: 'Scheduling and shoot operations', icon: Film, onSelect: () => navigate('/shoots'), type: 'action' },
    { id: 'nav-clients', title: 'Go to Clients', subtitle: 'Client accounts', icon: User, onSelect: () => navigate('/clients'), type: 'action' },
    { id: 'nav-cameramen', title: 'Go to Cameramen', subtitle: 'Crew directory', icon: Camera, onSelect: () => navigate('/cameramen'), type: 'action' },
    { id: 'nav-payments', title: 'Go to Payments', subtitle: 'Receivables and payouts', icon: Receipt, onSelect: () => navigate('/payments'), type: 'action' },
    { id: 'nav-invoices', title: 'Go to Invoices', subtitle: 'Invoices and vouchers', icon: Receipt, onSelect: () => navigate('/invoices'), type: 'action' },
    { id: 'nav-expenses', title: 'Go to Expenses', subtitle: 'Operating expenses', icon: Receipt, onSelect: () => navigate('/expenses'), type: 'action' },
    { id: 'nav-approvals', title: 'Go to Approvals', subtitle: 'Review change submissions', icon: Settings, onSelect: () => navigate('/approvals'), type: 'action' },
    { id: 'nav-trash', title: 'Go to Recycle Bin', subtitle: 'Restore deleted records', icon: Receipt, onSelect: () => navigate('/recycle-bin'), type: 'action' },
    // Quick Actions
    { id: 'qa-1', title: 'Open shoot scheduling', subtitle: 'Create or manage shoots', icon: Film, onSelect: () => navigate('/shoots'), type: 'action' },
    { id: 'qa-2', title: 'Open client directory', subtitle: 'Create or manage clients', icon: User, onSelect: () => navigate('/clients'), type: 'action' },
    { id: 'qa-3', title: 'Open cameramen directory', subtitle: 'Manage production crew', icon: Camera, onSelect: () => navigate('/cameramen'), type: 'action' },
    { id: 'qa-4', title: 'Open expense log', subtitle: 'Record operating expenses', icon: Receipt, onSelect: () => navigate('/expenses'), type: 'action' },
    { id: 'qa-5', title: 'Open Settings', subtitle: 'Manage account and options', icon: Settings, onSelect: () => navigate('/settings'), type: 'action' },
    
    // Clients
    ...clients.map(c => ({ id: `client-${c.id}`, title: c.name, subtitle: c.phone, icon: User, onSelect: () => navigate(`/clients/${c.id}`), type: 'client' })),
    
    // Cameramen
    ...cameramen.map(c => ({ id: `cam-${c.id}`, title: c.name, subtitle: c.phone, icon: Camera, onSelect: () => navigate(`/cameramen/${c.id}`), type: 'cameraman' })),
    
    // Shoots
    ...shoots.map(s => {
      const clientName = clients.find(c => c.id === s.clientId)?.name || 'Unknown';
      return { id: `shoot-${s.id}`, title: `${s.date} · ${clientName}`, subtitle: s.location, icon: Film, onSelect: () => navigate(`/shoots/${s.id}`), type: 'shoot' };
    }),

    // Expenses
    ...expenses.map(e => ({ id: `exp-${e.id}`, title: e.description, subtitle: `${e.date} · ₹${e.amount}`, icon: Receipt, onSelect: () => navigate('/expenses'), type: 'expense' }))
  ];

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8); // Max 8 results

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      return;
    }
    if (e.key === 'Tab') {
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'input:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) || []).filter(element => element.offsetParent !== null);
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
    {isOpen && (
    <motion.div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 sm:px-6"
      initial={shouldReduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}>
      <button type="button" aria-label="Close command palette" className="fixed inset-0 bg-black/55 backdrop-blur-[3px]" onClick={() => setIsOpen(false)} />

      <motion.div ref={dialogRef} onKeyDown={handleKeyDown}
        initial={shouldReduceMotion ? false : { opacity: 0, y: -8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -5, scale: 0.99 }}
        transition={shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 360, damping: 32 }}
        className="glass-panel-elevated relative w-full max-w-xl overflow-hidden flex flex-col max-h-[70vh]"
        role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="flex items-center px-4 py-3 border-b border-[var(--color-border)]">
          <Search className="w-5 h-5 text-[var(--color-text-muted)] mr-3" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={filteredItems[selectedIndex] ? `command-option-${filteredItems[selectedIndex].id}` : undefined}
            aria-label="Search commands and records"
            autoComplete="off"
            className="flex-1 bg-transparent border-none outline-none text-base text-[var(--color-text)] placeholder-[var(--color-text-muted)]"
            placeholder="Search clients, shoots, cameramen, or actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1.5 py-0.5">
            <span>ESC</span>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div id="command-palette-results" className="overflow-y-auto py-2" role="listbox" aria-label="Commands and search results">
            {filteredItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`command-option-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={selectedIndex === index}
                  onClick={() => { item.onSelect(); setIsOpen(false); }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center px-4 py-2.5 text-left transition-colors ${
                    selectedIndex === index ? 'bg-[var(--color-bg-hover)]' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mr-3 ${
                    selectedIndex === index
                      ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                      : 'bg-white/[0.055] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedIndex === index ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">{item.subtitle}</p>
                    )}
                  </div>
                  {selectedIndex === index && (
                    <ArrowRight className="w-4 h-4 text-[var(--color-accent)] shrink-0 ml-3" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center" role="status">
            <p className="text-sm text-[var(--color-text-muted)]">No results found for &quot;{query}&quot;</p>
          </div>
        )}
        <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <span>Navigate with <kbd className="font-sans px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">↑</kbd> <kbd className="font-sans px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">↓</kbd></span>
            <span>Select with <kbd className="font-sans px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">Enter</kbd></span>
          </div>
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};
