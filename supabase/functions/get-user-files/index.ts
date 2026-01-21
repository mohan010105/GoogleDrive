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
    // Create an auth client (resolve user) and a service client for privileged joins
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
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch files owned by the user (server-side)
    const { data: ownedFiles, error: ownedError } = await svcClient
      .from('files')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_trashed', false)

    if (ownedError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch owned files' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch shares referencing the user, joining the file record and the role
    const { data: sharedFilesData, error: sharedError } = await svcClient
      .from('shares')
      .select(`file_id, role, file:files (id, name, folder_id, owner_id, storage_path, mime_type, size, is_starred, is_trashed, current_version, created_at, updated_at, last_accessed)`)
      .eq('shared_user_id', user.id)

    if (sharedError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch shared files' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const sharedFiles = (sharedFilesData || [])
      .map((row: any) => ({ ...row.file, _share_role: row.role }))
      .filter((f: any) => f && !f.is_trashed)

    // Merge owned + shared and dedupe
    const allFiles = [...(ownedFiles || []), ...sharedFiles]
    const uniqueFiles = allFiles.filter((file: any, index: number, self: any[]) => index === self.findIndex(f => f.id === file.id))

    return new Response(JSON.stringify({ files: uniqueFiles }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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
