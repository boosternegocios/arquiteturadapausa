-- Habilita extensões usadas pelos UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 0. TABELA DE ADMINS -------------------------------------------------
-- O app consulta esta tabela para liberar o painel administrativo no front.
-- A segurança real precisa continuar no RLS/RPC abaixo; esconder botão no
-- front é apenas conveniência visual.
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver seu próprio registro"
    ON public.admins FOR SELECT
    USING ((auth.jwt() ->> 'email') = email);

-- 1. TABELA DE PERGUNTAS DINÂMICAS ----------------------------------
CREATE TABLE public.questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,       -- 'fisico', 'sensorial', 'emocional', 'mental', 'social', 'criativo', 'espiritual'
    text TEXT NOT NULL,
    order_index INT NOT NULL
);

-- Habilita acesso público apenas de leitura para as perguntas (para o app listar)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Perguntas são públicas para leitura" ON public.questions FOR SELECT USING (true);


-- 2. TABELA DE AVALIAÇÕES (EVALUATIONS) ------------------------------
CREATE TABLE public.evaluations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft' ou 'completed'
    answers JSONB DEFAULT '{}'::jsonb,
    scores JSONB DEFAULT '{}'::jsonb,
    solution_satisfaction JSONB DEFAULT '{}'::jsonb,
    solution_time_relation JSONB DEFAULT '{}'::jsonb,
    solution_internal_speed JSONB DEFAULT '{}'::jsonb,
    solution_beliefs JSONB DEFAULT '{}'::jsonb,
    solution_rhythm_impacts JSONB DEFAULT '[]'::jsonb,
    top_fatigue_solution JSONB DEFAULT '{}'::jsonb
);

-- Migração idempotente para bancos que já foram criados com a versão antiga.
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_satisfaction JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_time_relation JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_internal_speed JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_beliefs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS solution_rhythm_impacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS top_fatigue_solution JSONB DEFAULT '{}'::jsonb;

-- RLS para avaliações: o próprio usuário só vê e edita as dele
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias avaliações"
    ON public.evaluations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias avaliações"
    ON public.evaluations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias avaliações"
    ON public.evaluations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias avaliações"
    ON public.evaluations FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as avaliações"
    ON public.evaluations FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.admins
            WHERE admins.email = (auth.jwt() ->> 'email')
        )
    );

-- RPC usada pelo painel admin para juntar respostas com dados do usuário.
-- Retorna dados apenas quando o usuário logado está em public.admins.
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


-- 3. INSERINDO AS PERGUNTAS (POPULANDO BANCO INICIALMENTE) -----------

-- FÍSICO
INSERT INTO public.questions (category, order_index, text) VALUES
('fisico', 1, 'Se meu dia tivesse 1 hora a mais eu usaria para dormir'),
('fisico', 2, 'Sinto-me cansado, mas tenho dificuldade para dormir à noite.'),
('fisico', 3, 'Fico doente com mais frequência do que outras pessoas.'),
('fisico', 4, 'Tenho dores no corpo frequentemente.'),
('fisico', 5, 'Em geral me sinto lento entre 14h e 17h'),
('fisico', 6, 'Costumo ingerir bebida alcoólica para me ajudar a relaxar à noite.'),
('fisico', 7, 'Pratico mais de 5 horas de exercícios por semana ou pratico esportes regularmente.'),
('fisico', 8, 'Durmo menos de 6 horas na maioria dos dias.');

-- SENSORIAL
INSERT INTO public.questions (category, order_index, text) VALUES
('sensorial', 1, 'Sou sensível a sons altos e luzes brilhantes'),
('sensorial', 2, 'Passo mais de 4 horas por dia olhando telas (computador e celular)'),
('sensorial', 3, 'Sinto que alimentos naturais não têm sabor, prefiro alimentos e bebidas processados'),
('sensorial', 4, 'Não gosto de ser abraçado ou tocado'),
('sensorial', 5, 'Sou insensível a aromas que os outros sentem facilmente'),
('sensorial', 6, 'Frequentemente sinto dor, pressão ou fadiga nos olhos ao final do dia'),
('sensorial', 7, 'Fico ansioso quando estou em um local muito movimentado'),
('sensorial', 8, 'Não gosto de shows, fogos de artifício ou outras experiências sensoriais intensas');

-- EMOCIONAL
INSERT INTO public.questions (category, order_index, text) VALUES
('emocional', 1, 'Tendo a me concentrar mais nas minhas falhas do que nos meus sucessos'),
('emocional', 2, 'Sinto-me inseguro comigo mesmo perto de novas pessoas ou situações'),
('emocional', 3, 'Muitas vezes me pego pedindo desculpas pelas minhas ações, mesmo que não tenha culpa'),
('emocional', 4, 'Sou meu pior crítico'),
('emocional', 5, 'Preocupo-me e sinto ansiedade quando ouço notícias ou penso em perigos potenciais ao meu redor'),
('emocional', 6, 'Passo a maior parte do dia demonstrando minha melhor versão para clientes ou colegas'),
('emocional', 7, 'Costumo ser mais pessimista do que otimista em relação à vida'),
('emocional', 8, 'Sinto-me desconfortável falando sobre meus desejos e objetivos');

-- MENTAL
INSERT INTO public.questions (category, order_index, text) VALUES
('mental', 1, 'Não consigo gerenciar mentalmente minha lista de tarefas'),
('mental', 2, 'Sinto frustração com frequência'),
('mental', 3, 'Sou esquecido e tenho dificuldade em reter novas informações'),
('mental', 4, 'Costumo me irritar com as pessoas próximas por coisas insignificantes'),
('mental', 5, 'Passo a maior parte do dia fazendo coisas que considero demandantes'),
('mental', 6, 'Fico imaginando situações futuras'),
('mental', 7, 'Muitas vezes não consigo dormir porque estou repassando fatos do dia');

-- SOCIAL
INSERT INTO public.questions (category, order_index, text) VALUES
('social', 1, 'Evito situações sociais e prefiro estar sozinho'),
('social', 2, 'Muitas vezes me sinto distante da família e dos amigos'),
('social', 3, 'Tenho tendência a atrair pessoas abusivas ou tóxicas'),
('social', 4, 'Tenho dificuldade em manter relacionamentos próximos ou fazer amigos'),
('social', 5, 'Prefiro relacionamentos online do que presenciais'),
('social', 6, 'Prefiro trabalhar sozinho'),
('social', 7, 'Minha persona nas redes sociais é diferente da vida real'),
('social', 8, 'Se eu precisasse de alguém para me ajudar, não sei para quem ligaria');

-- CRIATIVO
INSERT INTO public.questions (category, order_index, text) VALUES
('criativo', 1, 'Não tenho energia para fazer atividades divertidas com minha família ou amigos'),
('criativo', 2, 'Sinto dificuldade em gerar ideias ou pensar em coisas originais'),
('criativo', 3, 'Atividades que me empolgavam agora parecem desinteressantes'),
('criativo', 4, 'Adio tarefas importantes por não ter energia para finalizá-las'),
('criativo', 5, 'Me sinto frustrado com minha entrega no trabalho'),
('criativo', 6, 'Duvido da qualidade do que estou produzindo.'),
('criativo', 7, 'Não aprecio artes, música ou natureza'),
('criativo', 8, 'Me sinto menos inspirado(a) que em tempos anteriores'),
('criativo', 9, 'Sinto um vazio intelectual');

-- ESPIRITUAL (Inventado temporariamente a pedido do cliente)
INSERT INTO public.questions (category, order_index, text) VALUES
('espiritual', 1, 'Sinto uma falta de propósito ou significado nas minhas atividades diárias'),
('espiritual', 2, 'Tenho dificuldade em me sentir conectado com algo maior que eu mesmo'),
('espiritual', 3, 'Sinto pouco entusiasmo em relação ao meu futuro'),
('espiritual', 4, 'Raramente tenho momentos de contemplação, reflexão profunda ou oração'),
('espiritual', 5, 'Acredito que estou apenas sobrevivendo ao invés de prosperar e viver plenamente');
