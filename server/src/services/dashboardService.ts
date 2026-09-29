import { getDatabase } from '../db/database.js';
import { getTodayDateString, diffInDays, getWeekRange } from '../utils/dateUtils.js';
import { AssuntoService } from './assuntoService.js';
import { QuestaoService } from './questaoService.js';
import { RevisaoEngine } from './revisaoEngine.js';

export class DashboardService {
  /**
   * Coleta todos os dados essenciais para o Dashboard principal.
   */
  static getDashboard(concursoId: string = 'bacen-2013-tecnico-area-1', hoje: string = getTodayDateString()) {
    // 1. Atualizar status de revisões para hoje
    RevisaoEngine.atualizarStatusDiario(hoje);

    const db = getDatabase();

    // 2. Concurso e contagem regressiva
    const concurso = db.prepare('SELECT * FROM concursos WHERE id = ?').get(concursoId) as any;
    let diasParaProva: number | null = null;
    if (concurso?.data_prova) {
      diasParaProva = diffInDays(concurso.data_prova, hoje);
    }

    // 3. Q1: O que preciso estudar hoje?
    const blocosHoje = db.prepare(`
      SELECT b.*, d.nome as disciplina_nome, d.grupo as disciplina_grupo, a.titulo as assunto_titulo, r.ciclo as revisao_ciclo
      FROM agenda_blocos b
      JOIN disciplinas d ON d.id = b.disciplina_id
      LEFT JOIN assuntos a ON a.id = b.assunto_id
      LEFT JOIN revisoes r ON r.id = b.revisao_id
      WHERE b.concurso_id = ? AND b.data = ?
      ORDER BY b.status ASC, b.hora_inicio ASC
    `).all(concursoId, hoje);

    // 4. Q2: Quais revisões estão pendentes e atrasadas?
    const revisoesAtrasadas = db.prepare(`
      SELECT r.*, a.titulo as assunto_titulo, a.codigo_edital, d.nome as disciplina_nome
      FROM revisoes r
      JOIN assuntos a ON a.id = r.assunto_id
      JOIN disciplinas d ON d.id = a.disciplina_id
      WHERE r.status = 'atrasada'
      ORDER BY r.data_prevista ASC
    `).all() as any[];

    const revisoesDisponiveisHoje = db.prepare(`
      SELECT r.*, a.titulo as assunto_titulo, a.codigo_edital, d.nome as disciplina_nome
      FROM revisoes r
      JOIN assuntos a ON a.id = r.assunto_id
      JOIN disciplinas d ON d.id = a.disciplina_id
      WHERE r.status = 'disponivel'
      ORDER BY r.data_prevista ASC
    `).all() as any[];

    const contagemRevisoes = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'agendada' THEN 1 ELSE 0 END) as agendadas,
        SUM(CASE WHEN status = 'disponivel' THEN 1 ELSE 0 END) as disponiveis,
        SUM(CASE WHEN status = 'atrasada' THEN 1 ELSE 0 END) as atrasadas,
        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as concluidas,
        SUM(CASE WHEN ciclo = 'manutencao' AND status != 'recuperada' THEN 1 ELSE 0 END) as em_manutencao
      FROM revisoes
    `).get() as any;

    // 5. Q3: Quanto do edital já estudei? (Cobertura sem dupla contagem)
    const arvore = AssuntoService.getArvoreCompleta(concursoId);
    let totalFolhasGeral = 0;
    let folhasEstudadasGeral = 0;

    for (const d of arvore) {
      totalFolhasGeral += d.total_topicos_folha;
      folhasEstudadasGeral += d.topicos_estudados;
    }

    const percentualCoberturaGeral = totalFolhasGeral > 0
      ? Math.round((folhasEstudadasGeral / totalFolhasGeral) * 1000) / 10
      : 0;

    // 6. Q4: Como está meu desempenho?
    const statsQuestoes = QuestaoService.getEstatisticasGlobais();

    // 7. Q5: Onde devo concentrar meu esforço?
    const disciplinasPrioritarias = [...arvore]
      .sort((a, b) => {
        if (b.revisoes_atrasadas !== a.revisoes_atrasadas) {
          return b.revisoes_atrasadas - a.revisoes_atrasadas;
        }
        if (a.percentual_cobertura !== b.percentual_cobertura) {
          return a.percentual_cobertura - b.percentual_cobertura;
        }
        const taxaA = a.taxa_acerto_disciplina ?? 1;
        const taxaB = b.taxa_acerto_disciplina ?? 1;
        return taxaA - taxaB;
      })
      .slice(0, 3)
      .map(d => ({
        id: d.id,
        nome: d.nome,
        grupo: d.grupo,
        peso: d.peso,
        cobertura: d.percentual_cobertura,
        taxaAcertos: d.taxa_acerto_disciplina,
        revisoesAtrasadas: d.revisoes_atrasadas,
        motivoRecomendacao: d.revisoes_atrasadas > 0
          ? `${d.revisoes_atrasadas} revisão(ões) atrasada(s)`
          : d.percentual_cobertura < 30
          ? `Cobertura baixa (${d.percentual_cobertura}%)`
          : (d.taxa_acerto_disciplina !== null && d.taxa_acerto_disciplina < 0.75)
          ? `Desempenho ${(d.taxa_acerto_disciplina * 100).toFixed(0)}% requer reforço`
          : 'Conteúdo programático em andamento'
      }));

    // 8. Horas de estudo na semana corrente (Segunda a Domingo)
    const weekRange = getWeekRange(hoje);
    const { inicio: inicioSemana, fim: fimSemana, dias: diasSemana } = weekRange;

    // Sessões de estudo registradas na semana
    const sessoesSemana = db.prepare(`
      SELECT data, SUM(tempo_minutos) as minutos, COUNT(*) as sessoes, SUM(questoes_realizadas) as questoes
      FROM sessoes_estudo
      WHERE data >= ? AND data <= ?
      GROUP BY data
    `).all(inicioSemana, fimSemana) as { data: string; minutos: number; sessoes: number; questoes: number }[];

    // Blocos concluídos da agenda na semana
    const blocosAgendaSemana = db.prepare(`
      SELECT data, SUM(duracao_minutos) as minutos, COUNT(*) as sessoes
      FROM agenda_blocos
      WHERE status = 'concluido' AND data >= ? AND data <= ? AND (tipo != 'estudo_inicial' OR assunto_id IS NULL)
      GROUP BY data
    `).all(inicioSemana, fimSemana) as { data: string; minutos: number; sessoes: number }[];

    // Estudos legados se houver
    const estudosLegadosSemana = db.prepare(`
      SELECT e.data_estudo as data, SUM(e.tempo_minutos) as minutos
      FROM estudos e
      WHERE e.data_estudo >= ? AND e.data_estudo <= ?
        AND e.assunto_id NOT IN (SELECT DISTINCT assunto_id FROM sessoes_estudo)
      GROUP BY e.data_estudo
    `).all(inicioSemana, fimSemana) as { data: string; minutos: number }[];

    const mapMinutosPorDia = new Map<string, number>();
    const mapSessoesPorDia = new Map<string, number>();
    let totalQuestoesSemana = 0;

    for (const s of sessoesSemana) {
      mapMinutosPorDia.set(s.data, (mapMinutosPorDia.get(s.data) || 0) + (s.minutos || 0));
      mapSessoesPorDia.set(s.data, (mapSessoesPorDia.get(s.data) || 0) + (s.sessoes || 0));
      totalQuestoesSemana += (s.questoes || 0);
    }

    for (const b of blocosAgendaSemana) {
      mapMinutosPorDia.set(b.data, (mapMinutosPorDia.get(b.data) || 0) + (b.minutos || 0));
      mapSessoesPorDia.set(b.data, (mapSessoesPorDia.get(b.data) || 0) + (b.sessoes || 0));
    }

    for (const l of estudosLegadosSemana) {
      mapMinutosPorDia.set(l.data, (mapMinutosPorDia.get(l.data) || 0) + (l.minutos || 0));
      mapSessoesPorDia.set(l.data, (mapSessoesPorDia.get(l.data) || 0) + 1);
    }

    let totalMinutosSemana = 0;
    let totalSessoesSemana = 0;

    const breakdownDias = diasSemana.map(d => {
      const min = mapMinutosPorDia.get(d.data) || 0;
      const sess = mapSessoesPorDia.get(d.data) || 0;
      totalMinutosSemana += min;
      totalSessoesSemana += sess;

      const h = Math.floor(min / 60);
      const m = min % 60;
      const formatado = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;

      return {
        data: d.data,
        diaNome: d.diaNome,
        diaSemana: d.diaSemana,
        minutos: min,
        horasFormatadas: formatado,
        sessoes: sess,
        isHoje: d.data === hoje
      };
    });

    const horasSemana = Math.floor(totalMinutosSemana / 60);
    const minutosRestantesSemana = totalMinutosSemana % 60;
    const horasFormatadasSemana = horasSemana > 0
      ? (minutosRestantesSemana > 0 ? `${horasSemana}h ${minutosRestantesSemana}min` : `${horasSemana}h`)
      : `${minutosRestantesSemana} min`;
    const horasDecimaisSemana = Math.round((totalMinutosSemana / 60) * 10) / 10;

    // Meta semanal configurada na rotina
    const rotina = db.prepare('SELECT minutos_por_dia FROM rotina_config WHERE id = ?').get('config_padrao') as any;
    let metaSemanalMinutos = 0;
    if (rotina?.minutos_por_dia) {
      try {
        const minMap = JSON.parse(rotina.minutos_por_dia);
        metaSemanalMinutos = Object.values(minMap).reduce((acc: number, v: any) => acc + (parseInt(v, 10) || 0), 0);
      } catch {}
    }

    return {
      hoje,
      concurso: {
        id: concurso?.id,
        nome: concurso?.nome,
        orgao: concurso?.orgao,
        banca: concurso?.banca,
        cargo: concurso?.cargo,
        area: concurso?.area,
        dataProva: concurso?.data_prova,
        dataProvaEstimada: Boolean(concurso?.data_prova_estimada),
        diasParaProva
      },
      estudoSemana: {
        inicioSemana,
        fimSemana,
        totalMinutos: totalMinutosSemana,
        horasFormatadas: horasFormatadasSemana,
        horasDecimais: horasDecimaisSemana,
        totalSessoes: totalSessoesSemana,
        totalQuestoes: totalQuestoesSemana,
        metaSemanalMinutos,
        metaSemanalHoras: Math.round((metaSemanalMinutos / 60) * 10) / 10,
        percentualMeta: metaSemanalMinutos > 0 ? Math.min(100, Math.round((totalMinutosSemana / metaSemanalMinutos) * 100)) : null,
        dias: breakdownDias
      },
      estudoHoje: {
        blocos: blocosHoje,
        totalBlocos: blocosHoje.length,
        blocosConcluidos: (blocosHoje as any[]).filter(b => b.status === 'concluido').length
      },
      revisoes: {
        totais: contagemRevisoes,
        atrasadas: revisoesAtrasadas.map(r => ({
          ...r,
          diasAtraso: Math.abs(diffInDays(r.data_prevista, hoje))
        })),
        disponiveisHoje: revisoesDisponiveisHoje
      },
      cobertura: {
        totalTopicosEstudaveis: totalFolhasGeral,
        topicosEstudados: folhasEstudadasGeral,
        percentual: percentualCoberturaGeral,
        porDisciplina: arvore.map(d => ({
          id: d.id,
          nome: d.nome,
          grupo: d.grupo,
          cobertura: d.percentual_cobertura,
          estudados: d.topicos_estudados,
          total: d.total_topicos_folha
        }))
      },
      desempenho: {
        totalQuestoes: statsQuestoes.total_questoes,
        totalAcertos: statsQuestoes.total_acertos,
        totalErros: statsQuestoes.total_erros,
        taxaGeral: statsQuestoes.taxa_geral,
        porDisciplina: statsQuestoes.por_disciplina
      },
      ondeConcentrar: disciplinasPrioritarias
    };
  }
}

