import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { Search, User, Film, Camera, Receipt, Settings, ArrowRight } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { clients, shoots, cameramen, expenses } = useData();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items = [
    // Quick Actions
    { id: 'qa-1', title: 'Schedule new Shoot', subtitle: '', icon: Film, onSelect: () => navigate('/shoots'), type: 'action' },
    { id: 'qa-2', title: 'Add new Client', subtitle: '', icon: User, onSelect: () => navigate('/clients'), type: 'action' },
    { id: 'qa-3', title: 'Add new Cameraman', subtitle: '', icon: Camera, onSelect: () => navigate('/cameramen'), type: 'action' },
    { id: 'qa-4', title: 'Log new Expense', subtitle: '', icon: Receipt, onSelect: () => navigate('/expenses'), type: 'action' },
    { id: 'qa-5', title: 'Settings', subtitle: '', icon: Settings, onSelect: () => navigate('/settings'), type: 'action' },
    
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 px-4 sm:px-6">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />
      
      <div className="relative bg-[var(--color-surface)] w-full max-w-xl rounded-xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[60vh]" role="dialog">
        <div className="flex items-center px-4 py-3 border-b border-[var(--color-border)]">
          <Search className="w-5 h-5 text-[var(--color-text-muted)] mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-base text-[var(--color-text)] placeholder-[var(--color-text-muted)]"
            placeholder="Search clients, shoots, cameramen, or actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1.5 py-0.5">
            <span>ESC</span>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="overflow-y-auto py-2">
            {filteredItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { item.onSelect(); setIsOpen(false); }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center px-4 py-2.5 text-left transition-colors ${
                    selectedIndex === index ? 'bg-[var(--color-bg-hover)]' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mr-3 ${
                    item.type === 'action' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
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
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">No results found for "{query}"</p>
          </div>
        )}
        <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <span>Navigate with <kbd className="font-sans px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">↑</kbd> <kbd className="font-sans px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">↓</kbd></span>
            <span>Select with <kbd className="font-sans px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">Enter</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
};
