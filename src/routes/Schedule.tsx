import React, { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Film, RotateCcw } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';

type ScheduleEventType = 'shoot';
interface ScheduleEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
  type: ScheduleEventType;
  shootId: string;
  href: string;
}

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const twoDigits = (value: number) => String(value).padStart(2, '0');

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

function dateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function addDateEvent(events: ScheduleEvent[], date: string | null | undefined, event: ScheduleEvent) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) events.push({ ...event, date });
}

function monthEvents(
  shoots: ReturnType<typeof useData>['shoots'],
): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  shoots.forEach(shoot => {
    addDateEvent(events, shoot.date, {
      id: `shoot:${shoot.id}`,
      date: shoot.date,
      title: shoot.location || 'Shoot',
      detail: shoot.location || 'Location not set',
      type: 'shoot',
      shootId: shoot.id,
      href: `/shoots/${shoot.id}`,
    });
  });
  return events.sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
}

const typeStyles: Record<ScheduleEventType, string> = {
  shoot: 'bg-[var(--color-accent)]',
};

const typeLabels: Record<ScheduleEventType, string> = {
  shoot: 'Shoot',
};

export const Schedule: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { shoots, clients } = useData();
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(today));
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const events = useMemo(() => monthEvents(shoots), [shoots]);
  const clientById = useMemo(() => new Map(clients.map(client => [client.id, client.name])), [clients]);
  const shootById = useMemo(() => new Map(shoots.map(shoot => [shoot.id, shoot])), [shoots]);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ScheduleEvent[]>();
    events.forEach(event => {
      const dateEvents = grouped.get(event.date);
      if (dateEvents) dateEvents.push(event);
      else grouped.set(event.date, [event]);
    });
    return grouped;
  }, [events]);
  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      return { day, key: localDateKey(day), inMonth: day.getMonth() === month.getMonth() };
    });
  }, [month]);
  const selectedEvents = events.filter(event => event.date === selectedDate);

  const shiftMonth = (amount: number) => {
    setActiveEventId(null);
    setHoveredEventId(null);
    setMonth(current => {
      const next = new Date(current.getFullYear(), current.getMonth() + amount, 1);
      setSelectedDate(localDateKey(next));
      return next;
    });
  };
  const goToToday = () => {
    const now = new Date();
    setActiveEventId(null);
    setHoveredEventId(null);
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(localDateKey(now));
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col pb-12">
      <Header title="Schedule" subtitle="Upcoming shoots" onOpenMobile={onOpenMobileNav} />
      <main className="mx-auto w-full max-w-[1500px] flex-1 space-y-5 p-4 sm:p-6 lg:p-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <div className="liquid-content-panel">
            <header className="liquid-panel-header flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{events.filter(event => event.date.startsWith(`${month.getFullYear()}-${twoDigits(month.getMonth() + 1)}`)).length} scheduled items</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={goToToday} className="liquid-glass-button inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] text-[var(--color-text-secondary)]"><RotateCcw className="h-3 w-3" /> Today</button>
                <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="liquid-glass-button rounded-lg p-2 text-[var(--color-text-secondary)]"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="liquid-glass-button rounded-lg p-2 text-[var(--color-text-secondary)]"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </header>
            <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
              {weekDays.map(day => <div key={day} className="px-1 py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:py-3 sm:text-[10px]">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map(({ day, key, inMonth }) => {
                const dayEvents = eventsByDate.get(key) || [];
                const count = dayEvents.length;
                const isToday = key === localDateKey(today);
                return (
                  <div
                    key={key}
                    className={`group/day relative min-h-16 border-b border-r border-[var(--color-border)] p-1.5 text-xs transition-colors sm:min-h-24 sm:p-2 ${selectedDate === key ? 'bg-[var(--color-accent)]/10' : 'hover:bg-white/[0.03]'} ${inMonth ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] opacity-50'} ${dayEvents.some(event => event.id === (activeEventId || hoveredEventId)) ? 'z-30' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => { setSelectedDate(key); setActiveEventId(null); }}
                      aria-label={`${dateLabel(key)}${count ? `, ${count} scheduled ${count === 1 ? 'item' : 'items'}` : ''}`}
                      aria-pressed={selectedDate === key}
                      className="flex w-full items-center justify-center"
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] sm:h-7 sm:w-7 sm:text-xs ${isToday ? 'bg-[var(--color-accent)] font-bold text-[var(--color-text-on-accent)]' : ''}`}>{day.getDate()}</span>
                    </button>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map(event => {
                        const shoot = shootById.get(event.shootId);
                        const isPopupVisible = activeEventId === event.id || (!activeEventId && hoveredEventId === event.id);
                        return (
                          <div
                            key={event.id}
                            className="relative"
                            onMouseEnter={() => setHoveredEventId(event.id)}
                            onMouseLeave={() => setHoveredEventId(current => current === event.id ? null : current)}
                            onFocus={() => setHoveredEventId(event.id)}
                            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setHoveredEventId(null); }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(key);
                                setActiveEventId(current => current === event.id ? null : event.id);
                              }}
                              aria-label={`${event.title}, ${clientById.get(shoot?.clientId || '') || 'Unknown client'}; click for details`}
                              aria-expanded={isPopupVisible}
                              className="block w-full truncate rounded bg-[var(--color-accent)]/15 px-1 py-0.5 text-left text-[8px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 sm:text-[9px]"
                            >
                              <span className="mr-0.5 inline-block h-1 w-1 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
                              {clientById.get(shoot?.clientId || '') || event.title}
                            </button>
                            {isPopupVisible && (
                              <div className={`absolute top-full z-50 mt-1 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-xl ${day.getDay() >= 5 || day.getDay() === 0 ? 'right-0' : 'left-0'}`}>
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">Scheduled shoot</p>
                                <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text-primary)]">{clientById.get(shoot?.clientId || '') || 'Unknown client'}</p>
                                <p className="mt-1 truncate text-[10px] text-[var(--color-text-secondary)]">{event.detail}</p>
                                {shoot?.callTime && <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">Call time: {shoot.callTime}</p>}
                                <button
                                  type="button"
                                  onClick={() => navigate(event.href)}
                                  className="mt-2 w-full rounded-md bg-[var(--color-accent)] px-2 py-1.5 text-[10px] font-semibold text-[var(--color-text-on-accent)]"
                                >
                                  Open shoot details
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {count > 2 && (
                        <button
                          type="button"
                          onClick={() => { setSelectedDate(key); setActiveEventId(null); }}
                          className="block w-full text-center text-[8px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] sm:text-[9px]"
                        >
                          +{count - 2} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <footer className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--color-border)] p-3 sm:px-5">
              {(Object.keys(typeLabels) as ScheduleEventType[]).map(type => <span key={type} className="inline-flex items-center gap-1.5 text-[9px] text-[var(--color-text-muted)]"><span className={`h-1.5 w-1.5 rounded-full ${typeStyles[type]}`} />{typeLabels[type]}</span>)}
            </footer>
          </div>

          <aside className="liquid-content-panel min-h-64 overflow-hidden">
            <header className="liquid-panel-header border-b border-[var(--color-border)] p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Agenda</p>
              <h2 className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{dateLabel(selectedDate)}</h2>
            </header>
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <CalendarDays className="h-6 w-6 text-[var(--color-text-muted)]" />
                <p className="mt-3 text-xs font-medium text-[var(--color-text-secondary)]">Nothing scheduled</p>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">Select another date to view its events.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {selectedEvents.map(event => {
                  const shoot = event.type === 'shoot' ? shoots.find(item => event.id === `shoot:${item.id}`) : null;
                  return (
                    <button key={event.id} type="button" onClick={() => navigate(event.href)} className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-white/[0.025]">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${typeStyles[event.type]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{event.type === 'shoot' && <Film className="h-3 w-3" />}{typeLabels[event.type]}</span>
                        <span className="mt-1 block text-xs font-semibold text-[var(--color-text-primary)]">{event.title}</span>
                        <span className="mt-1 block truncate text-[10px] text-[var(--color-text-secondary)]">{shoot ? `${clientById.get(shoot.clientId) || 'Unknown client'} · ${event.detail}` : event.detail}</span>
                      </span>
                      <ChevronRight className="mt-3 h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                    </button>
                  );
                })}
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
};
