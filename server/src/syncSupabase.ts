import { createClient } from '@supabase/supabase-js';
import { getDatabase } from './db/database.js';
import { CONFIG } from './config.js';

export async function syncLocalToSupabase() {
  const url = CONFIG.SUPABASE_URL;
  const key = CONFIG.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('URL ou chave anon do Supabase não configuradas.');
    process.exit(1);
  }

  console.log(`Conectando ao Supabase em: ${url}`);
  const supabase = createClient(url, key);
  const db = getDatabase();

  try {
    // 1. Concursos
    const concursos = db.prepare('SELECT * FROM concursos').all();
    if (concursos.length > 0) {
      const { error } = await supabase.from('concursos').upsert(concursos);
      if (error) console.error('Erro ao sincronizar concursos:', error.message);
      else console.log(`✓ Concursos sincronizados (${concursos.length})`);
    }

    // 2. Disciplinas
    const disciplinas = db.prepare('SELECT * FROM disciplinas').all();
    if (disciplinas.length > 0) {
      const { error } = await supabase.from('disciplinas').upsert(disciplinas);
      if (error) console.error('Erro ao sincronizar disciplinas:', error.message);
      else console.log(`✓ Disciplinas sincronizadas (${disciplinas.length})`);
    }

    // 3. Assuntos (ordenados por nível para respeitar foreign key parent_id)
    const assuntos = db.prepare('SELECT * FROM assuntos ORDER BY nivel ASC, ordem ASC').all() as any[];
    if (assuntos.length > 0) {
      const niveis = [1, 2, 3];
      for (const n of niveis) {
        const batch = assuntos.filter((a) => a.nivel === n);
        if (batch.length > 0) {
          const { error } = await supabase.from('assuntos').upsert(batch);
          if (error) console.error(`Erro ao sincronizar assuntos nível ${n}:`, error.message);
        }
      }
      console.log(`✓ Assuntos do edital sincronizados (${assuntos.length})`);
    }

    // 4. Rotina Config
    const rotina = db.prepare('SELECT * FROM rotina_config').all() as any[];
    if (rotina.length > 0) {
      const rotinaParsed = rotina.map((r) => ({
        ...r,
        dias_semana_disponiveis: JSON.parse(r.dias_semana_disponiveis),
        minutos_por_dia: JSON.parse(r.minutos_por_dia),
        dias_indisponiveis: JSON.parse(r.dias_indisponiveis || '[]')
      }));
      const { error } = await supabase.from('rotina_config').upsert(rotinaParsed);
      if (error) console.error('Erro ao sincronizar rotina_config:', error.message);
      else console.log('✓ Configurações de rotina sincronizadas');
    }

    // 5. Estudos
    const estudos = db.prepare('SELECT * FROM estudos').all();
    if (estudos.length > 0) {
      const { error } = await supabase.from('estudos').upsert(estudos);
      if (error) console.error('Erro ao sincronizar estudos:', error.message);
      else console.log(`✓ Estudos consolidados sincronizados (${estudos.length})`);
    }

    // 6. Sessões de Estudo
    const sessoesEstudo = db.prepare('SELECT * FROM sessoes_estudo').all();
    if (sessoesEstudo.length > 0) {
      const { error } = await supabase.from('sessoes_estudo').upsert(sessoesEstudo);
      if (error) console.error('Erro ao sincronizar sessoes_estudo:', error.message);
      else console.log(`✓ Sessões de estudo sincronizadas (${sessoesEstudo.length})`);
    }

    // 7. Sessões de Questões
    const questoes = db.prepare('SELECT * FROM sessoes_questoes').all();
    if (questoes.length > 0) {
      const { error } = await supabase.from('sessoes_questoes').upsert(questoes);
      if (error) console.error('Erro ao sincronizar sessoes_questoes:', error.message);
      else console.log(`✓ Sessões de questões sincronizadas (${questoes.length})`);
    }

    // 8. Revisões
    const revisoes = db.prepare('SELECT * FROM revisoes').all() as any[];
    if (revisoes.length > 0) {
      const revParsed = revisoes.map((r) => ({
        ...r,
        revisoes_substituidas_ids: r.revisoes_substituidas_ids ? JSON.parse(r.revisoes_substituidas_ids) : null
      }));
      const { error } = await supabase.from('revisoes').upsert(revParsed);
      if (error) console.error('Erro ao sincronizar revisoes:', error.message);
      else console.log(`✓ Revisões sincronizadas (${revisoes.length})`);
    }

    // 9. Agenda Blocos
    const blocos = db.prepare('SELECT * FROM agenda_blocos').all();
    if (blocos.length > 0) {
      const { error } = await supabase.from('agenda_blocos').upsert(blocos);
      if (error) console.error('Erro ao sincronizar agenda_blocos:', error.message);
      else console.log(`✓ Blocos de agenda sincronizados (${blocos.length})`);
    }

    // 10. Simulados
    const simulados = db.prepare('SELECT * FROM simulados').all();
    if (simulados.length > 0) {
      const { error } = await supabase.from('simulados').upsert(simulados);
      if (error) console.error('Erro ao sincronizar simulados:', error.message);
      else console.log(`✓ Simulados sincronizados (${simulados.length})`);
    }

    console.log('\nSincronização com Supabase finalizada!');
  } catch (err: any) {
    console.error('Falha na sincronização:', err.message);
  }
}

syncLocalToSupabase();
