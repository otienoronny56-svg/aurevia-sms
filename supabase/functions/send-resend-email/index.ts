// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code is designed to run in Supabase Edge Functions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

interface EmailRequest {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  replyTo?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, from, subject, html, replyTo }: EmailRequest = await req.json();

    const recipients = Array.isArray(to) ? to : [to];
    const fromAddress = from || Deno.env.get("RESEND_FROM_EMAIL") || "Aurevia Specialty Coffee Academy <noreply@aureviacoffeeinstitute.co.ke>";

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY secret is not configured in Supabase Edge Functions. Please add RESEND_API_KEY to your Supabase project secrets.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject,
        html,
        reply_to: replyTo || "info@aureviacoffeeinstitute.co.ke",
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: res.status,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
