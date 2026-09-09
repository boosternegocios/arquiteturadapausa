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
