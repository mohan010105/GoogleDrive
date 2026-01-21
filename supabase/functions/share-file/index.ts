import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    // Accept either `shared_user_id` or `shared_user_email` for convenience
    const file_id = body.file_id
    const shared_user_id = body.shared_user_id
    const shared_user_email = body.shared_user_email
    const role = body.role

    if (!file_id || (!shared_user_id && !shared_user_email) || !role) {
      return new Response(
        JSON.stringify({ error: 'File ID, shared user ID, and role are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Auth client to resolve the caller, service client for privileged writes
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const svcClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE') ?? '',
    )

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Verify the requester owns the file
    const { data: file, error: fileError } = await svcClient
      .from('files')
      .select('*')
      .eq('id', file_id)
      .eq('is_trashed', false)
      .maybeSingle()

    if (fileError || !file || file.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'File not found or access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Resolve recipient by id or by email
    let recipientId = shared_user_id
    if (!recipientId && shared_user_email) {
      const { data: recipientUser, error: recipientError } = await svcClient
        .from('profiles')
        .select('id')
        .ilike('email', shared_user_email)
        .maybeSingle()

      if (recipientError || !recipientUser) {
        return new Response(JSON.stringify({ error: 'Recipient user not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      recipientId = recipientUser.id
    }

    // Prevent duplicate share records; if exists update role, otherwise insert
    const { data: existing } = await svcClient
      .from('shares')
      .select('*')
      .eq('file_id', file_id)
      .eq('shared_user_id', recipientId)
      .maybeSingle()

    if (existing) {
      if (existing.role !== role) {
        await svcClient.from('shares').update({ role, updated_at: new Date().toISOString() }).eq('id', existing.id)
      }
    } else {
      const { error: shareError } = await svcClient
        .from('shares')
        .insert({
          file_id: file_id,
          shared_user_id: recipientId,
          role: role,
          shared_by: user.id,
          created_at: new Date().toISOString()
        })

      if (shareError) {
        return new Response(JSON.stringify({ error: 'Failed to share file' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // When using Supabase Realtime the client will receive INSERT/UPDATE on 'shares'
    return new Response(JSON.stringify({ message: 'File shared successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
