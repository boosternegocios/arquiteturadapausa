-- Adds sellable plans and allows one payment order to release multiple evaluation credits.
-- Safe to run after the earlier Mercado Pago migration.

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
END $$;
