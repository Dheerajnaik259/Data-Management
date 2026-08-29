import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { formatCurrency } from '../utils/formatCurrency';
import { CommunicationLogEditor } from '../components/clients/CommunicationLogEditor';
import { ClientForm } from '../components/clients/ClientForm';
import { ShootForm } from '../components/shoots/ShootForm';
import { CommunicationLog, Client } from '../types';
import { subscribeToCommunicationLogs } from '../supabase/data';
import { ArrowLeft, Phone, ExternalLink, Edit2, Calendar, MapPin, CheckCircle2, Clock, Plus, FileText, DollarSign, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canDelete } from '../utils/permissions';

export const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, shoots, getClientLedger } = useData();
  const { user } = useAuth();

  const client = clients.find(c => c.id === id);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isScheduleShootOpen, setIsScheduleShootOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToCommunicationLogs(id, (data) => setLogs(data));
    return () => unsub();
  }, [id]);

  if (!client) {
    return (
      <div className="p-8 text-center bg-[var(--color-bg)] min-h-screen flex flex-col items-center justify-center">
        <h2 className="font-serif text-xl font-bold text-[var(--color-text)] mb-2">Client Not Found</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">The requested client record may have been deleted or does not exist.</p>
        <Link to="/clients" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)]">
          <ArrowLeft className="w-3.5 h-3.5" /> <span>Back to Clients</span>
        </Link>
      </div>
    );
  }

  const ledger = getClientLedger(client.id);
  const clientShoots = shoots.filter(s => s.clientId === client.id);

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header title={client.name} subtitle="Client profile, financial ledger, past shoots, and communication history"
        action={
          <div className="flex items-center gap-2">
            <Link to="/clients" className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> <span>Back</span>
            </Link>
            <button type="button" onClick={() => setIsEditFormOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> <span>Edit Client</span>
            </button>
            <button type="button" onClick={() => setIsScheduleShootOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs">
              <Plus className="w-4 h-4" /> <span>New Shoot</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${client.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)]'}`}>
                {client.status} Client
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] font-mono">ID: {client.id.slice(0, 8)}</span>
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[var(--color-text)] tracking-tight">{client.name}</h2>
              <div className="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <a href={`tel:${client.phone}`} className="hover:underline font-medium">{client.phone}</a>
                </div>
                {client.contractLink ? (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    <a href={client.contractLink} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] hover:underline font-medium truncate">Master Services Agreement / Contract &rarr;</a>
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--color-text-muted)] italic">No contract document linked yet.</p>
                )}
              </div>
            </div>
            {client.notes && (
              <div className="pt-3 border-t border-[var(--color-border)]">
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Client Brief & Notes</span>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">Client Financial Ledger</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">Calculated dynamically from shoot jobs & cleared invoices</p>
                </div>
                <span className="text-xs font-medium text-[var(--color-text-secondary)] font-mono bg-[var(--color-bg)] px-2.5 py-1 rounded border border-[var(--color-border)]">{clientShoots.length} Total Shoots</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
                  <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">Total Billed</span>
                  <span className="text-xl font-bold font-serif text-[var(--color-text)] block mt-1">{formatCurrency(ledger.totalBilled)}</span>
                </div>
                <div className="p-4 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
                  <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">Total Paid</span>
                  <span className="text-xl font-bold font-serif text-emerald-600 dark:text-emerald-500 block mt-1">{formatCurrency(ledger.totalPaid)}</span>
                </div>
                <div className="p-4 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
                  <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">Outstanding Balance</span>
                  <span className={`text-xl font-bold font-serif block mt-1 ${ledger.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-secondary)]'}`}>{formatCurrency(ledger.outstanding)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>Payment Terms: Net-7 on Deliverable Handover</span>
              {ledger.outstanding === 0 && ledger.totalBilled > 0 && (
                <span className="text-emerald-600 dark:text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All accounts settled
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Production Shoots History</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">All jobs executed or scheduled for {client.name}</p>
              </div>
              <button type="button" onClick={() => setIsScheduleShootOpen(true)} className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">+ Add Shoot</button>
            </div>
            <div className="flex-1 divide-y divide-[var(--color-border)]">
              {clientShoots.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No shoot records for this client yet.</div>
              ) : (
                clientShoots.map(shoot => (
                  <div key={shoot.id} className="p-4 hover:bg-[var(--color-bg-hover)] transition-colors flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/shoots/${shoot.id}`} className="font-semibold text-xs text-[var(--color-text)] hover:underline">{shoot.location}</Link>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${shoot.status === 'done' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                          {shoot.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-2">
                        <span>{shoot.date}</span> <span>&bull;</span> <span>{shoot.deliverables ? shoot.deliverables.length : 0} deliverables</span> <span>&bull;</span> <span>{shoot.assignments ? shoot.assignments.length : 0} cameramen</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold text-xs font-mono text-[var(--color-text)]">{formatCurrency(shoot.clientAmount)}</span>
                      <span className={`text-[11px] font-medium ${shoot.clientPaid ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                        {shoot.clientPaid ? 'Paid' : 'Pending Payment'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)] shadow-2xs">
            <CommunicationLogEditor clientId={client.id} logs={logs} />
          </div>
        </div>
      </main>

      <ClientForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} initialClient={client} />
      <ShootForm isOpen={isScheduleShootOpen} onClose={() => setIsScheduleShootOpen(false)} initialShoot={null} />
    </div>
  );
};
