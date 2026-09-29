import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { getDatabase } from './db/database.js';
import { seedBacenTecnico } from './seed/bacenTecnicoSeed.js';
import { getTodayDateString } from './utils/dateUtils.js';
import { DashboardService } from './services/dashboardService.js';
import { AssuntoService } from './services/assuntoService.js';
import { QuestaoService } from './services/questaoService.js';
import { RevisaoEngine } from './services/revisaoEngine.js';
import { AgendaEngine } from './services/agendaEngine.js';
import { SimuladoEngine } from './services/simuladoEngine.js';
import { BackupEngine } from './services/backupEngine.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// Inicializar banco e seed inicial
getDatabase();
seedBacenTecnico();

// Middleware para registrar data corrente simulável via query param ?hoje=YYYY-MM-DD
function getRequestDate(req: express.Request): string {
  if (req.query.hoje && typeof req.query.hoje === 'string') {
    return req.query.hoje;
  }
  return getTodayDateString();
}

// -------------------------------------------------------------
// 1. DASHBOARD & CONCURSO
// -------------------------------------------------------------
app.get('/api/dashboard', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const concursoId = (req.query.concursoId as string) || 'bacen-2013-tecnico-area-1';
    const data = DashboardService.getDashboard(concursoId, hoje);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/concurso', (req, res) => {
  try {
    const db = getDatabase();
    const concursoId = (req.query.concursoId as string) || 'bacen-2013-tecnico-area-1';
    const concurso = db.prepare('SELECT * FROM concursos WHERE id = ?').get(concursoId);
    const etapas = db.prepare('SELECT * FROM etapas_concurso WHERE concurso_id = ?').all(concursoId);
    res.json({ success: true, concurso, etapas });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Atualizar data da prova (estimada pelo usuário)
app.put('/api/concurso/data-prova', (req, res) => {
  try {
    const db = getDatabase();
    const { concursoId, dataProva, estimada } = req.body;
    const cid = concursoId || 'bacen-2013-tecnico-area-1';
    db.prepare(`
      UPDATE concursos
      SET data_prova = ?, data_prova_estimada = ?, atualizado_em = ?
      WHERE id = ?
    `).run(dataProva, estimada ? 1 : 0, new Date().toISOString(), cid);

    res.json({ success: true, message: 'Data da prova atualizada com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2. ÁRVORE DO EDITAL & ESTUDO INICIAL
// -------------------------------------------------------------
app.get('/api/arvore', (req, res) => {
  try {
    const concursoId = (req.query.concursoId as string) || 'bacen-2013-tecnico-area-1';
    const arvore = AssuntoService.getArvoreCompleta(concursoId);
    res.json({ success: true, data: arvore });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/assuntos/:id', (req, res) => {
  try {
    const detalhes = AssuntoService.getDetalhesAssunto(req.params.id);
    res.json({ success: true, data: detalhes });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

app.post('/api/assuntos/:id/estudo', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const { concluido, dataEstudo, tempoMinutos, anotacoes, materiais } = req.body;
    const resultado = AssuntoService.registrarEstudoInicial(req.params.id, {
      concluido: Boolean(concluido),
      dataEstudo,
      tempoMinutos,
      anotacoes,
      materiais
    }, hoje);
    res.json({ success: true, ...resultado });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Registrar sessão de estudo com tempo, questões, anotações, data e conclusão opcional
app.post('/api/assuntos/:id/sessao-estudo', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const resultado = AssuntoService.registrarSessaoEstudo(req.params.id, req.body, hoje);
    res.json({ success: true, ...resultado });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Excluir sessão de estudo
app.delete('/api/assuntos/sessoes-estudo/:id', (req, res) => {
  try {
    const resultado = AssuntoService.excluirSessaoEstudo(req.params.id);
    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});


// -------------------------------------------------------------
// 3. SESSÕES DE QUESTÕES (TREINO INDEPENDENTE)
// -------------------------------------------------------------
app.get('/api/questoes', (req, res) => {
  try {
    const sessoes = QuestaoService.listarSessoes({
      disciplinaId: req.query.disciplinaId as string,
      assuntoId: req.query.assuntoId as string,
      tipo: req.query.tipo as string,
      limite: req.query.limite ? parseInt(req.query.limite as string, 10) : 50
    });
    res.json({ success: true, data: sessoes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/questoes', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const sessao = QuestaoService.criarSessao(req.body, hoje);
    res.json({ success: true, data: sessao });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/questoes/:id', (req, res) => {
  try {
    const sessao = QuestaoService.atualizarSessao(req.params.id, req.body);
    res.json({ success: true, data: sessao });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/questoes/:id', (req, res) => {
  try {
    QuestaoService.excluirSessao(req.params.id);
    res.json({ success: true, message: 'Sessão excluída com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/questoes/estatisticas', (req, res) => {
  try {
    const stats = QuestaoService.getEstatisticasGlobais();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4. REVISÕES (7D, 15D, 30D E MANUTENÇÃO)
// -------------------------------------------------------------
app.get('/api/revisoes', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    RevisaoEngine.atualizarStatusDiario(hoje);

    const db = getDatabase();
    let query = `
      SELECT r.*, a.titulo as assunto_titulo, a.codigo_edital, d.nome as disciplina_nome
      FROM revisoes r
      JOIN assuntos a ON a.id = r.assunto_id
      JOIN disciplinas d ON d.id = a.disciplina_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (req.query.status) {
      query += ` AND r.status = ?`;
      params.push(req.query.status);
    }
    if (req.query.assuntoId) {
      query += ` AND r.assunto_id = ?`;
      params.push(req.query.assuntoId);
    }

    query += ` ORDER BY r.data_prevista ASC`;
    const data = db.prepare(query).all(...params);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/revisoes/:id/concluir', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const { dataReal, totalQuestoes, acertos, origem, observacoes } = req.body;
    const resultado = RevisaoEngine.concluirRevisao({
      revisaoId: req.params.id,
      dataReal: dataReal || hoje,
      totalQuestoes: totalQuestoes !== undefined ? parseInt(totalQuestoes, 10) : undefined,
      acertos: acertos !== undefined ? parseInt(acertos, 10) : undefined,
      origem,
      observacoes
    }, hoje);
    res.json({ success: true, ...resultado });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/revisoes/:id/desfazer', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const resultado = RevisaoEngine.desfazerConclusao(req.params.id, hoje);
    res.json({ success: true, data: resultado });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/revisoes/recuperacao', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const { assuntoId, revisoesAtrasadasIds, dataAgendada } = req.body;
    const novaRevisao = RevisaoEngine.criarRevisaoRecuperacao(
      assuntoId,
      revisoesAtrasadasIds,
      dataAgendada || hoje,
      hoje
    );
    res.json({ success: true, data: novaRevisao });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 5. AGENDA E ROTINA SEMANAL/DIÁRIA
// -------------------------------------------------------------
app.get('/api/agenda', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const dataInicio = (req.query.dataInicio as string) || hoje;
    // Padrão: 7 dias a partir do início
    const { addDays } = require('./utils/dateUtils.js');
    const dataFim = (req.query.dataFim as string) || addDays(dataInicio, 6);
    const blocos = AgendaEngine.getBlocosPorPeriodo(dataInicio, dataFim);
    res.json({ success: true, data: blocos, dataInicio, dataFim });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/agenda/gerar', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const { dataInicio, diasParaPlanejar } = req.body;
    const resultado = AgendaEngine.gerarAgenda({
      dataInicio: dataInicio || hoje,
      diasParaPlanejar: diasParaPlanejar || 7
    }, hoje);
    res.json({ success: true, ...resultado });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/agenda/blocos/:id/concluir', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const { totalQuestoes, acertos, origem, observacoes } = req.body;
    const questaoData = totalQuestoes ? { totalQuestoes: parseInt(totalQuestoes, 10), acertos: parseInt(acertos || 0, 10), origem, observacoes } : undefined;
    const resultado = AgendaEngine.concluirBloco(req.params.id, questaoData, hoje);
    res.json({ success: true, ...resultado });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/agenda/blocos/:id/toggle-fixado', (req, res) => {
  try {
    const bloco = AgendaEngine.toggleFixado(req.params.id);
    res.json({ success: true, data: bloco });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/agenda/config', (req, res) => {
  try {
    const config = AgendaEngine.getConfig();
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/agenda/config', (req, res) => {
  try {
    AgendaEngine.salvarConfig('bacen-2013-tecnico-area-1', req.body);
    res.json({ success: true, message: 'Configuração de rotina atualizada com sucesso.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 6. SIMULADOS (PONTUAÇÃO CESPE E DISCURSIVA)
// -------------------------------------------------------------
app.get('/api/simulados', (req, res) => {
  try {
    const lista = SimuladoEngine.listarSimulados();
    res.json({ success: true, data: lista });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/simulados', (req, res) => {
  try {
    const hoje = getRequestDate(req);
    const resultado = SimuladoEngine.registrarSimulado(req.body, hoje);
    res.json({ success: true, ...resultado });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 7. BACKUP, PERSISTÊNCIA & SUPABASE
// -------------------------------------------------------------
app.get('/api/backup/exportar', (req, res) => {
  try {
    const payload = BackupEngine.exportarBackup();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-concurso-${getTodayDateString()}.json`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/backup/restaurar', (req, res) => {
  try {
    const resultado = BackupEngine.restaurarBackup(req.body);
    res.json({ success: true, ...resultado });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/supabase/script', (req, res) => {
  try {
    const script = BackupEngine.getSupabaseSchemaScript();
    res.json({ success: true, script });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Salvar / testar conexão com Supabase
app.post('/api/supabase/config', (req, res) => {
  try {
    const { url, anonKey } = req.body;
    const db = getDatabase();
    db.prepare(`
      INSERT INTO supabase_config (id, url, anon_key, status_sync)
      VALUES ('supabase_default', ?, ?, 'configurado')
      ON CONFLICT(id) DO UPDATE SET
        url = excluded.url,
        anon_key = excluded.anon_key,
        status_sync = 'configurado'
    `).run(url, anonKey);

    res.json({ success: true, message: 'Configuração do Supabase salva com sucesso.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/supabase/config', (req, res) => {
  try {
    const db = getDatabase();
    const config = db.prepare('SELECT id, url, ultimo_sync, status_sync FROM supabase_config WHERE id = ?').get('supabase_default');
    res.json({ success: true, data: config || null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Iniciar servidor HTTP
app.listen(CONFIG.PORT, () => {
  console.log(`Backend rodando com sucesso em http://localhost:${CONFIG.PORT}`);
  console.log(`Banco SQLite persistente em: ${CONFIG.DB_PATH}`);
});
