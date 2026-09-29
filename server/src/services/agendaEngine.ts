import crypto from 'crypto';
import { getDatabase } from '../db/database.js';
import { addDays, diffInDays, getTodayDateString } from '../utils/dateUtils.js';

export interface GerarAgendaInput {
  dataInicio?: string;
  diasParaPlanejar?: number; // padrão 7 dias
  concursoId?: string;
}

export interface BlocoAgendaRecord {
  id: string;
  concurso_id: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  duracao_minutos: number;
  disciplina_id: string;
  disciplina_nome?: string;
  assunto_id: string | null;
  assunto_titulo?: string;
  revisao_id: string | null;
  tipo: 'estudo_inicial' | 'revisao' | 'questoes' | 'simulado';
  status: 'pendente' | 'em_andamento' | 'concluido' | 'reagendado' | 'cancelado';
  fixado: number;
  motivo_prioridade: string | null;
  concluido_em: string | null;
}

export class AgendaEngine {
  /**
   * Obtém a configuração da rotina do usuário.
   */
  static getConfig(concursoId: string = 'bacen-2013-tecnico-area-1') {
    const db = getDatabase();
    let config = db.prepare('SELECT * FROM rotina_config WHERE concurso_id = ?').get(concursoId) as any;
    if (!config) {
      config = db.prepare('SELECT * FROM rotina_config WHERE id = ?').get('config_padrao') as any;
    }

    return {
      diasSemanaDisponiveis: JSON.parse(config?.dias_semana_disponiveis || '[1,2,3,4,5,6]'),
      minutosPorDia: JSON.parse(config?.minutos_por_dia || '{"0":0,"1":240,"2":240,"3":240,"4":240,"5":240,"6":300}'),
      duracaoBlocoMinutos: config?.duracao_bloco_minutos || 50,
      pausaMinutos: config?.pausa_minutos || 10,
      diasIndisponiveis: JSON.parse(config?.dias_indisponiveis || '[]'),
      proporcaoEstudoNovo: config?.proporcao_estudo_novo ?? 0.50,
      proporcaoRevisoes: config?.proporcao_revisoes ?? 0.30,
      proporcaoQuestoes: config?.proporcao_questoes ?? 0.20
    };
  }

  /**
   * Salva alterações na configuração da rotina.
   */
  static salvarConfig(concursoId: string, dados: any) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO rotina_config (
        id, concurso_id, dias_semana_disponiveis, minutos_por_dia,
        duracao_bloco_minutos, pausa_minutos, dias_indisponiveis,
        proporcao_estudo_novo, proporcao_revisoes, proporcao_questoes
      ) VALUES ('config_padrao', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        dias_semana_disponiveis = excluded.dias_semana_disponiveis,
        minutos_por_dia = excluded.minutos_por_dia,
        duracao_bloco_minutos = excluded.duracao_bloco_minutos,
        pausa_minutos = excluded.pausa_minutos,
        dias_indisponiveis = excluded.dias_indisponiveis,
        proporcao_estudo_novo = excluded.proporcao_estudo_novo,
        proporcao_revisoes = excluded.proporcao_revisoes,
        proporcao_questoes = excluded.proporcao_questoes
    `).run(
      concursoId,
      JSON.stringify(dados.diasSemanaDisponiveis),
      JSON.stringify(dados.minutosPorDia),
      dados.duracaoBlocoMinutos,
      dados.pausaMinutos,
      JSON.stringify(dados.diasIndisponiveis || []),
      dados.proporcaoEstudoNovo,
      dados.proporcaoRevisoes,
      dados.proporcaoQuestoes
    );
  }

  /**
   * Gera a agenda automática distribuindo revisões e novos estudos
   * respeitando blocos fixados, capacidade real do dia e alertando sobrecarga.
   */
  static gerarAgenda(input: GerarAgendaInput = {}, hoje: string = getTodayDateString()) {
    const db = getDatabase();
    const concursoId = input.concursoId || 'bacen-2013-tecnico-area-1';
    const dataInicio = input.dataInicio || hoje;
    const diasPlanejar = input.diasParaPlanejar || 7;
    const config = this.getConfig(concursoId);
    const now = new Date().toISOString();

    const diasIndisponiveisSet = new Set<string>(config.diasIndisponiveis || []);

    // 1. Obter revisões pendentes ou atrasadas
    const revisoesPendentes = db.prepare(`
      SELECT r.*, a.titulo as assunto_titulo, a.disciplina_id, d.nome as disciplina_nome, d.peso as disciplina_peso
      FROM revisoes r
      JOIN assuntos a ON a.id = r.assunto_id
      JOIN disciplinas d ON d.id = a.disciplina_id
      WHERE r.status IN ('atrasada', 'disponivel', 'agendada')
      ORDER BY
        CASE WHEN r.status = 'atrasada' THEN 1 WHEN r.status = 'disponivel' THEN 2 ELSE 3 END ASC,
        r.data_prevista ASC,
        d.peso DESC
    `).all() as any[];

    // 2. Obter tópicos folha ainda não estudados (para novos estudos)
    const topicosNaoEstudados = db.prepare(`
      SELECT a.*, d.nome as disciplina_nome, d.peso as disciplina_peso
      FROM assuntos a
      JOIN disciplinas d ON d.id = a.disciplina_id
      LEFT JOIN estudos e ON e.assunto_id = a.id
      WHERE (e.concluido IS NULL OR e.concluido = 0)
        AND a.id NOT IN (SELECT DISTINCT parent_id FROM assuntos WHERE parent_id IS NOT NULL)
      ORDER BY d.peso DESC, a.ordem ASC
    `).all() as any[];

    const blocosGerados: BlocoAgendaRecord[] = [];
    const sobrecargasPorDia: { data: string; minutosDisponiveis: number; minutosNecessarios: number; excessoMinutos: number }[] = [];

    let revisaoIndex = 0;
    let topicoIndex = 0;

    for (let i = 0; i < diasPlanejar; i++) {
      const dataAtual = addDays(dataInicio, i);
      const diaSemana = new Date(dataAtual + 'T12:00:00').getDay(); // 0=dom, 1=seg...

      const minutosDisponiveis = config.minutosPorDia[String(diaSemana)] || 0;
      const ehDiaDisponivel = config.diasSemanaDisponiveis.includes(diaSemana) && !diasIndisponiveisSet.has(dataAtual);

      if (!ehDiaDisponivel || minutosDisponiveis <= 0) {
        continue;
      }

      // Preservar blocos fixados ou já concluídos deste dia
      const blocosExistentes = db.prepare(`
        SELECT * FROM agenda_blocos
        WHERE data = ? AND concurso_id = ? AND (fixado = 1 OR status = 'concluido')
      `).all(dataAtual, concursoId) as any[];

      const minutosJaAlocados = blocosExistentes.reduce((sum: number, b: any) => sum + b.duracao_minutos, 0);
      let minutosRestantes = minutosDisponiveis - minutosJaAlocados;

      // Apagar apenas blocos NÃO fixados e NÃO concluídos deste dia
      db.prepare(`
        DELETE FROM agenda_blocos
        WHERE data = ? AND concurso_id = ? AND fixado = 0 AND status != 'concluido'
      `).run(dataAtual, concursoId);

      // Quantidade máxima de blocos possíveis hoje
      const duracaoBloco = config.duracaoBlocoMinutos;
      let minutosNecessarios = minutosJaAlocados;

      const insertBloco = db.prepare(`
        INSERT INTO agenda_blocos (
          id, concurso_id, data, hora_inicio, hora_fim, duracao_minutos,
          disciplina_id, assunto_id, revisao_id, tipo, status, fixado,
          motivo_prioridade, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', 0, ?, ?)
      `);

      // 1º: Alocar Revisões prioritárias
      while (minutosRestantes >= duracaoBloco && revisaoIndex < revisoesPendentes.length) {
        const rev = revisoesPendentes[revisaoIndex];

        // Verificar se já não há bloco para esta mesma revisão hoje
        const jaTemRevisao = blocosExistentes.some((b: any) => b.revisao_id === rev.id);
        if (jaTemRevisao) {
          revisaoIndex++;
          continue;
        }

        const id = `bloco-${crypto.randomBytes(6).toString('hex')}`;
        let motivo = `Revisão ciclo ${rev.ciclo}`;
        if (rev.status === 'atrasada') {
          motivo = `Revisão ATRASADA (prevista para ${rev.data_prevista})`;
        } else if (rev.status === 'disponivel') {
          motivo = `Revisão disponível hoje`;
        }

        insertBloco.run(
          id,
          concursoId,
          dataAtual,
          null,
          null,
          duracaoBloco,
          rev.disciplina_id,
          rev.assunto_id,
          rev.id,
          'revisao',
          motivo,
          now
        );

        blocosGerados.push({
          id,
          concurso_id: concursoId,
          data: dataAtual,
          hora_inicio: null,
          hora_fim: null,
          duracao_minutos: duracaoBloco,
          disciplina_id: rev.disciplina_id,
          disciplina_nome: rev.disciplina_nome,
          assunto_id: rev.assunto_id,
          assunto_titulo: rev.assunto_titulo,
          revisao_id: rev.id,
          tipo: 'revisao',
          status: 'pendente',
          fixado: 0,
          motivo_prioridade: motivo,
          concluido_em: null
        });

        minutosRestantes -= duracaoBloco;
        minutosNecessarios += duracaoBloco;
        revisaoIndex++;
      }

      // 2º: Alocar Conteúdo Novo
      while (minutosRestantes >= duracaoBloco && topicoIndex < topicosNaoEstudados.length) {
        const topico = topicosNaoEstudados[topicoIndex];

        const id = `bloco-${crypto.randomBytes(6).toString('hex')}`;
        const motivo = `Novo conteúdo do edital (Peso oficial: ${topico.disciplina_peso})`;

        insertBloco.run(
          id,
          concursoId,
          dataAtual,
          null,
          null,
          duracaoBloco,
          topico.disciplina_id,
          topico.id,
          null,
          'estudo_inicial',
          motivo,
          now
        );

        blocosGerados.push({
          id,
          concurso_id: concursoId,
          data: dataAtual,
          hora_inicio: null,
          hora_fim: null,
          duracao_minutos: duracaoBloco,
          disciplina_id: topico.disciplina_id,
          disciplina_nome: topico.disciplina_nome,
          assunto_id: topico.id,
          assunto_titulo: topico.titulo,
          revisao_id: null,
          tipo: 'estudo_inicial',
          status: 'pendente',
          fixado: 0,
          motivo_prioridade: motivo,
          concluido_em: null
        });

        minutosRestantes -= duracaoBloco;
        minutosNecessarios += duracaoBloco;
        topicoIndex++;
      }

      // 3º: Se sobrar tempo, alocar bloco de Questões gerais de disciplina
      if (minutosRestantes >= duracaoBloco) {
        const id = `bloco-${crypto.randomBytes(6).toString('hex')}`;
        const motivo = 'Treino avulso de questões para consolidação';

        insertBloco.run(
          id,
          concursoId,
          dataAtual,
          null,
          null,
          duracaoBloco,
          'disc-contabilidade', // específica de grande peso
          null,
          null,
          'questoes',
          motivo,
          now
        );

        minutosRestantes -= duracaoBloco;
        minutosNecessarios += duracaoBloco;
      }

      // Verificar sobrecarga caso haja revisões atrasadas represadas que não couberam
      if (revisaoIndex < revisoesPendentes.length && revisoesPendentes[revisaoIndex].status === 'atrasada') {
        const pendentesNaoAlocadas = revisoesPendentes.slice(revisaoIndex).filter(r => r.status === 'atrasada').length;
        if (pendentesNaoAlocadas > 0) {
          const excesso = pendentesNaoAlocadas * duracaoBloco;
          sobrecargasPorDia.push({
            data: dataAtual,
            minutosDisponiveis,
            minutosNecessarios: minutosDisponiveis + excesso,
            excessoMinutos: excesso
          });
        }
      }
    }

    return {
      totalBlocosGerados: blocosGerados.length,
      sobrecargas: sobrecargasPorDia
    };
  }

  /**
   * Conclui um bloco da agenda e propaga a conclusão para o assunto ou revisão correspondente,
   * sem duplicar registros históricos.
   */
  static concluirBloco(
    blocoId: string,
    questaoData?: { totalQuestoes: number; acertos: number; origem?: string; observacoes?: string },
    hoje: string = getTodayDateString()
  ) {
    const db = getDatabase();
    const now = new Date().toISOString();

    const bloco = db.prepare('SELECT * FROM agenda_blocos WHERE id = ?').get(blocoId) as any;
    if (!bloco) {
      throw new Error(`Bloco ${blocoId} não encontrado.`);
    }

    // Se o bloco já foi concluído, não duplicar
    if (bloco.status === 'concluido') {
      return { bloco, status: 'ja_concluido' };
    }

    // Se ligado a uma revisão
    if (bloco.revisao_id) {
      const { revisaoConcluida, proximaRevisao } = (await_revisao())();
      function await_revisao() {
        return () => {
          // Import dynamic to avoid cycle
          const { RevisaoEngine } = require('./revisaoEngine.js');
          return RevisaoEngine.concluirRevisao({
            revisaoId: bloco.revisao_id,
            dataReal: hoje,
            totalQuestoes: questaoData?.totalQuestoes,
            acertos: questaoData?.acertos,
            origem: questaoData?.origem,
            observacoes: questaoData?.observacoes
          }, hoje);
        };
      }
    } else if (bloco.assunto_id && bloco.tipo === 'estudo_inicial') {
      // Se ligado a estudo inicial
      const { AssuntoService } = require('./assuntoService.js');
      AssuntoService.registrarEstudoInicial(bloco.assunto_id, {
        concluido: true,
        dataEstudo: hoje,
        tempoMinutos: bloco.duracao_minutos,
        anotacoes: questaoData?.observacoes
      }, hoje);

      // Se registrou questões junto ao estudo inicial
      if (questaoData && questaoData.totalQuestoes > 0) {
        const { QuestaoService } = require('./questaoService.js');
        QuestaoService.criarSessao({
          disciplinaId: bloco.disciplina_id,
          assuntoId: bloco.assunto_id,
          data: hoje,
          totalQuestoes: questaoData.totalQuestoes,
          acertos: questaoData.acertos,
          origem: questaoData.origem,
          observacoes: questaoData.observacoes,
          tipo: 'estudo_inicial'
        }, hoje);
      }
    } else if (questaoData && questaoData.totalQuestoes > 0) {
      // Questões avulsas
      const { QuestaoService } = require('./questaoService.js');
      QuestaoService.criarSessao({
        disciplinaId: bloco.disciplina_id,
        assuntoId: bloco.assunto_id,
        data: hoje,
        totalQuestoes: questaoData.totalQuestoes,
        acertos: questaoData.acertos,
        origem: questaoData.origem,
        observacoes: questaoData.observacoes,
        tipo: 'treino_avulso'
      }, hoje);
    }

    // Marcar bloco como concluído
    db.prepare(`
      UPDATE agenda_blocos
      SET status = 'concluido', concluido_em = ?
      WHERE id = ?
    `).run(now, blocoId);

    const blocoAtualizado = db.prepare('SELECT * FROM agenda_blocos WHERE id = ?').get(blocoId);
    return { bloco: blocoAtualizado, status: 'concluido' };
  }

  /**
   * Alterna a fixação de um bloco (para proteger de reprogramação automática).
   */
  static toggleFixado(blocoId: string): any {
    const db = getDatabase();
    const bloco = db.prepare('SELECT fixado FROM agenda_blocos WHERE id = ?').get(blocoId) as any;
    if (!bloco) throw new Error('Bloco não encontrado');

    const novoValor = bloco.fixado ? 0 : 1;
    db.prepare('UPDATE agenda_blocos SET fixado = ? WHERE id = ?').run(novoValor, blocoId);
    return db.prepare('SELECT * FROM agenda_blocos WHERE id = ?').get(blocoId);
  }

  /**
   * Busca os blocos da semana/dia com dados complementares.
   */
  static getBlocosPorPeriodo(dataInicio: string, dataFim: string, concursoId: string = 'bacen-2013-tecnico-area-1') {
    const db = getDatabase();
    return db.prepare(`
      SELECT b.*,
             d.nome as disciplina_nome,
             d.grupo as disciplina_grupo,
             a.titulo as assunto_titulo,
             a.codigo_edital,
             r.ciclo as revisao_ciclo,
             r.status as revisao_status
      FROM agenda_blocos b
      JOIN disciplinas d ON d.id = b.disciplina_id
      LEFT JOIN assuntos a ON a.id = b.assunto_id
      LEFT JOIN revisoes r ON r.id = b.revisao_id
      WHERE b.concurso_id = ? AND b.data >= ? AND b.data <= ?
      ORDER BY b.data ASC, b.hora_inicio ASC, b.criado_em ASC
    `).all(concursoId, dataInicio, dataFim);
  }
}
