-- Link personalized plan requests to the evaluation that generated them.

ALTER TABLE public.contact_requests
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_requests_user_id
    ON public.contact_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_contact_requests_evaluation_id
    ON public.contact_requests (evaluation_id);

CREATE INDEX IF NOT EXISTS idx_contact_requests_email
    ON public.contact_requests (email);

ALTER TABLE public.evaluations
    ADD COLUMN IF NOT EXISTS plan_requested_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS plan_request_id UUID REFERENCES public.contact_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_evaluations_plan_requested_at
    ON public.evaluations (plan_requested_at);

UPDATE public.automation_webhook_configs
SET
    label = 'Autoavaliação concluída sem plano',
    description = 'Dispara após o atraso configurado somente se a pessoa ainda não tiver solicitado o plano personalizado desta autoavaliação.',
    updated_at = timezone('utc'::text, now())
WHERE event_type = 'fatigue_assessment_completed';
