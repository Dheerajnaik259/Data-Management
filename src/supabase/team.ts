import { supabase, isSupabaseConfigured } from './config';
import { ASSIGNABLE_ROLES } from '../utils/permissions';

export type AssignableRole = typeof ASSIGNABLE_ROLES[number]['value'];

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

async function invokeTeamAction<T>(body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('manage-team', { body });
  if (error) {
    if (error.name === 'FunctionsFetchError' || /failed to send a request/i.test(error.message)) {
      throw new Error('The team-management Edge Function is not reachable. Deploy supabase/functions/manage-team to the Supabase project configured in .env.local, then try again. Also check your network connection.');
    }
    throw new Error(error.message || 'Unable to manage team members.');
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const data = await invokeTeamAction<{ members: TeamMember[] }>({ action: 'list' });
  return data.members.map(member => ({ ...member, createdAt: member.createdAt || '' }));
}

export async function inviteTeamMember(input: { email: string; name: string; role: AssignableRole }): Promise<void> {
  await invokeTeamAction({ action: 'invite', ...input });
}

export async function updateTeamMemberRole(memberId: string, role: AssignableRole): Promise<void> {
  await invokeTeamAction({ action: 'update_role', memberId, role });
}
