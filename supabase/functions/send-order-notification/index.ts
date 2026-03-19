import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "web-push";

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

    // Get VAPID keys
    const { data: vapidData } = await supabase
      .from('vapid_keys')
      .select('*')
      .eq('id', 'default')
      .single();

    if (!vapidData) {
      console.warn('VAPID keys not configured yet');
      return new Response(
        JSON.stringify({ sent: 0, error: 'VAPID keys not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(
      'mailto:push@restaurant.app',
      vapidData.public_key,
      vapidData.private_key
    );

    const body = await req.json();
    const { type, record } = body;

    let targetType = 'admin';
    let targetId: string | null = null;
    let title = '';
    let notifBody = '';
    let tag = 'new-order';
    let url = '/admin/orders';

    if (type === 'driver_assigned') {
      targetType = 'driver';
      targetId = record.driver_id;
      title = '🚚 Novo Pedido de Entrega';
      notifBody = `Pedido #${record.id} - ${record.customer_name}. Toque para visualizar.`;
      tag = `driver-new-order-${record.id}`;
      url = '/driver/dashboard';
    } else if (type === 'new_order') {
      title = '🍔 Novo Pedido!';
      notifBody = `Pedido #${record.id} - ${record.customer_name}`;
      tag = 'new-order';
      url = '/admin/orders';
    } else if (type === 'waiter_item_ready') {
      targetType = 'waiter';
      targetId = record.waiter_id || null;
      const tableName = record.table_name || `Mesa ${record.table_number || '?'}`;
      title = '🍽️ Pedido Pronto!';
      notifBody = `${record.product_name} - ${tableName} está pronto para servir!`;
      tag = `waiter-ready-${record.item_id || Date.now()}`;
      url = '/waiter/dashboard';
    } else {
      return new Response(
        JSON.stringify({ sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_type', targetType);

    if (targetType === 'driver' && targetId) {
      query = query.eq('user_identifier', targetId);
    }

    const { data: subscriptions } = await query;

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body: notifBody, tag, url }),
          {
            // TTL de 24h: garante entrega mesmo quando o celular está em deep sleep
            // ou com pouca bateria (o servidor de push tenta por 24h antes de descartar)
            TTL: 86400,
            urgency: 'high',
          }
        );
        sent++;
      } catch (err: any) {
        console.error('Push failed for', sub.endpoint, err.statusCode || err.message);
        if (err.statusCode === 404 || err.statusCode === 410) {
          failed.push(sub.id);
        }
      }
    }

    // Clean up invalid subscriptions
    if (failed.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', failed);
    }

    console.log(`Push sent: ${sent}, failed: ${failed.length}`);

    return new Response(
      JSON.stringify({ sent, failed: failed.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-order-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
