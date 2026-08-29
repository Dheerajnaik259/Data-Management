import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { formatCurrency } from '../utils/formatCurrency';
import { checkOverdue } from '../utils/overdueCheck';
import { OverdueBadge } from '../components/common/OverdueBadge';
import { ShootForm } from '../components/shoots/ShootForm';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ArrowLeft, Calendar, MapPin, CheckCircle2, Clock, ExternalLink, Edit2, Trash2, FileText, Copy, Check, Video, Phone, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canDelete } from '../utils/permissions';

export const ShootDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { shoots, clients, cameramen, expenses, handleUpdateOrSubmit, handleSoftDelete, handleToggleClientPayment, handleToggleCameramanPayment } = useData();
  const { user } = useAuth();

  const shoot = shoots.find(s => s.id === id);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paymentConfirmation, setPaymentConfirmation] = useState<{ index?: number; paid: boolean; label: string } | null>(null);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);

  const [isClientInvoiceModalOpen, setIsClientInvoiceModalOpen] = useState(false);
  const [cameramanReceiptModal, setCameramanReceiptModal] = useState<{ cameramanId: string; amount: number; paid: boolean; paidAt?: string | null; } | null>(null);

  if (!shoot) {
    return (
      <div className="p-8 text-center bg-[var(--color-bg)] min-h-screen flex flex-col items-center justify-center">
        <h2 className="font-serif text-xl font-bold text-[var(--color-text)] mb-2">Shoot Not Found</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">The requested production shoot does not exist or has been deleted.</p>
        <Link to="/shoots" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md">
          <ArrowLeft className="w-3.5 h-3.5" /> <span>Back to Shoots Schedule</span>
        </Link>
      </div>
    );
  }

  const client = clients.find(c => c.id === shoot.clientId);
  const cameramanMap = new Map(cameramen.map(c => [c.id, c]));
  const overdueInfo = checkOverdue(shoot.date, shoot.clientPaid, shoot.status);

  const totalCrewPayouts = (shoot.assignments || []).reduce((acc, a) => acc + (a.amount || 0), 0);
  const shootDirectExpenses = expenses.filter(e => e.shootId === shoot.id).reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalProductionCost = totalCrewPayouts + shootDirectExpenses;
  const netMargin = shoot.clientAmount - totalProductionCost;
  const marginPercentage = shoot.clientAmount > 0 ? Math.round((netMargin / shoot.clientAmount) * 100) : 0;

  const handleCopyLink = (link: string, idx: number) => {
    navigator.clipboard.writeText(link); setCopiedLinkIndex(idx);
    setTimeout(() => setCopiedLinkIndex(null), 2000);
  };

  const handleConfirmDelete = async () => {
    if (shoot) { await handleSoftDelete('shoots', shoot.id); navigate('/shoots'); }
  };

  const handleConfirmPayment = async () => {
    if (!paymentConfirmation) return;
    if (paymentConfirmation.index === undefined) await handleToggleClientPayment(shoot.id, paymentConfirmation.paid);
    else await handleToggleCameramanPayment(shoot.id, paymentConfirmation.index, paymentConfirmation.paid);
    setPaymentConfirmation(null);
  };

  const handleStatusToggle = async () => {
    await handleUpdateOrSubmit('shoots', shoot.id, { status: shoot.status === 'scheduled' ? 'done' : 'scheduled' });
  };

  const getWhatsAppReminderUrl = () => {
    if (!client?.phone) return '';
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hi ${client.name}! Greetings from SMM Ops Tool. This is a gentle reminder regarding the invoice of ${formatCurrency(shoot.clientAmount)} for the shoot at ${shoot.location} on ${shoot.date}. Please let us know once transferred so we can release full final master assets. Thank you!`);
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const canActDelete = user ? canDelete(user.role) : false;

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header
        title={`Shoot: ${shoot.location}`} subtitle={`${shoot.date} • Client: ${client?.name || 'Unknown'}`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/shoots" className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> <span>Back</span>
            </Link>
            <button type="button" onClick={() => setIsClientInvoiceModalOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors shadow-2xs">
              <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" /> <span>Client Invoice PDF</span>
            </button>
            <button type="button" onClick={() => setIsEditFormOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> <span>Edit Job</span>
            </button>
            {canActDelete && (
              <button type="button" onClick={() => setIsDeleteDialogOpen(true)} className="p-2 text-[var(--color-text-muted)] hover:text-red-600 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete Shoot">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
        <div className="bg-[var(--color-surface)] p-4 sm:p-6 rounded-lg border border-[var(--color-border)] shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleStatusToggle} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${shoot.status === 'done' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'}`} title="Click to toggle status">
              Status: {shoot.status}
            </button>
            <button type="button" onClick={() => setPaymentConfirmation({ paid: !shoot.clientPaid, label: 'client payment' })} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${shoot.clientPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'}`}>
              {shoot.clientPaid ? <><CheckCircle2 className="w-4 h-4" /><span>Client Paid ({formatCurrency(shoot.clientAmount)})</span></> : <><Clock className="w-4 h-4 text-[var(--color-text-muted)]" /><span>Pending Payment ({formatCurrency(shoot.clientAmount)})</span></>}
            </button>
            <OverdueBadge isPaid={shoot.clientPaid} overdueInfo={overdueInfo} size="md" />
          </div>
          {!shoot.clientPaid && client?.phone && (
            <a href={getWhatsAppReminderUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-md hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> <span>Send WhatsApp Payment Reminder</span>
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Shoot Overview & Client Details</h3>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)]">ID: {shoot.id.slice(0, 8)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Client Brand</span>
                  {client ? (
                    <Link to={`/clients/${client.id}`} className="font-bold text-sm text-[var(--color-text)] hover:underline transition-colors inline-flex items-center gap-1">
                      <span>{client.name}</span><ExternalLink className="w-3 h-3 text-[var(--color-text-muted)]" />
                    </Link>
                  ) : <span className="text-[var(--color-text-muted)] italic">Unassigned Client</span>}
                  {client?.phone && (
                    <div className="mt-1.5 flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Shoot Schedule & Location</span>
                  <div className="space-y-1 text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-1.5 font-medium"><Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /><span className="font-mono text-[var(--color-text)]">{shoot.date}</span></div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /><span>{shoot.location}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Deliverables & Asset Links</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">High-res videos, social cuts, and cloud storage links for client handover</p>
                </div>
                <button type="button" onClick={() => setIsEditFormOpen(true)} className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">+ Manage Assets</button>
              </div>
              {(!shoot.deliverables || shoot.deliverables.length === 0) ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No deliverables specified yet. Click &ldquo;Manage Assets&rdquo; to add video reels or photo sets.</div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {shoot.deliverables.map((item, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[var(--color-bg-hover)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center font-bold text-xs text-[var(--color-text-secondary)]">{item.count}x</div>
                        <div>
                          <span className="font-semibold text-xs text-[var(--color-text)] block">{item.type}</span>
                          <span className="text-[11px] text-[var(--color-text-secondary)]">Quantity: {item.count} asset{item.count > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {item.fileLink ? (
                          <>
                            <a href={item.fileLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors truncate max-w-xs">
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" /> <span>Open Cloud Drive</span>
                            </a>
                            <button type="button" onClick={() => handleCopyLink(item.fileLink!, idx)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded transition-colors" title="Copy URL">
                              {copiedLinkIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        ) : <span className="text-[11px] text-[var(--color-text-muted)] italic">No cloud URL linked</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Freelance Crew & Payouts</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">Videographers on set and individual payout vouchers</p>
                </div>
                <button type="button" onClick={() => setIsEditFormOpen(true)} className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">+ Assign Crew</button>
              </div>
              {(!shoot.assignments || shoot.assignments.length === 0) ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No cameramen assigned to this shoot.</div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {shoot.assignments.map((assignment, idx) => {
                    const cam = cameramanMap.get(assignment.cameramanId);
                    return (
                      <div key={idx} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[var(--color-bg-hover)] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)]"><Video className="w-4 h-4" /></div>
                          <div>
                            {cam ? <Link to={`/cameramen/${cam.id}`} className="font-semibold text-xs text-[var(--color-text)] hover:underline transition-colors">{cam.name}</Link> : <span className="font-semibold text-xs text-[var(--color-text)]">Unknown Operator</span>}
                            <p className="text-[11px] text-[var(--color-text-secondary)]">Agreed shoot rate: {formatCurrency(assignment.amount)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" disabled={assignment.amount === null} onClick={() => setPaymentConfirmation({ index: idx, paid: !assignment.paid, label: 'cameraman payout' })} className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${assignment.paid ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 disabled:opacity-50'}`}>
                            {assignment.paid ? <><CheckCircle2 className="w-3.5 h-3.5" /><span>Paid</span></> : <><Clock className="w-3.5 h-3.5" /><span>Mark Paid</span></>}
                          </button>
                          <button type="button" disabled={assignment.amount === null} onClick={() => assignment.amount !== null && setCameramanReceiptModal({ cameramanId: assignment.cameramanId, amount: assignment.amount, paid: assignment.paid, paidAt: assignment.paidAt })} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--color-accent)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50" title="Generate payout receipt">
                            <FileText className="w-3.5 h-3.5" /><span>Voucher PDF</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-4">
              <h3 className="font-serif text-base font-bold text-[var(--color-text)] border-b border-[var(--color-border)] pb-2">Financial Breakdown</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-secondary)]">Gross Client Bill:</span>
                  <span className="font-bold font-mono text-[var(--color-text)] text-sm">{formatCurrency(shoot.clientAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                  <span className="text-[var(--color-text-secondary)]">Freelance Crew Payouts:</span>
                  <span className="font-mono font-medium">- {formatCurrency(totalCrewPayouts)}</span>
                </div>
                <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                  <span className="text-[var(--color-text-secondary)]">Direct Job Expenses:</span>
                  <span className="font-mono font-medium">- {formatCurrency(shootDirectExpenses)}</span>
                </div>
                <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                  <span className="font-bold text-[var(--color-text)]">Net Profit Margin:</span>
                  <div className="text-right">
                    <span className={`font-serif text-base font-bold block ${netMargin >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>{formatCurrency(netMargin)}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-semibold">({marginPercentage}% margin)</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-[var(--color-border)]">
                <button type="button" onClick={() => setIsClientInvoiceModalOpen(true)} className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-md transition-colors shadow-xs">
                  <FileText className="w-4 h-4" /> <span>View / Print Client Invoice</span>
                </button>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-sm font-bold text-[var(--color-text)]">Tagged Expenses ({expenses.filter(e => e.shootId === shoot.id).length})</h4>
                <Link to="/expenses" className="text-xs font-semibold text-[var(--color-accent)] hover:underline">+ Add Expense</Link>
              </div>
              {expenses.filter(e => e.shootId === shoot.id).length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">No direct expenses logged for this shoot job yet.</p>
              ) : (
                <div className="space-y-2">
                  {expenses.filter(e => e.shootId === shoot.id).map(exp => (
                    <div key={exp.id} className="p-2.5 bg-[var(--color-bg)] rounded border border-[var(--color-border)] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium text-[var(--color-text)] block">{exp.description}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] capitalize">{exp.category} &bull; {exp.date}</span>
                      </div>
                      <span className="font-mono font-semibold text-[var(--color-text)]">{formatCurrency(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ShootForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} initialShoot={shoot} />
      {isClientInvoiceModalOpen && client && <InvoicePreviewModal isOpen={isClientInvoiceModalOpen} onClose={() => setIsClientInvoiceModalOpen(false)} type="client_invoice" client={client} shoot={shoot} />}
      {cameramanReceiptModal && <InvoicePreviewModal isOpen={Boolean(cameramanReceiptModal)} onClose={() => setCameramanReceiptModal(null)} type="cameraman_receipt" cameraman={cameramanMap.get(cameramanReceiptModal.cameramanId)} shoot={shoot} assignmentAmount={cameramanReceiptModal.amount} assignmentPaid={cameramanReceiptModal.paid} assignmentPaidAt={cameramanReceiptModal.paidAt} />}
      <ConfirmDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} onConfirm={handleConfirmDelete} title="Delete Shoot Record" message="Are you sure you want to delete this shoot? It will be moved to the recycle bin." confirmLabel="Delete Shoot" isDestructive />
      <ConfirmDialog isOpen={Boolean(paymentConfirmation)} onClose={() => setPaymentConfirmation(null)} onConfirm={handleConfirmPayment}
        title="Update Payment Status" message={`Confirm this ${paymentConfirmation?.label || 'payment'} as ${paymentConfirmation?.paid ? 'paid' : 'pending'}?`} confirmLabel={paymentConfirmation?.paid ? 'Mark Paid' : 'Mark Pending'} isDestructive={false} />
    </div>
  );
};
