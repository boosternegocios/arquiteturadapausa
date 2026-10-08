-- Configurable webhook automation rules for journey events.

CREATE TABLE IF NOT EXISTS public.automation_webhook_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    event_type TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    webhook_url TEXT,
    delay_seconds INTEGER NOT NULL DEFAULT 0 CHECK (delay_seconds >= 0),
    is_active BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.automation_webhook_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    config_id UUID REFERENCES public.automation_webhook_configs(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.automation_events(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_key TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    webhook_url TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

CREATE OR REPLACE FUNCTION public.set_automation_webhook_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_automation_webhook_configs_updated_at ON public.automation_webhook_configs;
CREATE TRIGGER trg_automation_webhook_configs_updated_at
BEFORE UPDATE ON public.automation_webhook_configs
FOR EACH ROW
EXECUTE FUNCTION public.set_automation_webhook_updated_at();

DROP TRIGGER IF EXISTS trg_automation_webhook_deliveries_updated_at ON public.automation_webhook_deliveries;
CREATE TRIGGER trg_automation_webhook_deliveries_updated_at
BEFORE UPDATE ON public.automation_webhook_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.set_automation_webhook_updated_at();

ALTER TABLE public.automation_webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_automation_webhook_configs_event_type
    ON public.automation_webhook_configs (event_type);

CREATE INDEX IF NOT EXISTS idx_automation_webhook_deliveries_status_scheduled
    ON public.automation_webhook_deliveries (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_automation_webhook_deliveries_event_type
    ON public.automation_webhook_deliveries (event_type);

CREATE INDEX IF NOT EXISTS idx_automation_webhook_deliveries_created_at
    ON public.automation_webhook_deliveries (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_webhook_deliveries_config_event_key
    ON public.automation_webhook_deliveries (config_id, event_key)
    WHERE event_key IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'automation_webhook_configs'
          AND policyname = 'Admins gerenciam configurações de webhook'
    ) THEN
        CREATE POLICY "Admins gerenciam configurações de webhook"
            ON public.automation_webhook_configs FOR ALL
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.admins
                    WHERE admins.email = (auth.jwt() ->> 'email')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.admins
                    WHERE admins.email = (auth.jwt() ->> 'email')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'automation_webhook_deliveries'
          AND policyname = 'Admins veem entregas de webhook'
    ) THEN
        CREATE POLICY "Admins veem entregas de webhook"
            ON public.automation_webhook_deliveries FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.admins
                    WHERE admins.email = (auth.jwt() ->> 'email')
                )
            );
    END IF;
END $$;

INSERT INTO public.automation_webhook_configs (
    event_type,
    label,
    description,
    delay_seconds,
    is_active,
    sort_order
)
VALUES
    ('user_registered', 'Cadastro realizado', 'Dispara depois que a pessoa cria a conta no sistema.', 0, false, 1),
    ('fatigue_assessment_started', 'Autoavaliação iniciada', 'Dispara quando uma avaliação começa e o crédito é consumido.', 0, false, 2),
    ('assessment_draft_stale', 'Autoavaliação parada em rascunho', 'Dispara se a avaliação continuar em andamento após o prazo configurado.', 86400, false, 3),
    ('fatigue_assessment_completed', 'Autoavaliação concluída', 'Dispara sempre que uma autoavaliação é finalizada.', 0, false, 4),
    ('plan_requested', 'Plano personalizado solicitado', 'Dispara quando a pessoa envia o formulário de plano de ação.', 0, false, 5)
ON CONFLICT (event_type) DO UPDATE
SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    updated_at = timezone('utc'::text, now());
