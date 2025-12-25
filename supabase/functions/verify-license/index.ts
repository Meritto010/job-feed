import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS for mobile app requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Connect to Supabase with Admin rights
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { license_key, device_id } = await req.json()

    // 1. Find the license in your table
    const { data: license, error: fetchError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('key', license_key)
      .single()

    if (fetchError || !license) {
      return new Response(JSON.stringify({ error: 'Invalid license key' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Check if device is already registered
    const devices = license.devices || []
    if (devices.includes(device_id)) {
      return new Response(JSON.stringify({ success: true, message: 'Already active' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Check device limit (e.g., 1 device max)
    if (license.used_count >= license.max_devices) {
      return new Response(JSON.stringify({ error: 'Device limit reached' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Update the license: add this device ID
    const { error: updateError } = await supabaseAdmin
      .from('licenses')
      .update({
        used_count: license.used_count + 1,
        devices: [...devices, device_id]
      })
      .eq('key', license_key)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
                          
