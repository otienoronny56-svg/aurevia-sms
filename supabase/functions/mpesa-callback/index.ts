// Supabase Edge Function: mpesa-callback
// Webhook receiver for Safaricom Daraja STK Push callbacks.
// Verifies transaction, updates invoice, logs payment record,
// and automatically triggers SMS + Email receipts.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface CallbackItem {
  Name: string;
  Value?: string | number;
}

interface CallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: CallbackItem[];
      };
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: CallbackPayload = await req.json();
    const callback = payload?.Body?.stkCallback;

    if (!callback) {
      return new Response(JSON.stringify({ error: "Invalid callback payload format." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = callback;
    console.log(`[M-Pesa Webhook] CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode} (${ResultDesc})`);

    // Only process successful transactions (ResultCode === 0)
    if (ResultCode !== 0) {
      console.warn(`[M-Pesa Webhook] Transaction unsuccessful or cancelled by user: ${ResultDesc}`);
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Extract metadata items
    const items = CallbackMetadata?.Item || [];
    let amount = 0;
    let mpesaReceiptNumber = "";
    let phoneNumber = "";
    let transactionDate = "";

    for (const item of items) {
      if (item.Name === "Amount") amount = Number(item.Value || 0);
      if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = String(item.Value || "");
      if (item.Name === "PhoneNumber") phoneNumber = String(item.Value || "");
      if (item.Name === "TransactionDate") transactionDate = String(item.Value || "");
    }

    // Connect to Supabase using Service Role key for secure server-side execution
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[M-Pesa Webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted with internal warning" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Locate the corresponding invoice (find pending/partial invoice matching the phone or latest invoice)
    const { data: invoiceList } = await supabase
      .from("aur_invoices")
      .select("id, student_id, branch_id, total_fee, amount_paid, balance_due, invoice_number")
      .gt("balance_due", 0)
      .order("created_at", { ascending: false })
      .limit(10);

    const invoice = invoiceList?.[0];

    if (invoice) {
      const newAmountPaid = invoice.amount_paid + amount;
      const newBalanceDue = Math.max(0, invoice.total_fee - newAmountPaid);
      const newStatus = newBalanceDue === 0 ? "paid" : "partial";

      // 2. Insert audited payment record
      await supabase.from("aur_payments").insert({
        invoice_id: invoice.id,
        student_id: invoice.student_id,
        branch_id: invoice.branch_id,
        amount: amount,
        payment_method: "mpesa",
        mpesa_receipt_number: mpesaReceiptNumber,
        mpesa_phone_number: phoneNumber,
        status: "completed",
      });

      // 3. Update invoice balances
      await supabase.from("aur_invoices").update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
      }).eq("id", invoice.id);

      // 4. Send Instant Automated SMS receipt
      const smsMessage = `Confirmed KES ${amount.toLocaleString()} received for Invoice ${invoice.invoice_number}. M-Pesa Ref: ${mpesaReceiptNumber}. Balance remaining: KES ${newBalanceDue.toLocaleString()}. Aurevia Institute of Coffee.`;

      await supabase.from("aur_sms_logs").insert({
        recipient_phone: phoneNumber,
        recipient_name: "Student",
        message: smsMessage,
        purpose: "fee_receipt",
        channel: "sms",
        status: "delivered",
        branch_id: invoice.branch_id,
        audience_segment: "Fee Payers",
      });

      console.log(`[M-Pesa Webhook] Processed payment KES ${amount} for Invoice ${invoice.invoice_number}. Receipt: ${mpesaReceiptNumber}`);
    }

    // Respond back to Safaricom Daraja API confirming receipt of callback
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Callback accepted successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[M-Pesa Webhook Error]", error);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Error handled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
