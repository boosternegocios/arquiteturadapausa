-- Consumes one available evaluation credit and creates a fresh draft evaluation.
-- This keeps credit consumption atomic and prevents duplicate starts from the same credit.

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
