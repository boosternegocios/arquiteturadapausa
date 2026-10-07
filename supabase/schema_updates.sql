-- Migração incremental para alinhar um banco existente ao app atual.
-- Rode este arquivo no SQL Editor do Supabase somente quando decidir atualizar
-- o ambiente remoto. Ele não recria perguntas nem apaga dados existentes.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'admins'
          AND policyname = 'Admins podem ver seu próprio registro'
    ) THEN
        CREATE POLICY "Admins podem ver seu próprio registro"
            ON public.admins FOR SELECT
            USING ((auth.jwt() ->> 'email') = email);
    END IF;
END $$;

ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_satisfaction JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_time_relation JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_internal_speed JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_beliefs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_rhythm_impacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS top_fatigue_solution JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.contact_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    mensagem TEXT
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE public.automation_events ADD COLUMN IF NOT EXISTS event_key TEXT;

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

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    evaluation_credits INTEGER NOT NULL
        CHECK (evaluation_credits > 0 AND evaluation_credits <= 100),
    amount_cents INTEGER NOT NULL
        CHECK (amount_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL',
    mercado_pago_title TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_plans_active_sort
    ON public.plans (is_active, sort_order, created_at);

CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    user_email TEXT,
    provider TEXT NOT NULL DEFAULT 'mercado_pago',
    plan_id UUID REFERENCES public.plans(id),
    plan_slug TEXT,
    plan_name TEXT,
    credits_purchased INTEGER NOT NULL DEFAULT 1
        CHECK (credits_purchased > 0 AND credits_purchased <= 100),
    product_type TEXT NOT NULL DEFAULT 'evaluation_credit'
        CHECK (product_type IN ('evaluation_credit')),
    quantity INTEGER NOT NULL DEFAULT 1
        CHECK (quantity > 0 AND quantity <= 10),
    amount_cents INTEGER NOT NULL
        CHECK (amount_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back', 'expired', 'failed', 'unknown')),
    external_reference TEXT NOT NULL UNIQUE,
    preference_id TEXT,
    checkout_url TEXT,
    sandbox_checkout_url TEXT,
    provider_payment_id TEXT,
    provider_status TEXT,
    provider_status_detail TEXT,
    provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    paid_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id);
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS plan_slug TEXT;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS credits_purchased INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payment_orders_credits_purchased_check'
    ) THEN
        ALTER TABLE public.payment_orders
            ADD CONSTRAINT payment_orders_credits_purchased_check
            CHECK (credits_purchased > 0 AND credits_purchased <= 100);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id
    ON public.payment_orders (user_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_status
    ON public.payment_orders (status);

CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at
    ON public.payment_orders (created_at DESC);

CREATE TABLE IF NOT EXISTS public.evaluation_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    source_order_id UUID REFERENCES public.payment_orders(id) NOT NULL,
    source_credit_index INTEGER NOT NULL DEFAULT 1
        CHECK (source_credit_index > 0 AND source_credit_index <= 100),
    credit_type TEXT NOT NULL DEFAULT 'evaluation'
        CHECK (credit_type IN ('evaluation')),
    status TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'consumed', 'expired', 'revoked')),
    consumed_at TIMESTAMP WITH TIME ZONE,
    consumed_evaluation_id UUID REFERENCES public.evaluations(id)
);

ALTER TABLE public.evaluation_credits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.evaluation_credits DROP CONSTRAINT IF EXISTS evaluation_credits_source_order_id_key;
ALTER TABLE public.evaluation_credits ADD COLUMN IF NOT EXISTS source_credit_index INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'evaluation_credits_source_credit_index_check'
    ) THEN
        ALTER TABLE public.evaluation_credits
            ADD CONSTRAINT evaluation_credits_source_credit_index_check
            CHECK (source_credit_index > 0 AND source_credit_index <= 100);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_evaluation_credits_user_id
    ON public.evaluation_credits (user_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_credits_status
    ON public.evaluation_credits (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_credits_order_index
    ON public.evaluation_credits (source_order_id, source_credit_index);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'plans'
          AND policyname = 'Usuários podem ver planos ativos'
    ) THEN
        CREATE POLICY "Usuários podem ver planos ativos"
            ON public.plans FOR SELECT
            USING (
                is_active
                OR EXISTS (
                    SELECT 1
                    FROM public.admins
                    WHERE admins.email = (auth.jwt() ->> 'email')
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'plans'
          AND policyname = 'Admins podem gerenciar planos'
    ) THEN
        CREATE POLICY "Admins podem gerenciar planos"
            ON public.plans FOR ALL
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
          AND tablename = 'payment_orders'
          AND policyname = 'Usuários podem ver seus próprios pedidos'
    ) THEN
        CREATE POLICY "Usuários podem ver seus próprios pedidos"
            ON public.payment_orders FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'payment_orders'
          AND policyname = 'Admins podem ver todos os pedidos'
    ) THEN
        CREATE POLICY "Admins podem ver todos os pedidos"
            ON public.payment_orders FOR SELECT
            USING (
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
          AND tablename = 'evaluation_credits'
          AND policyname = 'Usuários podem ver seus próprios créditos'
    ) THEN
        CREATE POLICY "Usuários podem ver seus próprios créditos"
            ON public.evaluation_credits FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'evaluation_credits'
          AND policyname = 'Admins podem ver todos os créditos'
    ) THEN
        CREATE POLICY "Admins podem ver todos os créditos"
            ON public.evaluation_credits FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.admins
                    WHERE admins.email = (auth.jwt() ->> 'email')
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'evaluations'
          AND policyname = 'Admins podem ver todas as avaliações'
    ) THEN
        CREATE POLICY "Admins podem ver todas as avaliações"
            ON public.evaluations FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.admins
                    WHERE admins.email = (auth.jwt() ->> 'email')
                )
            );
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    name TEXT,
    phone TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        users.id AS user_id,
        users.email::text AS email,
        COALESCE(
            users.raw_user_meta_data ->> 'full_name',
            users.raw_user_meta_data ->> 'name',
            split_part(users.email, '@', 1)
        ) AS name,
        users.raw_user_meta_data ->> 'phone' AS phone
    FROM auth.users AS users
    WHERE EXISTS (
        SELECT 1
        FROM public.admins
        WHERE admins.email = (auth.jwt() ->> 'email')
    )
    ORDER BY users.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_all_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_evaluation_credit_and_create_evaluation()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    selected_credit_id UUID;
    new_evaluation_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT id
    INTO selected_credit_id
    FROM public.evaluation_credits
    WHERE user_id = auth.uid()
      AND status = 'available'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF selected_credit_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum crédito de avaliação disponível.';
    END IF;

    INSERT INTO public.evaluations (
        user_id,
        status,
        answers,
        scores,
        solution_satisfaction,
        solution_time_relation,
        solution_internal_speed,
        solution_beliefs,
        solution_rhythm_impacts,
        top_fatigue_solution
    )
    VALUES (
        auth.uid(),
        'draft',
        '{}'::jsonb,
        '{}'::jsonb,
        '{}'::jsonb,
        '{}'::jsonb,
        '{}'::jsonb,
        '{}'::jsonb,
        '[]'::jsonb,
        '{}'::jsonb
    )
    RETURNING id INTO new_evaluation_id;

    UPDATE public.evaluation_credits
    SET
        status = 'consumed',
        consumed_at = timezone('utc'::text, now()),
        consumed_evaluation_id = new_evaluation_id
    WHERE id = selected_credit_id;

    RETURN new_evaluation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_evaluation_credit_and_create_evaluation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_evaluation_credit_and_create_evaluation() TO authenticated;
