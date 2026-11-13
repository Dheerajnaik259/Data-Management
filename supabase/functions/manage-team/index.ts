import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const roles = ['admin', 'founder_ceo', 'founder_coo', 'social_media_manager'];
const founderRoles = ['founder', 'founder_ceo', 'founder_coo'];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication is required.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Team invitation service is not configured.' }, 500);

  const accessToken = authorization.slice('Bearer '.length);
  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await service.auth.getUser(accessToken);
  if (authError || !authData.user) return json({ error: 'Your session is invalid or expired.' }, 401);

  const { data: actor, error: actorError } = await service
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (actorError) return json({ error: 'Unable to verify your Admin role.' }, 500);
  if (actor?.role !== 'admin') return json({ error: 'Only Admin / Manager can manage team members.' }, 403);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  if (input.action === 'list') {
    const { data, error } = await service.from('profiles').select('id,email,name,role,created_at').order('created_at');
    if (error) return json({ error: `Unable to load team: ${error.message}` }, 500);
    return json({ members: (data || []).map(member => ({ id: member.id, email: member.email, name: member.name, role: member.role, createdAt: member.created_at })) });
  }

  if (!roles.includes(String(input.role))) return json({ error: 'Choose a valid team role.' }, 400);
  if (founderRoles.includes(String(input.role))) {
    return json({ error: 'Only a Founder can assign a Founder role.' }, 403);
  }

  if (input.action === 'invite') {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 100) return json({ error: 'Name is required and must be 100 characters or fewer.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: 'Enter a valid email address.' }, 400);

    const siteUrl = Deno.env.get('APP_URL');
    const inviteOptions = siteUrl ? { data: { full_name: name }, redirectTo: `${siteUrl.replace(/\/$/, '')}/login` } : { data: { full_name: name } };
    const { data: inviteData, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, inviteOptions);
    if (inviteError || !inviteData.user) return json({ error: inviteError?.message || 'Supabase did not return the invited user.' }, 400);

    const { error: profileError } = await service.from('profiles').insert({
      id: inviteData.user.id,
      email,
      name,
      role: input.role,
    });
    if (profileError) {
      const { error: rollbackError } = await service.auth.admin.deleteUser(inviteData.user.id);
      if (rollbackError) console.error('Invite rollback failed:', rollbackError.message);
      return json({ error: `Invitation was sent, but the ERP profile could not be created: ${profileError.message}` }, 500);
    }

    return json({ member: { id: inviteData.user.id, email, name, role: input.role } }, 201);
  }

  if (input.action === 'update_role') {
    const memberId = typeof input.memberId === 'string' ? input.memberId : '';
    if (!memberId) return json({ error: 'Member ID is required.' }, 400);
    if (memberId === authData.user.id) return json({ error: 'You cannot change your own role.' }, 400);

    const { data: target, error: targetError } = await service.from('profiles').select('id').eq('id', memberId).maybeSingle();
    if (targetError) return json({ error: `Unable to find that team member: ${targetError.message}` }, 500);
    if (!target) return json({ error: 'Team member not found.' }, 404);

    const { error } = await service.from('profiles').update({ role: input.role }).eq('id', memberId);
    if (error) return json({ error: `Unable to update team role: ${error.message}` }, 500);
    return json({ success: true });
  }

  return json({ error: 'Unknown team-management action.' }, 400);
});
