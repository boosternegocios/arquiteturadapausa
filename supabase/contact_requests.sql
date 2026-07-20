-- Tabela que registra as solicitações de "Plano de Ação" enviadas pelo formulário.
-- A Edge Function send-plan-request grava aqui usando a service role key.
-- Rode este SQL no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.contact_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    mensagem TEXT
);

-- RLS habilitado, sem policies de acesso público: apenas a service role
-- (usada pela Edge Function) e o painel do Supabase conseguem ler/escrever.
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
