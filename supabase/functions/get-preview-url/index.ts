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
    const { file_id } = await req.json()

    if (!file_id) {
      return new Response(
        JSON.stringify({ error: 'File ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Use two clients: one to resolve the authenticated user from the incoming JWT
    // and a service-role client for privileged operations (signed URLs, joins).
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const svcClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE') ?? '',
    )

    // Resolve user from the incoming token
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch file record using the service client (bypass RLS for server-side checks)
    const { data: file, error: fileError } = await svcClient
      .from('files')
      .select('*')
      .eq('id', file_id)
      .eq('is_trashed', false)
      .maybeSingle()

    if (fileError || !file) {
      return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Permission checks (server-side enforcement)
    let hasAccess = false
    if (file.owner_id === user.id) {
      hasAccess = true
    } else {
      // Check share record (supports 'shared_user_id' column)
      const { data: share } = await svcClient
        .from('shares')
        .select('*')
        .eq('file_id', file_id)
        .eq('shared_user_id', user.id)
        .maybeSingle()

      if (share) {
        hasAccess = true
      } else {
        // Check for public share (optional extension) and expiry
        const { data: publicShare } = await svcClient
          .from('shares')
          .select('*')
          .eq('file_id', file_id)
          .eq('is_public', true)
          .maybeSingle()

        if (publicShare) {
          if (!publicShare.expiry_date || new Date(publicShare.expiry_date) > new Date()) {
            hasAccess = true
          }
        }
      }
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Generate signed URL for preview (300 seconds expiry) using service client
    const bucket = Deno.env.get('SUPABASE_STORAGE_BUCKET') ?? 'cloud-drive'
    const { data: signedUrlData, error: signedUrlError } = await svcClient
      .storage
      .from(bucket)
      .createSignedUrl(file.storage_path, 300)

    if (signedUrlError || !signedUrlData) {
      return new Response(JSON.stringify({ error: 'Failed to generate preview URL' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Update last accessed timestamp (audit) server-side
    await svcClient.from('files').update({ last_accessed: new Date().toISOString() }).eq('id', file_id)

    return new Response(JSON.stringify({ signedUrl: signedUrlData.signedUrl }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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
