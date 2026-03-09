import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check for existing keys
    const { data: existing } = await supabase
      .from('vapid_keys')
      .select('public_key')
      .eq('id', 'default')
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ publicKey: existing.public_key }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new VAPID keys
    const vapidKeys = webpush.generateVAPIDKeys();

    const { error } = await supabase.from('vapid_keys').insert({
      id: 'default',
      public_key: vapidKeys.publicKey,
      private_key: vapidKeys.privateKey,
    });

    if (error) {
      console.error('Failed to store VAPID keys:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ publicKey: vapidKeys.publicKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in get-vapid-key:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
