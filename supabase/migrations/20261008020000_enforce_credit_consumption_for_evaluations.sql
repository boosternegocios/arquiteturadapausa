-- Enforces that new evaluation drafts are created only through the credit-consuming RPC.
-- Also reconciles already-started evaluations with credits that were still marked as available.

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

    PERFORM set_config('app.evaluation_credit_consumed', 'true', true);

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

CREATE OR REPLACE FUNCTION public.prevent_uncredited_evaluation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IN ('draft', 'completed')
       AND current_setting('app.evaluation_credit_consumed', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Inicie a autoavaliação usando um crédito disponível.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_uncredited_evaluation_insert ON public.evaluations;
CREATE TRIGGER trg_prevent_uncredited_evaluation_insert
BEFORE INSERT ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_uncredited_evaluation_insert();

WITH unlinked_evaluations AS (
    SELECT
        e.id,
        e.user_id,
        e.created_at,
        ROW_NUMBER() OVER (PARTITION BY e.user_id ORDER BY e.created_at ASC, e.id ASC) AS rn
    FROM public.evaluations e
    LEFT JOIN public.evaluation_credits consumed_credit
        ON consumed_credit.consumed_evaluation_id = e.id
    WHERE consumed_credit.id IS NULL
      AND e.status IN ('draft', 'completed')
),
available_credits AS (
    SELECT
        c.id,
        c.user_id,
        c.created_at,
        ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY c.created_at ASC, c.id ASC) AS rn
    FROM public.evaluation_credits c
    WHERE c.status = 'available'
),
matched AS (
    SELECT
        c.id AS credit_id,
        e.id AS evaluation_id
    FROM available_credits c
    JOIN unlinked_evaluations e
      ON e.user_id = c.user_id
     AND e.rn = c.rn
     AND c.created_at <= e.created_at
)
UPDATE public.evaluation_credits c
SET
    status = 'consumed',
    consumed_at = timezone('utc'::text, now()),
    consumed_evaluation_id = matched.evaluation_id
FROM matched
WHERE c.id = matched.credit_id;
