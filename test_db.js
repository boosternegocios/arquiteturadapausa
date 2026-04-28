import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://noybugsrzlxbzjgstjff.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5veWJ1Z3Nyemx4YnpqZ3N0amZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDA4NjAsImV4cCI6MjA5MTY3Njg2MH0.C4om5xA7TQcIVfxsdP7fEA_R9Tn2AxNVMPvZFtDxKCo'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log("Verificando conexão com o Supabase...");

  try {
    // Verifica perguntas
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('category');

    if (questionsError) {
      console.error("Erro ao acessar a tabela 'questions':", questionsError.message);
    } else {
      console.log(`Sucesso! Encontradas ${questions.length} perguntas cadastradas.`);
      
      // Conta as perguntas por categoria para ficar mais bonito
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
