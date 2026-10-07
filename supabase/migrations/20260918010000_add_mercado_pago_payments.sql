-- Stores Mercado Pago checkout attempts, sellable plans and evaluation credits
-- unlocked after approval.
-- Edge Functions write with the service role; users can only read their own records.

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
