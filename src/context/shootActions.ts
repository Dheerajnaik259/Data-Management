import { AuthUser, ManagedCollection, Shoot } from '../types';
import { updateShootOperationalData } from '../supabase/data';
import { canCreateDirect } from '../utils/permissions';
import { useToast } from './ToastContext';

type Toast = ReturnType<typeof useToast>['toast'];
type UpdateOrSubmit = (
  collection: ManagedCollection,
  docId: string,
  data: Record<string, unknown>,
) => Promise<void>;

interface ShootActionDependencies {
  shoots: Shoot[];
  user: AuthUser | null;
  toast: Toast;
  handleUpdateOrSubmit: UpdateOrSubmit;
}

export function createShootActions({ shoots, user, toast, handleUpdateOrSubmit }: ShootActionDependencies) {
  const handleToggleClientPayment = async (shootId: string, isPaid: boolean) => {
    try {
      const shoot = shoots.find(item => item.id === shootId);
      if (!shoot) throw new Error('Shoot not found.');
      if (shoot.clientPaid && !isPaid) {
        throw new Error('A confirmed client payment cannot be changed back to pending.');
      }
      if (!shoot.clientPaid && isPaid && !window.confirm('Mark this client payment as paid? This is final and cannot be changed back to pending.')) return;
      await updateShootOperationalData(shootId, { clientPaid: isPaid, clientPaidAt: isPaid ? new Date().toISOString() : null });
      toast({ type: 'success', message: isPaid ? 'Client payment marked paid. This status is final.' : 'Client payment marked pending.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update client payment status';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleToggleCameramanPayment = async (shootId: string, index: number, isPaid: boolean) => {
    try {
      const shoot = shoots.find(item => item.id === shootId);
      if (!shoot?.assignments?.[index]) return;
      if (shoot.assignments[index].paid && !isPaid) {
        throw new Error('A confirmed crew payout cannot be changed back to pending.');
      }
      if (!shoot.assignments[index].paid && isPaid && !window.confirm('Mark this crew payout as paid? This is final and cannot be changed back to pending.')) return;
      const updated = [...shoot.assignments];
      if (updated[index].amount === null && isPaid) throw new Error('Set the cameraman payout before marking it paid.');
      updated[index] = { ...updated[index], paid: isPaid, paidAt: isPaid ? new Date().toISOString() : null };
      await updateShootOperationalData(shootId, { assignments: updated });
      toast({ type: 'success', message: isPaid ? 'Crew payout marked paid. This status is final.' : 'Crew payout marked pending.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update crew payout status';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleSetCameramanRate = async (shootId: string, index: number, amount: number) => {
    try {
      const shoot = shoots.find(item => item.id === shootId);
      if (!shoot?.assignments?.[index]) return;
      const updated = [...shoot.assignments];
      updated[index] = { ...updated[index], amount };
      await handleUpdateOrSubmit('shoots', shootId, { ...shoot, assignments: updated });
      toast({
        type: 'success',
        message: canCreateDirect(user?.role || '') ? 'Payout rate updated.' : 'Payout rate submitted for Founder approval.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save payout rate';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleToggleCameramanCheckIn = async (shootId: string, index: number, checkedIn: boolean) => {
    try {
      const shoot = shoots.find(item => item.id === shootId);
      if (!shoot?.assignments?.[index]) return;
      const updated = [...shoot.assignments];
      updated[index] = { ...updated[index], checkedInAt: checkedIn ? new Date().toISOString() : null };
      await updateShootOperationalData(shootId, { assignments: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update crew check-in';
      toast({ type: 'error', message });
      throw err;
    }
  };

  return {
    handleToggleClientPayment,
    handleToggleCameramanPayment,
    handleSetCameramanRate,
    handleToggleCameramanCheckIn,
  };
}
