import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const navigationShortcuts = [
  { sequence: 'G, then D', destination: '/', description: 'Open Dashboard' },
  { sequence: 'G, then S', destination: '/shoots', description: 'Open Shoots' },
  { sequence: 'G, then C', destination: '/clients', description: 'Open Clients' },
  { sequence: 'G, then M', destination: '/cameramen', description: 'Open Cameramen' },
  { sequence: 'G, then P', destination: '/payments', description: 'Open Payments' },
  { sequence: 'G, then I', destination: '/invoices', description: 'Open Invoices' },
  { sequence: 'G, then E', destination: '/expenses', description: 'Open Expenses' },
  { sequence: 'G, then A', destination: '/approvals', description: 'Open Approvals' },
  { sequence: 'G, then T', destination: '/recycle-bin', description: 'Open Recycle Bin' },
  { sequence: 'G, then ,', destination: '/settings', description: 'Open Settings' },
];

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
};

export const KeyboardShortcuts: React.FC = () => {
  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    let waitingForNavigationKey = false;
    let navigationTimeout: ReturnType<typeof setTimeout> | undefined;

    const dispatchPalette = (action: 'toggle' | 'close') => {
      window.dispatchEvent(new CustomEvent('app:command-palette', { detail: action }));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || !document.hasFocus()) return;

      if (event.key === 'Escape') {
        if (isHelpOpen) {
          event.preventDefault();
          setIsHelpOpen(false);
        } else {
          dispatchPalette('close');
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        const form = event.target instanceof HTMLElement ? event.target.closest('form') : null;
        if (!form) return;
        const submitButtons = Array.from(form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button:not([type]), button[type="submit"], input[type="submit"]'));
        const submitButton = submitButtons.find(button => !button.disabled);
        event.preventDefault();
        if (!form.checkValidity() || (submitButtons.length > 0 && !submitButton)) return;
        form.requestSubmit(submitButton || undefined);
        return;
      }

      if (isEditableTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        dispatchPalette('toggle');
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === '/' || event.code === 'Slash')) {
        event.preventDefault();
        setIsHelpOpen(true);
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        setIsHelpOpen(true);
        return;
      }

      if (waitingForNavigationKey) {
        waitingForNavigationKey = false;
        if (navigationTimeout) clearTimeout(navigationTimeout);
        const shortcut = navigationShortcuts.find(item => item.sequence.endsWith(event.key.toUpperCase()));
        const settingsShortcut = event.key === ',' ? navigationShortcuts[navigationShortcuts.length - 1] : undefined;
        const match = settingsShortcut || shortcut;
        if (match) {
          event.preventDefault();
          navigate(match.destination);
        }
        return;
      }

      if (event.key.toLowerCase() === 'g' && !event.altKey && !event.ctrlKey && !event.metaKey) {
        waitingForNavigationKey = true;
        navigationTimeout = setTimeout(() => { waitingForNavigationKey = false; }, 1200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (navigationTimeout) clearTimeout(navigationTimeout);
    };
  }, [navigate, isHelpOpen]);

  if (!isHelpOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onKeyDown={event => {
      if (event.key === 'Escape') setIsHelpOpen(false);
    }}>
      <button type="button" aria-label="Close keyboard shortcuts" className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setIsHelpOpen(false)} />
      <section role="dialog" aria-modal="true" aria-labelledby="shortcut-help-title" className="glass-panel-elevated relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="shortcut-help-title" className="text-lg font-semibold text-[var(--color-text)]">Keyboard shortcuts</h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Navigation shortcuts pause while typing. Use Ctrl / Cmd + Enter to submit a valid form.</p>
          </div>
          <button type="button" onClick={() => setIsHelpOpen(false)} aria-label="Close" className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <ShortcutRow keys="Ctrl / Cmd + K" description="Open or close command palette" />
          <ShortcutRow keys="Ctrl / Cmd + / or ?" description="Show this shortcut reference" />
          <ShortcutRow keys="Escape" description="Close the topmost open overlay" />
          <ShortcutRow keys="Ctrl / Cmd + Enter" description="Submit a valid form" />
          {navigationShortcuts.map(item => <ShortcutRow key={item.destination} keys={item.sequence} description={item.description} />)}
        </div>
      </section>
    </div>
  );
};

const ShortcutRow: React.FC<{ keys: string; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-2 last:border-0">
    <span className="text-[var(--color-text-secondary)]">{description}</span>
    <kbd className="shrink-0 rounded border border-[var(--color-border)] bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-[var(--color-text)]">{keys}</kbd>
  </div>
);
