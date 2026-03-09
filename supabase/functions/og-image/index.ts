/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getEnv(name: string) {
  return Deno.env.get(name) ?? "";
}

serve(async (req) => {
  try {
    // Support both standard Edge env names and Lovable/Vite env names as fallback
    const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
    const supabaseAnonKey =
      getEnv("SUPABASE_ANON_KEY") ||
      getEnv("SUPABASE_ANON_KEY") ||
      getEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

    // Safe fallback if env is missing
    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.redirect(new URL("/icon-512.png", req.url), 302);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc("get_public_store_config");

    const logoUrl = !error && data?.[0]?.logo_url ? String(data[0].logo_url) : null;
    if (!logoUrl) {
      // If no logo is configured, return 204 (no content) to avoid broken image.
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // IMPORTANT: Some crawlers (including WhatsApp) can be picky with redirects.
    // To maximize compatibility, fetch the logo and return the image bytes directly.
    const imgRes = await fetch(logoUrl);
    if (!imgRes.ok) {
      return new Response(null, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const contentType = imgRes.headers.get("content-type") || "image/png";
    const body = await imgRes.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Allow caching a bit to reduce repeated fetches by crawlers.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (_e) {
    return new Response(null, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
});
