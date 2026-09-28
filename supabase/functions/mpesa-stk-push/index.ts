// Supabase Edge Function: mpesa-stk-push
// Securely initiates Lipa Na M-Pesa Online (STK Push) using server-side Daraja credentials.
// Consumer Key & Secret NEVER touch the frontend client.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface STKPushRequest {
  action?: 'stk_push' | 'query_status';
  phoneNumber?: string;
  amount?: number;
  invoiceNumber?: string;
  studentRegNo?: string;
  checkoutRequestId?: string;
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('254')) return cleaned;
  if (cleaned.startsWith('+254')) return cleaned.slice(1);
  return '254' + cleaned;
}

async function getAccessToken(consumerKey: string, consumerSecret: string, isProduction: boolean): Promise<string> {
  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  const baseUrl = isProduction ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Daraja OAuth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: STKPushRequest = await req.json();

    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY") || "LA6i4Dxd6FH0V2ptUvQetCG4K5w6mOLSU4fkpGOihfH43jdd";
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET") || "WWQZ0C7k6v1G8YM4xG0iXGACAlwCNVc8r9jBQKYjsP6ZWiSdMoUsAWHJSE7aVvmv";
    const shortcode = Deno.env.get("MPESA_SHORTCODE") || "174379";
    const passkey = Deno.env.get("MPESA_PASSKEY") || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    const isProduction = Deno.env.get("MPESA_ENVIRONMENT") === "production";
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL") || "https://evxmyqnsiapiojsukxmh.supabase.co/functions/v1/mpesa-callback";

    const baseUrl = isProduction ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

    // Obtain OAuth Bearer Token
    const accessToken = await getAccessToken(consumerKey, consumerSecret, isProduction);

    // ACTION: QUERY STATUS OF PREVIOUS STK PUSH
    if (body.action === 'query_status' && body.checkoutRequestId) {
      const timestamp = getTimestamp();
      const password = btoa(`${shortcode}${passkey}${timestamp}`);

      const queryRes = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: body.checkoutRequestId,
        }),
      });

      const queryData = await queryRes.json();
      return new Response(JSON.stringify(queryData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ACTION: INITIATE NEW STK PUSH
    if (!body.phoneNumber || !body.amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phoneNumber and amount are mandatory." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const formattedPhone = formatPhone(body.phoneNumber);
    const timestamp = getTimestamp();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const safeAccountRef = (body.invoiceNumber || 'Aurevia')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-12) || 'AureviaFee';
    const safeDesc = 'TuitionFee';

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.max(1, Math.round(body.amount)).toString(),
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: safeAccountRef,
        TransactionDesc: safeDesc,
      }),
    });

    const stkData = await stkRes.json();

    return new Response(JSON.stringify(stkData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: stkRes.ok ? 200 : 400,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process STK Push request." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
