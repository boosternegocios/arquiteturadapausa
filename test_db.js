/* global process */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

try {
  const env = readFileSync('.env.local', 'utf8')
  env.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim()
    }
  })
} catch {
  // .env.local é opcional quando as variáveis já foram exportadas no shell.
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente ou em .env.local')
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log("Verificando conexão com o Supabase...");

  try {
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('category');

    if (questionsError) {
      console.error("Erro ao acessar a tabela 'questions':", questionsError.message);
    } else {
      console.log(`Sucesso! Encontradas ${questions.length} perguntas cadastradas.`);
      const countByCategory = questions.reduce((acc, q) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {});
      console.log("Perguntas por categoria:", countByCategory);
    }
  } catch (err) {
    console.error("Erro inesperado:", err);
  }
}

checkDatabase();
