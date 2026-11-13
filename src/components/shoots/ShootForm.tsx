import React, { useState, useEffect } from 'react';
import { SlideOver } from '../common/SlideOver';
import { Shoot, CameramanAssignment, Deliverable, ChangeRequest } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { canSubmitCollectionForApproval } from '../../utils/permissions';
import { parseOperationalSettings } from '../../config/business';
import { cancelWhatsAppDraftTabs, completeWhatsAppDraftTabs, prepareWhatsAppDraftTabs } from '../../utils/whatsapp';
import { useToast } from '../../context/ToastContext';
import { ShootFormFields } from './ShootFormFields';
import {
  buildScheduleWhatsAppDrafts,
  getInitialShootFormValues,
  getShootFormTitle,
  getShootSubmitLabel,
  shouldOpenScheduleWhatsApp,
  ShootFormValues,
  submitShootForm,
  validateShootForm,
} from './shootFormLogic';

interface ShootFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialShoot?: Shoot | null;
  resubmission?: ChangeRequest | null;
}

export const ShootForm: React.FC<ShootFormProps> = ({ isOpen, onClose, initialShoot, resubmission }) => {
  const { shoots, clients, cameramen, settings, handleCreateOrSubmit, handleUpdateOrSubmit, handleEditAndResubmit, getSettingsOptions } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [callTime, setCallTime] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<string>('');
  const [clientAmount, setClientAmount] = useState<number>(0);
  const [assignments, setAssignments] = useState<CameramanAssignment[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusOptions = getSettingsOptions('shootStatus');
  const defaultStatus = statusOptions[0]?.value || '';

  useEffect(() => {
    if (!isOpen) return;
    const values = getInitialShootFormValues({ resubmission, initialShoot, shoots, clients, defaultStatus });
    setClientId(values.clientId);
    setDate(values.date);
    setCallTime(values.callTime);
    setLocation(values.location);
    setStatus(values.status);
    setClientAmount(values.clientAmount);
    setAssignments(values.assignments);
    setDeliverables(values.deliverables);
    setErrorMessage(null);
  }, [isOpen, initialShoot?.id, resubmission?.id, shoots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setErrorMessage(null);

    const values: ShootFormValues = { clientId, date, callTime, location, status, clientAmount, assignments, deliverables };
    const validationError = validateShootForm(values);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    const shouldOpenWhatsApp = shouldOpenScheduleWhatsApp(initialShoot, resubmission, status, user?.role);
    const operationalSettings = parseOperationalSettings(settings.find(setting => setting.key === 'operationalSettings'));
    const whatsappDrafts = buildScheduleWhatsAppDrafts(
      shouldOpenWhatsApp, values, clients, cameramen, operationalSettings.crewScheduleTemplate,
    );
    const whatsappTabs = prepareWhatsAppDraftTabs(whatsappDrafts);
    try {
      await submitShootForm({
        resubmission,
        initialShoot,
        values,
        handlers: { handleCreateOrSubmit, handleUpdateOrSubmit, handleEditAndResubmit },
      });
    } catch {
      cancelWhatsAppDraftTabs(whatsappTabs);
      setErrorMessage('Failed to save shoot details. Try again.');
      setIsSaving(false);
      return;
    }

    const blockedRecipients = completeWhatsAppDraftTabs(whatsappTabs);
    if (blockedRecipients.length > 0) {
      toast({
        type: 'warning',
        message: `Shoot scheduled, but your browser blocked WhatsApp for: ${blockedRecipients.join(', ')}. Open the shoot details to launch each message draft.`,
      });
    }
    onClose();
    setIsSaving(false);
  };

  const isAdmin = Boolean(user && canSubmitCollectionForApproval(user.role, 'shoots'));
  const submitLabel = getShootSubmitLabel(isSaving, resubmission, initialShoot, isAdmin);
  const values: ShootFormValues = { clientId, date, callTime, location, status, clientAmount, assignments, deliverables };

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} widthClass="max-w-2xl"
      title={getShootFormTitle(resubmission, initialShoot)}
      subtitle="Job details, client billing, crew assignments, and deliverables">
      <ShootFormFields
        values={values}
        onChange={{
          clientId: setClientId,
          date: setDate,
          callTime: setCallTime,
          location: setLocation,
          status: setStatus,
          clientAmount: setClientAmount,
          assignments: setAssignments,
          deliverables: setDeliverables,
        }}
        clients={clients}
        cameramen={cameramen}
        statusOptions={statusOptions}
        errorMessage={errorMessage}
        isSaving={isSaving}
        submitLabel={submitLabel}
        onClose={onClose}
        onSubmit={handleSubmit}
      />
    </SlideOver>
  );
};
