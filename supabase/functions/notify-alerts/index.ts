import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface AlertRecord {
  id: string;
  competitor_id: string;
  user_id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  created_at: string;
}

interface WebhookPayload {
  type: "INSERT";
  table: "alerts";
  schema: "public";
  record: AlertRecord;
  old_record: null;
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const alert = payload.record;

    if (!alert || payload.table !== "alerts" || payload.type !== "INSERT") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = adminClient();

    // 1. Fetch user's notification preferences
    const { data: userProfile } = await sb
      .from("profiles")
      .select("slack_webhook_url, email_notifications_enabled, email")
      .eq("id", alert.user_id)
      .maybeSingle();

    if (!userProfile) {
      return new Response(JSON.stringify({ status: "skipped", reason: "no_profile" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only immediately notify for high/critical priority unless specified
    const shouldNotifyNow = alert.priority === "critical" || alert.priority === "high";

    if (!shouldNotifyNow) {
       // Low/Medium alerts can be batched in a digest (not implemented in this v1)
       return new Response(JSON.stringify({ status: "queued_for_digest" }), {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    const dispatches = [];

    // 2. Dispatch to Slack if configured
    if (userProfile.slack_webhook_url) {
      const color = alert.priority === "critical" ? "#dc2626" : "#f59e0b";
      const slackPayload = {
        attachments: [
          {
            color,
            title: `Radar Alert: ${alert.title}`,
            text: alert.message,
            fields: [
              { title: "Category", value: alert.category, short: true },
              { title: "Priority", value: alert.priority.toUpperCase(), short: true }
            ],
            footer: "Radar Competitive Intelligence",
            ts: Math.floor(new Date(alert.created_at).getTime() / 1000)
          }
        ]
      };

      dispatches.push(
        fetch(userProfile.slack_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackPayload),
        }).catch(err => console.error("Slack webhook failed:", err))
      );
    }

    // 3. Dispatch Email (simulated for V1 via console log, would connect to Resend/SendGrid)
    if (userProfile.email_notifications_enabled) {
      console.log(`[EMAIL DISPATCH to ${userProfile.email}]: ${alert.title} - ${alert.message}`);
      // In a real app: await resend.emails.send({ ... })
    }

    await Promise.all(dispatches);

    return new Response(JSON.stringify({ status: "success", dispatches: dispatches.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("notify-alerts error:", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
