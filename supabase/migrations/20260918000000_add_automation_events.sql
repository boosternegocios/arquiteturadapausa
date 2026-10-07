-- Stores automation events sent from the app to external tools such as n8n.
-- The table is intentionally private: Edge Functions write through service role,
-- and admins can inspect events through controlled queries/views later.

CREATE TABLE IF NOT EXISTS public.automation_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    event_type TEXT NOT NULL,
    event_key TEXT,
    source TEXT NOT NULL DEFAULT 'system',
    user_id UUID,
    user_email TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (delivery_status IN ('pending', 'sent', 'failed', 'skipped')),
    delivery_target TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_automation_events_event_type
    ON public.automation_events (event_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_events_event_key
    ON public.automation_events (event_key)
    WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automation_events_user_id
    ON public.automation_events (user_id);

CREATE INDEX IF NOT EXISTS idx_automation_events_created_at
    ON public.automation_events (created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'automation_events'
          AND policyname = 'Admins podem ver eventos de automação'
    ) THEN
        CREATE POLICY "Admins podem ver eventos de automação"
            ON public.automation_events FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.admins
                    WHERE admins.email = (auth.jwt() ->> 'email')
                )
            );
    END IF;
END $$;
