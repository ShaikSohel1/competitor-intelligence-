-- Add notification preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS slack_webhook_url text,
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Create the Webhook Trigger for Alerts
-- This uses pg_net to call the notify-alerts Edge Function whenever a new alert is inserted.
-- Note: In a real Supabase hosted project, Database Webhooks can be managed via the UI, 
-- but this sets up the underlying pg_net call explicitly.

CREATE OR REPLACE FUNCTION public.trigger_notify_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := coalesce(current_setting('app.settings.edge_function_base_url', true), 'http://kong:8000/functions/v1') || '/notify-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), 'anon')
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'alerts',
      'schema', 'public',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_alert_created ON public.alerts;
CREATE TRIGGER on_alert_created
  AFTER INSERT ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_alerts();


-- 2. Setup pg_cron for Scheduled Scans
-- We need to invoke scan-competitor for each active competitor every 12 hours.
-- pg_cron runs queries on a schedule. We can use it to hit pg_net to trigger the scan-competitor Edge Function.

CREATE OR REPLACE FUNCTION public.schedule_competitor_scans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  comp record;
  base_url text;
  auth_header text;
BEGIN
  base_url := coalesce(current_setting('app.settings.edge_function_base_url', true), 'http://kong:8000/functions/v1');
  auth_header := 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), 'anon');

  FOR comp IN 
    SELECT id 
    FROM public.competitors 
    WHERE last_scanned_at IS NULL OR last_scanned_at < now() - interval '12 hours'
  LOOP
    PERFORM net.http_post(
      url := base_url || '/scan-competitor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', auth_header
      ),
      body := jsonb_build_object('competitorId', comp.id)
    );
  END LOOP;
END;
$$;

-- Schedule the job to run every hour, checking for competitors that need a scan (12h cooldown)
SELECT cron.schedule(
  'competitor-scan-job',
  '0 * * * *', -- Every hour
  $$ SELECT public.schedule_competitor_scans(); $$
);
