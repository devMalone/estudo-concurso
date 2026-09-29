const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Configurar banco de teste temporário em memória
const tempDbPath = path.resolve(__dirname, 'test_concurso.db');
process.env.DB_PATH = tempDbPath;

const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(tempDbPath);

// Aplicar schema no banco de testes
const schemaSql = fs.readFileSync(path.resolve(__dirname, '../server/src/db/schema.sql'), 'utf8');
db.exec(schemaSql);

// Test 1: Data Utils
test('1. Utilitários de Calendário (D+7, D+15, D+30 sem conversão UTC)', () => {
  function addDays(dateStr, days) {
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const base = '2026-03-01';
  assert.strictEqual(addDays(base, 7), '2026-03-08', 'D+7 deve ser 08/03/2026');
  assert.strictEqual(addDays(base, 15), '2026-03-16', 'D+15 deve ser 16/03/2026');
  assert.strictEqual(addDays(base, 30), '2026-03-31', 'D+30 deve ser 31/03/2026');
});

// Test 2: Heurística de Manutenção pós-30 dias
test('2. Manutenção pós-30 dias: intervalos e justificativas transparentes', () => {
  function calcularProximoIntervalo(taxaAcertos, totalQuestoes, minAmostra = 5) {
    if (taxaAcertos === null || totalQuestoes < minAmostra) {
      return { intervalo: 15, motivo: 'Amostra insuficiente de questões; intervalo mantido.' };
    }
    const perc = Math.round(taxaAcertos * 100);
    if (perc < 70) {
      return { intervalo: 7, motivo: `< 70%: revisão curta em 7 dias` };
    }
    if (perc < 85) {
      return { intervalo: 15, motivo: `70%-84%: revisão média em 15 dias` };
    }
    return { intervalo: 30, motivo: `>= 85%: revisão espaçada em 30 dias` };
  }

  // Menos de 70%
  const r1 = calcularProximoIntervalo(6 / 10, 10); // 60%
  assert.strictEqual(r1.intervalo, 7, 'Acerto de 60% deve gerar intervalo de 7 dias');

  // 70% a 84%
  const r2 = calcularProximoIntervalo(8 / 10, 10); // 80%
  assert.strictEqual(r2.intervalo, 15, 'Acerto de 80% deve gerar intervalo de 15 dias');

  // >= 85%
  const r3 = calcularProximoIntervalo(9 / 10, 10); // 90%
  assert.strictEqual(r3.intervalo, 30, 'Acerto de 90% deve gerar intervalo de 30 dias');

  // Amostra insuficiente (3 questões)
  const r4 = calcularProximoIntervalo(3 / 3, 3, 5);
  assert.strictEqual(r4.intervalo, 15, 'Amostra de 3 questões com mínimo de 5 deve manter intervalo');
});

// Test 3: Validação Estrita de Questões
test('3. Validação de Questões: acertos <= total, não negativos', () => {
  function validarQuestoes(total, acertos) {
    if (!Number.isInteger(total) || total <= 0) throw new Error('Total inválido');
    if (!Number.isInteger(acertos) || acertos < 0) throw new Error('Acertos inválido');
    if (acertos > total) throw new Error('Acertos não pode exceder total');
    return { erros: total - acertos, taxa: acertos / total };
  }

  const v1 = validarQuestoes(20, 17);
  assert.strictEqual(v1.erros, 3);
  assert.strictEqual(v1.taxa, 0.85);

  assert.throws(() => validarQuestoes(10, 12), /Acertos não pode exceder total/);
  assert.throws(() => validarQuestoes(0, 0), /Total inválido/);
  assert.throws(() => validarQuestoes(10, -1), /Acertos inválido/);
});

// Test 4: Estatística Geral Ponderada (NUNCA média simples de porcentagens)
test('4. Taxa Geral Global: soma acertos / soma questões (ponderada fiel)', () => {
  // Exemplo clássico onde a média simples falha:
  // Sessão 1: 1 de 1 acertada (100%)
  // Sessão 2: 50 de 100 acertadas (50%)
  // Média simples das porcentagens = (100% + 50%) / 2 = 75% (ERRADO!)
  // Taxa ponderada real = (1 + 50) / (1 + 100) = 51 / 101 ≈ 50.49% (CORRETO!)

  const sessoes = [
    { total: 1, acertos: 1 },
    { total: 100, acertos: 50 }
  ];

  const somaQuestoes = sessoes.reduce((acc, s) => acc + s.total, 0);
  const somaAcertos = sessoes.reduce((acc, s) => acc + s.acertos, 0);
  const taxaPonderada = somaAcertos / somaQuestoes;

  assert.strictEqual(somaQuestoes, 101);
  assert.strictEqual(somaAcertos, 51);
  assert.ok(Math.abs(taxaPonderada - (51 / 101)) < 0.0001, 'Taxa ponderada deve ser 51/101');
  assert.notStrictEqual(taxaPonderada, 0.75, 'Taxa ponderada não pode ser a média simples 75%');
});

// Test 5: Pontuação Oficial CESPE e Eliminações BACEN Técnico
test('5. Pontuação Oficial CESPE do Edital BACEN 2013 Técnico', () => {
  function avaliarCespe(certosP1, erradosP1, certosP2, erradosP2, discursiva) {
    const notaP1 = certosP1 - erradosP1;
    const notaP2 = certosP2 - erradosP2;
    const notaTotal = notaP1 + notaP2;

    const apP1 = notaP1 >= 12.0;
    const apP2 = notaP2 >= 18.0;
    const apTot = notaTotal >= 36.0;
    const apDisc = discursiva === undefined ? true : discursiva >= 25.0;

    return {
      notaP1,
      notaP2,
      notaTotal,
      aprovado: apP1 && apP2 && apTot && apDisc
    };
  }

  // Caso 1: Aprovado em tudo
  const c1 = avaliarCespe(40, 10, 45, 10, 35.0);
  assert.strictEqual(c1.notaP1, 30);
  assert.strictEqual(c1.notaP2, 35);
  assert.strictEqual(c1.notaTotal, 65);
  assert.strictEqual(c1.aprovado, true);

  // Caso 2: Reprovado em P1 (< 12)
  const c2 = avaliarCespe(20, 15, 50, 5, 40.0);
  assert.strictEqual(c2.notaP1, 5); // 5 < 12
  assert.strictEqual(c2.aprovado, false);

  // Caso 3: Reprovado em P2 (< 18)
  const c3 = avaliarCespe(35, 5, 25, 10, 40.0);
  assert.strictEqual(c3.notaP2, 15); // 15 < 18
  assert.strictEqual(c3.aprovado, false);

  // Caso 4: P1 e P2 passaram individualmente, mas soma < 36
  // Ex: P1 = 15, P2 = 19 -> Total = 34 (< 36)
  const c4 = avaliarCespe(25, 10, 29, 10, 40.0);
  assert.strictEqual(c4.notaP1, 15);
  assert.strictEqual(c4.notaP2, 19);
  assert.strictEqual(c4.notaTotal, 34); // 34 < 36
  assert.strictEqual(c4.aprovado, false);

  // Caso 5: Discursiva abaixo do mínimo (< 25)
  const c5 = avaliarCespe(40, 5, 45, 5, 24.5);
  assert.strictEqual(c5.aprovado, false, 'Discursiva 24.5 < 25.0 deve reprovar');
});

// Test 6: Registro de estudo em tópicos extensos sem forçar conclusão prematura
test('6. Registro de Estudo Parcial: acúmulo de tempo sem marcar concluído', () => {
  db.exec('DELETE FROM sessoes_estudo; DELETE FROM estudos;');
  // Simular inserção de assunto de teste
  const assuntoId = 'assunto-teste-interpretacao';
  const discId = 'disc-teste-portugues';

  db.exec(`INSERT OR IGNORE INTO concursos (id, nome, orgao, banca, edital_numero, cargo, area, escolaridade, remuneracao_inicial, jornada_horas, criado_em, atualizado_em)
           VALUES ('c-teste', 'BACEN', 'BACEN', 'CESPE', '1/2013', 'Técnico', 'Área 1', 'Médio', 7000, 40, '2026-01-01', '2026-01-01');`);
  db.exec(`INSERT OR IGNORE INTO disciplinas (id, concurso_id, grupo, nome, ordem, criado_em)
           VALUES ('${discId}', 'c-teste', 'Conhecimentos Básicos', 'Língua Portuguesa', 1, '2026-01-01');`);
  db.exec(`INSERT OR IGNORE INTO assuntos (id, disciplina_id, codigo_edital, titulo, nivel, ordem, criado_em)
           VALUES ('${assuntoId}', '${discId}', '1', 'Compreensão e Interpretação de Textos', 1, 1, '2026-01-01');`);

  // Sessão 1: Estudou 50 min, 10 questões, não concluiu o tópico
  db.exec(`INSERT INTO sessoes_estudo (id, assunto_id, disciplina_id, data, tempo_minutos, questoes_realizadas, questoes_acertos, questoes_erros, concluiu_topico, criado_em)
           VALUES ('s1', '${assuntoId}', '${discId}', '2026-09-29', 50, 10, 8, 2, 0, '2026-09-29T12:00:00Z');`);
  db.exec(`INSERT INTO estudos (id, assunto_id, concluido, data_estudo, tempo_minutos, criado_em, atualizado_em)
           VALUES ('e1', '${assuntoId}', 0, '2026-09-29', 50, '2026-09-29T12:00:00Z', '2026-09-29T12:00:00Z');`);

  let est = db.prepare('SELECT * FROM estudos WHERE assunto_id = ?').get(assuntoId);
  assert.strictEqual(est.concluido, 0, 'Tópico NÃO deve estar concluído');
  assert.strictEqual(est.tempo_minutos, 50, 'Deve acumular 50 min');

  // Sessão 2: Mais 40 min, 5 questões no dia seguinte, ainda não concluiu
  db.exec(`INSERT INTO sessoes_estudo (id, assunto_id, disciplina_id, data, tempo_minutos, questoes_realizadas, questoes_acertos, questoes_erros, concluiu_topico, criado_em)
           VALUES ('s2', '${assuntoId}', '${discId}', '2026-09-30', 40, 5, 4, 1, 0, '2026-09-30T12:00:00Z');`);
  const soma = db.prepare('SELECT SUM(tempo_minutos) as s FROM sessoes_estudo WHERE assunto_id = ?').get(assuntoId);
  db.prepare('UPDATE estudos SET tempo_minutos = ?, data_estudo = ? WHERE assunto_id = ?').run(soma.s, '2026-09-30', assuntoId);

  est = db.prepare('SELECT * FROM estudos WHERE assunto_id = ?').get(assuntoId);
  assert.strictEqual(est.concluido, 0, 'Tópico continua NÃO concluído');
  assert.strictEqual(est.tempo_minutos, 90, 'Deve acumular 90 minutos de estudo');
});

// Test 7: Utilitário de Semana de Estudos
test('7. Cálculo de Semana Corrente (Segunda a Domingo)', () => {
  function getWeekRangeTest(dateStr) {
    const parts = dateStr.split('-');
    const base = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    const dayOfWeek = base.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { inicio: fmt(monday), fim: fmt(sunday) };
  }

  // 29/09/2026 é Terça-feira -> Segunda = 28/09/2026, Domingo = 04/10/2026
  const w1 = getWeekRangeTest('2026-09-29');
  assert.strictEqual(w1.inicio, '2026-09-28', 'Início da semana deve ser Segunda-feira 28/09/2026');
  assert.strictEqual(w1.fim, '2026-10-04', 'Fim da semana deve ser Domingo 04/10/2026');
});

// Limpeza após testes
test.after(() => {
  try {
    fs.unlinkSync(tempDbPath);
  } catch {}
});

