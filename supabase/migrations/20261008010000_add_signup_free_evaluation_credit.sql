-- Adds the free signup evaluation credit as a real credit record.
-- Existing purchase credits keep using source_order_id; signup credits use source_type = 'signup'.

ALTER TABLE public.evaluation_credits
    ALTER COLUMN source_order_id DROP NOT NULL;

ALTER TABLE public.evaluation_credits
    ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'purchase';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'evaluation_credits_source_type_check'
    ) THEN
        ALTER TABLE public.evaluation_credits
            ADD CONSTRAINT evaluation_credits_source_type_check
            CHECK (source_type IN ('purchase', 'signup', 'manual'));
    END IF;
END $$;

UPDATE public.evaluation_credits
SET source_type = 'purchase'
WHERE source_type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_credits_one_signup_credit
    ON public.evaluation_credits (user_id)
    WHERE source_type = 'signup';

DROP FUNCTION IF EXISTS public.ensure_signup_evaluation_credit();

CREATE OR REPLACE FUNCTION public.ensure_signup_evaluation_credit()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_credit_id UUID;
    new_credit_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT id
    INTO existing_credit_id
    FROM public.evaluation_credits
    WHERE user_id = auth.uid()
      AND source_type = 'signup'
    LIMIT 1;

    IF existing_credit_id IS NOT NULL THEN
        RETURN existing_credit_id;
    END IF;

    INSERT INTO public.evaluation_credits (
        user_id,
        source_order_id,
        source_credit_index,
        source_type,
        credit_type,
        status
    )
    VALUES (
        auth.uid(),
        NULL,
        1,
        'signup',
        'evaluation',
        'available'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO new_credit_id;

    IF new_credit_id IS NOT NULL THEN
        RETURN new_credit_id;
    END IF;

    SELECT id
    INTO existing_credit_id
    FROM public.evaluation_credits
    WHERE user_id = auth.uid()
      AND source_type = 'signup'
    LIMIT 1;

    RETURN existing_credit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_signup_evaluation_credit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_signup_evaluation_credit() TO authenticated;
