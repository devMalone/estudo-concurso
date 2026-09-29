import { getDatabase } from '../db/database.js';
import { getTodayDateString } from '../utils/dateUtils.js';

export function seedBacenTecnico(): void {
  const db = getDatabase();

  const concursoId = 'bacen-2013-tecnico-area-1';

  // Verificar se já existe
  const exists = db.prepare('SELECT id FROM concursos WHERE id = ?').get(concursoId);
  if (exists) {
    console.log('Seed: concurso BACEN Técnico já cadastrado.');
    return;
  }

  const now = new Date().toISOString();

  // 1. Cadastrar concurso
  const insertConcurso = db.prepare(`
    INSERT INTO concursos (
      id, nome, orgao, banca, edital_numero, cargo, area,
      escolaridade, remuneracao_inicial, jornada_horas,
      data_prova, data_prova_estimada, ativo, criado_em, atualizado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertConcurso.run(
    concursoId,
    'BACEN 2013 - Técnico do Banco Central do Brasil',
    'Banco Central do Brasil (BACEN)',
    'CESPE/UnB',
    'Edital Nº 1/2013 BCB/DEPES, de 15 de agosto de 2013',
    'Técnico do Banco Central do Brasil',
    'Área 1 – Suporte Técnico-Administrativo',
    'Nível Médio Completo',
    5158.23,
    40,
    '2013-10-20',
    0, // data confirmada pelo edital
    now,
    now
  );

  // 2. Etapas de Avaliação (P1, P2 e P3)
  const insertEtapa = db.prepare(`
    INSERT INTO etapas_concurso (
      id, concurso_id, nome, tipo, quantidade_itens,
      pontuacao_maxima, pontuacao_minima, peso, carater,
      duracao_minutos, regras_pontuacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEtapa.run(
    'bacen-tec-p1',
    concursoId,
    '(P1) Prova Objetiva Conhecimentos Básicos',
    'objetiva_c_e',
    60,
    60.0,
    12.0, // Subitem 8.10.5 alínea "a": reprovado se < 12.00 pontos
    1.0,
    'eliminatorio_classificatorio',
    270,
    JSON.stringify({
      tipo: 'CESPE_CERTO_ERRADO',
      acerto: 1.0,
      erro: -1.0,
      branco: 0.0,
      minimo_prova: 12.0,
      descricao: 'Cada acerto soma 1 ponto; cada erro desconta 1 ponto. Mínimo de 12 pontos em P1.'
    })
  );

  insertEtapa.run(
    'bacen-tec-p2',
    concursoId,
    '(P2) Prova Objetiva Conhecimentos Específicos',
    'objetiva_c_e',
    60,
    60.0,
    18.0, // Subitem 8.10.5 alínea "b": reprovado se < 18.00 pontos
    1.0,
    'eliminatorio_classificatorio',
    270,
    JSON.stringify({
      tipo: 'CESPE_CERTO_ERRADO',
      acerto: 1.0,
      erro: -1.0,
      branco: 0.0,
      minimo_prova: 18.0,
      minimo_conjunto_p1_p2: 36.0, // Subitem 8.10.5 alínea "c": reprovado se P1+P2 < 36.00 pontos
      descricao: 'Cada acerto soma 1 ponto; cada erro desconta 1 ponto. Mínimo de 18 pontos em P2 e 36 pontos no total (P1+P2).'
    })
  );

  insertEtapa.run(
    'bacen-tec-p3',
    concursoId,
    '(P3) Prova Discursiva - Redação',
    'discursiva',
    1,
    50.0,
    25.0, // Subitem 9.8.1: reprovado se < 25.00 pontos
    1.0,
    'eliminatorio_classificatorio',
    270,
    JSON.stringify({
      tipo: 'DISCURSIVA_DISSERTATIVA',
      max_linhas: 30,
      minimo: 25.0,
      formula: 'NR = NC - (NE / TL)',
      descricao: 'Redação dissertativa de até 30 linhas sobre tema dos conhecimentos específicos. Mínimo 25 pontos.'
    })
  );

  // 3. Disciplinas e Conteúdo Fiel
  const insertDisciplina = db.prepare(`
    INSERT INTO disciplinas (
      id, concurso_id, grupo, nome, ordem, peso, quantidade_itens_estimada, criado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAssunto = db.prepare(`
    INSERT INTO assuntos (
      id, disciplina_id, parent_id, codigo_edital, titulo, nivel, ordem,
      trecho_original_edital, pagina_edital, is_sugestao_estudo, criado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  interface AssuntoItem {
    id: string;
    parent_id?: string;
    codigo: string;
    titulo: string;
    nivel: number;
    ordem: number;
    trecho: string;
    pagina: number;
  }

  interface DisciplinaData {
    id: string;
    grupo: string;
    nome: string;
    ordem: number;
    peso: number;
    itensEst: number;
    assuntos: AssuntoItem[];
  }

  const disciplinasData: DisciplinaData[] = [
    // --- BÁSICOS ---
    {
      id: 'disc-portugues',
      grupo: 'Conhecimentos Básicos',
      nome: 'Língua Portuguesa',
      ordem: 1,
      peso: 1.0,
      itensEst: 15,
      assuntos: [
        { id: 'lp-1', codigo: '1', titulo: 'Compreensão e interpretação de textos', nivel: 1, ordem: 1, pagina: 40, trecho: '1 Compreensão e interpretação de textos.' },
        { id: 'lp-2', codigo: '2', titulo: 'Estrutura e organização do texto', nivel: 1, ordem: 2, pagina: 40, trecho: '2 Estrutura e organização do texto.' },
        { id: 'lp-3', codigo: '3', titulo: 'Elaboração de textos para comunicações de rotina', nivel: 1, ordem: 3, pagina: 40, trecho: '3 Elaboração de textos para comunicações de rotina (e-mails, despachos, carta e ofício).' },
        { id: 'lp-4', codigo: '4', titulo: 'Ortografia', nivel: 1, ordem: 4, pagina: 40, trecho: '4 Ortografia.' },
        { id: 'lp-5', codigo: '5', titulo: 'Semântica', nivel: 1, ordem: 5, pagina: 40, trecho: '5 Semântica.' },
        { id: 'lp-6', codigo: '6', titulo: 'Morfologia', nivel: 1, ordem: 6, pagina: 40, trecho: '6 Morfologia.' },
        { id: 'lp-7', codigo: '7', titulo: 'Sintaxe', nivel: 1, ordem: 7, pagina: 40, trecho: '7 Sintaxe.' },
        { id: 'lp-8', codigo: '8', titulo: 'Pontuação', nivel: 1, ordem: 8, pagina: 40, trecho: '8 Pontuação.' },
      ]
    },
    {
      id: 'disc-dir-const',
      grupo: 'Conhecimentos Básicos',
      nome: 'Noções de Direito Constitucional',
      ordem: 2,
      peso: 1.0,
      itensEst: 10,
      assuntos: [
        { id: 'dc-1', codigo: '1', titulo: 'A Constituição da República Federativa do Brasil (1988)', nivel: 1, ordem: 1, pagina: 41, trecho: '1 A Constituição da República Federativa do Brasil (1988).' },
        { id: 'dc-1-1', parent_id: 'dc-1', codigo: '1.1', titulo: 'Princípios Fundamentais', nivel: 2, ordem: 1, pagina: 41, trecho: '1.1 Princípios Fundamentais.' },
        { id: 'dc-1-2', parent_id: 'dc-1', codigo: '1.2', titulo: 'Direitos e Garantias Fundamentais', nivel: 2, ordem: 2, pagina: 41, trecho: '1.2. Direitos e Garantias Fundamentais: direitos e deveres individuais e coletivos, direitos sociais.' },
        { id: 'dc-1-3', parent_id: 'dc-1', codigo: '1.3', titulo: 'Administração Pública: disposições gerais e servidores públicos civis', nivel: 2, ordem: 3, pagina: 41, trecho: '1.3 Administração Pública: disposições gerais, servidores públicos civis.' },
        { id: 'dc-1-4', parent_id: 'dc-1', codigo: '1.4', titulo: 'Poderes da União', nivel: 2, ordem: 4, pagina: 41, trecho: '1.4 Poderes da União.' },
      ]
    },
    {
      id: 'disc-dir-adm',
      grupo: 'Conhecimentos Básicos',
      nome: 'Noções de Direito Administrativo',
      ordem: 3,
      peso: 1.0,
      itensEst: 10,
      assuntos: [
        { id: 'da-1', codigo: '1', titulo: 'Atos Administrativos: conceito, requisitos, atributos, classificação, invalidação', nivel: 1, ordem: 1, pagina: 41, trecho: '1 Atos Administrativos: conceito, requisitos, atributos, classificação, invalidação.' },
        { id: 'da-2', codigo: '2', titulo: 'Servidor Público e regime jurídico dos servidores civis (Lei nº 8.112/1990)', nivel: 1, ordem: 2, pagina: 41, trecho: '2 Servidor Público; regime jurídico dos servidores públicos civis (Lei nº 8.112/1990, e suas alterações).' },
        { id: 'da-2-1', parent_id: 'da-2', codigo: '2.1', titulo: 'Disposições preliminares (arts. 1º ao 4º)', nivel: 2, ordem: 1, pagina: 41, trecho: '2.1 Disposições preliminares (arts. 1º ao 4º).' },
        { id: 'da-2-2', parent_id: 'da-2', codigo: '2.2', titulo: 'Provimento (arts. 5º ao 22 e 24 ao 32)', nivel: 2, ordem: 2, pagina: 41, trecho: '2.2 Provimento (arts. 5º ao 22 e 24 ao 32).' },
        { id: 'da-2-3', parent_id: 'da-2', codigo: '2.3', titulo: 'Vacância (arts. 33 ao 35)', nivel: 2, ordem: 3, pagina: 41, trecho: '2.3 Vacância (arts. 33 ao 35).' },
        { id: 'da-2-4', parent_id: 'da-2', codigo: '2.4', titulo: 'Direitos e vantagens (arts. 40 ao 115)', nivel: 2, ordem: 4, pagina: 41, trecho: '2.4 Direitos e vantagens (arts. 40 ao 115).' },
        { id: 'da-2-5', parent_id: 'da-2', codigo: '2.5', titulo: 'Regime disciplinar (arts. 116 ao 142)', nivel: 2, ordem: 5, pagina: 41, trecho: '2.5 Regime disciplinar (arts. 116 ao 142).' },
        { id: 'da-2-6', parent_id: 'da-2', codigo: '2.6', titulo: 'Seguridade social do servidor (arts. 183 ao 231)', nivel: 2, ordem: 6, pagina: 41, trecho: '2.6 Seguridade social do servidor (arts. 183 ao 231).' },
        { id: 'da-2-7', parent_id: 'da-2', codigo: '2.7', titulo: 'Disposições gerais (arts. 236 ao 242)', nivel: 2, ordem: 7, pagina: 41, trecho: '2.7 Disposições gerais (arts.236 ao 242).' },
      ]
    },
    {
      id: 'disc-gestao-pub',
      grupo: 'Conhecimentos Básicos',
      nome: 'Gestão Pública',
      ordem: 4,
      peso: 1.0,
      itensEst: 10,
      assuntos: [
        { id: 'gp-1', codigo: '1', titulo: 'Estado, Governo e Sociedade: conceitos e evolução do Estado contemporâneo', nivel: 1, ordem: 1, pagina: 41, trecho: '1 Estado, Governo e Sociedade: conceito e evolução do Estado contemporâneo; aspectos fundamentais na formação do estado brasileiro; teorias das formas e dos sistemas de governo.' },
        { id: 'gp-2', codigo: '2', titulo: 'Administração Estratégica', nivel: 1, ordem: 2, pagina: 41, trecho: '2 Administração Estratégica.' },
        { id: 'gp-3', codigo: '3', titulo: 'Organização do Estado e da gestão', nivel: 1, ordem: 3, pagina: 41, trecho: '3 Organização do Estado e da gestão.' },
        { id: 'gp-4', codigo: '4', titulo: 'Departamentalização; descentralização; desconcentração', nivel: 1, ordem: 4, pagina: 41, trecho: '4 Departamentalização; descentralização; desconcentração.' },
        { id: 'gp-5', codigo: '5', titulo: 'Os agentes públicos e a sua gestão: normas legais e constitucionais', nivel: 1, ordem: 5, pagina: 41, trecho: '5 Os agentes públicos e a sua gestão, normas legais e constitucionais aplicáveis.' },
        { id: 'gp-6', codigo: '6', titulo: 'Serviço de atendimento ao cidadão', nivel: 1, ordem: 6, pagina: 41, trecho: '6 Serviço de atendimento ao cidadão.' },
        { id: 'gp-7', codigo: '7', titulo: 'Comunicação interna e externa; relacionamento interpessoal e trabalho em equipe', nivel: 1, ordem: 7, pagina: 41, trecho: '7 Comunicação interna e externa; relacionamento interpessoal e trabalho em equipe.' },
        { id: 'gp-8', codigo: '8', titulo: 'Gestão de conflitos', nivel: 1, ordem: 8, pagina: 41, trecho: '8 Gestão de conflitos.' },
        { id: 'gp-9', codigo: '9', titulo: 'Governança na gestão pública', nivel: 1, ordem: 9, pagina: 41, trecho: '9 Governança na gestão pública.' },
        { id: 'gp-10', codigo: '10', titulo: 'Ética no Serviço Público', nivel: 1, ordem: 10, pagina: 41, trecho: '10 Ética no Serviço Público.' },
        { id: 'gp-10-1', parent_id: 'gp-10', codigo: '10.1', titulo: 'Ética e moral', nivel: 2, ordem: 1, pagina: 41, trecho: '10.1 Ética e moral.' },
        { id: 'gp-10-2', parent_id: 'gp-10', codigo: '10.2', titulo: 'Ética, princípios e valores', nivel: 2, ordem: 2, pagina: 41, trecho: '10.2 Ética, princípios e valores.' },
        { id: 'gp-10-3', parent_id: 'gp-10', codigo: '10.3', titulo: 'Ética e democracia: exercício da cidadania', nivel: 2, ordem: 3, pagina: 41, trecho: '10.3 Ética e democracia: exercício da cidadania.' },
        { id: 'gp-10-4', parent_id: 'gp-10', codigo: '10.4', titulo: 'Ética e função pública', nivel: 2, ordem: 4, pagina: 41, trecho: '10.4 Ética e função pública.' },
        { id: 'gp-10-5', parent_id: 'gp-10', codigo: '10.5', titulo: 'Ética no Setor Público (Normas e Leis)', nivel: 2, ordem: 5, pagina: 41, trecho: '10.5 Ética no Setor Público.' },
        { id: 'gp-10-5-1', parent_id: 'gp-10-5', codigo: '10.5.1', titulo: 'Código de Ética Profissional do Servidor Público (Decreto nº 1.171/1994)', nivel: 3, ordem: 1, pagina: 41, trecho: '10.5.1 Código de Ética Profissional do Serviço Público (Decreto nº 1.171/1994).' },
        { id: 'gp-10-5-2', parent_id: 'gp-10-5', codigo: '10.5.2', titulo: 'Lei nº 8.112/1990: regime disciplinar (deveres, proibições, penalidades)', nivel: 3, ordem: 2, pagina: 41, trecho: '10.5.2 Lei nº 8.112/1990 e alterações: regime disciplinar (deveres e proibições, acumulação, responsabilidades, penalidades).' },
        { id: 'gp-10-5-3', parent_id: 'gp-10-5', codigo: '10.5.3', titulo: 'Lei nº 8.429/1992: atos de improbidade administrativa', nivel: 3, ordem: 3, pagina: 41, trecho: '10.5.3 Lei nº 8.429/1992: das disposições gerais, dos atos de improbidade administrativa.' },
      ]
    },
    {
      id: 'disc-informatica',
      grupo: 'Conhecimentos Básicos',
      nome: 'Informática para Usuários',
      ordem: 5,
      peso: 1.0,
      itensEst: 8,
      assuntos: [
        { id: 'inf-1', codigo: '1', titulo: 'Noções de sistema operacional (Linux e Windows)', nivel: 1, ordem: 1, pagina: 41, trecho: '1 Noções de sistema operacional (ambientes Linux e Windows).' },
        { id: 'inf-2', codigo: '2', titulo: 'Edição de textos, planilhas e apresentações (LibreOffice)', nivel: 1, ordem: 2, pagina: 41, trecho: '2 Edição de textos, planilhas e apresentações (ambiente LibreOffice).' },
        { id: 'inf-3', codigo: '3', titulo: 'Redes de computadores', nivel: 1, ordem: 3, pagina: 41, trecho: '3 Redes de computadores.' },
        { id: 'inf-3-1', parent_id: 'inf-3', codigo: '3.1', titulo: 'Conceitos básicos, ferramentas, aplicativos e procedimentos de Internet e intranet', nivel: 2, ordem: 1, pagina: 41, trecho: '3.1 Conceitos básicos, ferramentas, aplicativos e procedimentos de Internet e intranet.' },
        { id: 'inf-3-2', parent_id: 'inf-3', codigo: '3.2', titulo: 'Programas de navegação (IE, Firefox e Chrome)', nivel: 2, ordem: 2, pagina: 41, trecho: '3.2 Programas de navegação (Microsoft Internet Explorer, Mozilla Firefox e Google Chrome).' },
        { id: 'inf-3-3', parent_id: 'inf-3', codigo: '3.3', titulo: 'Programas de correio eletrônico (Outlook Express, Thunderbird)', nivel: 2, ordem: 3, pagina: 41, trecho: '3.3 Programas de correio eletrônico (Outlook Express, Mozilla Thunderbird).' },
        { id: 'inf-3-4', parent_id: 'inf-3', codigo: '3.4', titulo: 'Sítios de busca e pesquisa na Internet', nivel: 2, ordem: 4, pagina: 41, trecho: '3.4 Sítios de busca e pesquisa na Internet.' },
        { id: 'inf-3-5', parent_id: 'inf-3', codigo: '3.5', titulo: 'Grupos de discussão e redes sociais', nivel: 2, ordem: 5, pagina: 41, trecho: '3.5 Grupos de discussão. 3.6 Redes sociais.' },
        { id: 'inf-4', codigo: '4', titulo: 'Conceitos de organização e de gerenciamento de informações, arquivos, pastas e programas', nivel: 1, ordem: 4, pagina: 41, trecho: '4 Conceitos de organização e de gerenciamento de informações, arquivos, pastas e programas.' },
        { id: 'inf-5', codigo: '5', titulo: 'Segurança da informação', nivel: 1, ordem: 5, pagina: 41, trecho: '5 Segurança da informação.' },
        { id: 'inf-5-1', parent_id: 'inf-5', codigo: '5.1', titulo: 'Procedimentos de segurança e noções de pragas virtuais', nivel: 2, ordem: 1, pagina: 41, trecho: '5.1 Procedimentos de segurança. 5.2 Noções de vírus, worms e pragas virtuais.' },
        { id: 'inf-5-2', parent_id: 'inf-5', codigo: '5.2', titulo: 'Aplicativos de segurança (antivírus, firewall e anti-spyware)', nivel: 2, ordem: 2, pagina: 41, trecho: '5.3 Aplicativos para segurança (antivírus, firewall e anti-spyware).' },
        { id: 'inf-5-3', parent_id: 'inf-5', codigo: '5.3', titulo: 'Procedimentos de backup e armazenamento em nuvem', nivel: 2, ordem: 3, pagina: 41, trecho: '5.4 Procedimentos de backup. 5.5 Armazenamento de dados na nuvem (cloud storage).' },
      ]
    },
    {
      id: 'disc-rlq',
      grupo: 'Conhecimentos Básicos',
      nome: 'Raciocínio Lógico-Quantitativo',
      ordem: 6,
      peso: 1.0,
      itensEst: 7,
      assuntos: [
        { id: 'rlq-1', codigo: '1', titulo: 'Estruturas lógicas', nivel: 1, ordem: 1, pagina: 41, trecho: '1 Estruturas lógicas.' },
        { id: 'rlq-2', codigo: '2', titulo: 'Lógica de argumentação: analogias, inferências, deduções e conclusões', nivel: 1, ordem: 2, pagina: 41, trecho: '2 Lógica de argumentação: analogias, inferências, deduções e conclusões.' },
        { id: 'rlq-3', codigo: '3', titulo: 'Lógica sentencial (ou proposicional)', nivel: 1, ordem: 3, pagina: 41, trecho: '3 Lógica sentencial (ou proposicional).' },
        { id: 'rlq-3-1', parent_id: 'rlq-3', codigo: '3.1', titulo: 'Proposições simples e compostas', nivel: 2, ordem: 1, pagina: 41, trecho: '3.1 Proposições simples e compostas.' },
        { id: 'rlq-3-2', parent_id: 'rlq-3', codigo: '3.2', titulo: 'Tabelas verdade', nivel: 2, ordem: 2, pagina: 41, trecho: '3.2 Tabelas verdade.' },
        { id: 'rlq-3-3', parent_id: 'rlq-3', codigo: '3.3', titulo: 'Equivalências e Leis de De Morgan', nivel: 2, ordem: 3, pagina: 41, trecho: '3.3 Equivalências. 3.4 Leis de De Morgan.' },
        { id: 'rlq-3-4', parent_id: 'rlq-3', codigo: '3.5', titulo: 'Diagramas lógicos', nivel: 2, ordem: 4, pagina: 41, trecho: '3.5 Diagramas lógicos.' },
        { id: 'rlq-4', codigo: '4', titulo: 'Lógica de primeira ordem', nivel: 1, ordem: 4, pagina: 41, trecho: '4 Lógica de primeira ordem.' },
        { id: 'rlq-5', codigo: '5', titulo: 'Princípios de contagem e probabilidade', nivel: 1, ordem: 5, pagina: 41, trecho: '5 Princípios de contagem e probabilidade.' },
        { id: 'rlq-6', codigo: '6', titulo: 'Operações com conjuntos', nivel: 1, ordem: 6, pagina: 41, trecho: '6 Operações com conjuntos.' },
        { id: 'rlq-7', codigo: '7', titulo: 'Raciocínio lógico envolvendo problemas aritméticos, geométricos e matriciais', nivel: 1, ordem: 7, pagina: 41, trecho: '7 Raciocínio lógico envolvendo problemas aritméticos, geométricos e matriciais.' },
      ]
    },

    // --- ESPECÍFICOS (P2) ---
    {
      id: 'disc-contabilidade',
      grupo: 'Conhecimentos Específicos',
      nome: 'Fundamentos de Contabilidade',
      ordem: 7,
      peso: 1.0,
      itensEst: 20,
      assuntos: [
        { id: 'cont-1', codigo: '1', titulo: 'Teoria e campo de atuação: conceitos, objetivos da informação contábil', nivel: 1, ordem: 1, pagina: 41, trecho: '1 Teoria e campo de atuação: conceitos, objetivos da informação contábil.' },
        { id: 'cont-2', codigo: '2', titulo: 'Livros contábeis e registros contábeis', nivel: 1, ordem: 2, pagina: 41, trecho: '2 Livros contábeis. 3 Registros contábeis.' },
        { id: 'cont-4', codigo: '4', titulo: 'Método das partidas dobradas e lançamentos', nivel: 1, ordem: 3, pagina: 41, trecho: '4 Método das partidas dobradas. 5 Lançamentos.' },
        { id: 'cont-6', codigo: '6', titulo: 'Regime de competência e Regime de caixa; Critérios de avaliação do Ativo e do Passivo', nivel: 1, ordem: 4, pagina: 41, trecho: '6 Regime de competência e Regime de caixa. Critérios de avaliação do Ativo e do Passivo.' },
        { id: 'cont-7', codigo: '7', titulo: 'O Patrimônio líquido: Capital subscrito e integralizado, reservas e provisões', nivel: 1, ordem: 5, pagina: 41, trecho: '7 O Patrimônio líquido. Capital subscrito e integralizado. 8 Reservas e provisões.' },
        { id: 'cont-9', codigo: '9', titulo: 'Contas patrimoniais e contas de resultado; Apuração do resultado', nivel: 1, ordem: 6, pagina: 41, trecho: '9 Contas patrimoniais e contas de resultado. 10. Apuração do resultado.' },
        { id: 'cont-11', codigo: '11', titulo: 'Operações contábeis comuns a empresas comerciais, industriais e de serviços', nivel: 1, ordem: 7, pagina: 41, trecho: '11 Operações contábeis comuns às empresas comerciais, industriais e de prestação de serviços.' },
        { id: 'cont-12', codigo: '12', titulo: 'Principais demonstrações contábeis – estrutura e finalidades', nivel: 1, ordem: 8, pagina: 41, trecho: '12 Principais demonstrações contábeis – estrutura e finalidades.' },
        { id: 'cont-13', codigo: '13', titulo: 'Balanço patrimonial, DRE, DMPL e Demonstração dos Fluxos de Caixa (método direto e indireto)', nivel: 1, ordem: 9, pagina: 41, trecho: '13 Balanço patrimonial, demonstração do resultado do exercício, demonstração das mutações do patrimônio líquido, Demonstração do fluxo de caixa (método direto e indireto).' },
        { id: 'cont-14', codigo: '14', titulo: 'Demonstração do valor adicionado (DVA) e notas explicativas às demonstrações', nivel: 1, ordem: 10, pagina: 41, trecho: '14 Demonstração do valor adicionado e as notas explicativas às demonstrações contábeis.' },
        { id: 'cont-15', codigo: '15', titulo: 'Avaliação de investimentos pelo método da Equivalência Patrimonial e pelo método do Custo', nivel: 1, ordem: 11, pagina: 42, trecho: '15 Avaliação de investimentos pelo método da Equivalência Patrimonial e pelo método do Custo.' },
        { id: 'cont-16', codigo: '16', titulo: 'Critérios de avaliação de estoques – métodos PEPS, UEPS e Média Ponderada Móvel', nivel: 1, ordem: 12, pagina: 42, trecho: '16 Critérios de avaliação de estoques – métodos PEPS, UEPS e Média Ponderada Móvel.' },
        { id: 'cont-17', codigo: '17', titulo: 'Depreciações do Ativo Imobilizado e Amortizações do Ativo Diferido', nivel: 1, ordem: 13, pagina: 42, trecho: '17 Depreciações do Ativo Imobilizado. 18 Amortizações do Ativo Diferido.' },
        { id: 'cont-19', codigo: '19', titulo: 'Provisão para crédito de liquidação duvidosa e Desconto de duplicata', nivel: 1, ordem: 14, pagina: 42, trecho: '19 Provisão para crédito de liquidação duvidosa. 20 Desconto de duplicata.' },
      ]
    },
    {
      id: 'disc-gestao-pessoas',
      grupo: 'Conhecimentos Específicos',
      nome: 'Fundamentos de Gestão de Pessoas',
      ordem: 8,
      peso: 1.0,
      itensEst: 20,
      assuntos: [
        { id: 'gpess-1', codigo: '1', titulo: 'Modelos de administração pública: patrimonialista, burocrático, nova gestão e papéis do Estado', nivel: 1, ordem: 1, pagina: 42, trecho: '1 Principais modelos de administração pública: patrimonialista, burocrático, nova gestão pública e papéis do Estado.' },
        { id: 'gpess-2', codigo: '2', titulo: 'O papel da área de recursos humanos', nivel: 1, ordem: 2, pagina: 42, trecho: '2 O papel da área de recursos humanos.' },
        { id: 'gpess-3', codigo: '3', titulo: 'Recrutamento e seleção: formas de recrutamento, perfis e técnicas seletivas', nivel: 1, ordem: 3, pagina: 42, trecho: '3 Recrutamento e seleção – formas de recrutamento, perfil do candidato, perfil do posto, técnicas seletivas.' },
        { id: 'gpess-4', codigo: '4', titulo: 'Benefícios, higiene, segurança e qualidade de vida; Planos de carreira', nivel: 1, ordem: 4, pagina: 42, trecho: '4 Benefícios, higiene, segurança e qualidade de vida. 5 Planos de carreira.' },
        { id: 'gpess-6', codigo: '6', titulo: 'Gestão de desempenho: avaliação, feedback, reconhecimento e fatores de equipes', nivel: 1, ordem: 5, pagina: 42, trecho: '6 Gestão de desempenho: avaliação de desempenho, feedback, reconhecimento, elementos que favorecem desempenho de equipes.' },
        { id: 'gpess-7', codigo: '7', titulo: 'Gestão por competências: mapeamento e avaliação; Gestão com foco em resultados', nivel: 1, ordem: 6, pagina: 42, trecho: '7 Gestão por competências: mapeamento e avaliação. 8 Gestão de pessoas com foco em resultados.' },
        { id: 'gpess-9', codigo: '9', titulo: 'Educação corporativa e Treinamento, Desenvolvimento e Educação (TD&E)', nivel: 1, ordem: 7, pagina: 42, trecho: '9 Educação corporativa. 10 Treinamento, Desenvolvimento e Educação: conceitos e importância, operacionalização e rotinas.' },
        { id: 'gpess-11', codigo: '11', titulo: 'Benefícios e serviços; Bancos de dados e sistemas de informações de RH', nivel: 1, ordem: 8, pagina: 42, trecho: '11 Benefícios e serviços. 12 Bancos de dados e sistemas de informações de recursos humanos.' },
        { id: 'gpess-13', codigo: '13', titulo: 'Comportamento organizacional: clima, cultura, comunicação, liderança e equipes', nivel: 1, ordem: 9, pagina: 42, trecho: '13 Comportamento organizacional: clima e cultura organizacional, comunicação organizacional, liderança, equipes de trabalho.' },
      ]
    },
    {
      id: 'disc-recursos-materiais',
      grupo: 'Conhecimentos Específicos',
      nome: 'Fundamentos de Gestão de Recursos Materiais',
      ordem: 9,
      peso: 1.0,
      itensEst: 20,
      assuntos: [
        { id: 'gmat-1', codigo: '1', titulo: 'Recursos materiais e patrimoniais: definição, objetivos, nível de serviço e ética', nivel: 1, ordem: 1, pagina: 42, trecho: '1 Recursos materiais e patrimoniais: definição e objetivos. 2 Nível de serviço: atendimento, pontualidade e flexibilidade. 3 Ética na administração de materiais.' },
        { id: 'gmat-4', codigo: '4', titulo: 'Função suprimento: previsão de demanda, reposição, estoque de segurança, compras e licitações', nivel: 1, ordem: 2, pagina: 42, trecho: '4 Função suprimento: métodos de previsão da demanda; reposição de estoques: estoque de segurança e sistema ponto de pedido; compras e contratações: princípios, modalidades e tipos de licitação; seleção de fornecedores e propostas; sistemas registro de preços, pregão e pregão eletrônico; e economicidade na função suprimento.' },
        { id: 'gmat-5', codigo: '5', titulo: 'Função armazenagem: classificação ABC, técnicas de estocagem, inventário e acurácia', nivel: 1, ordem: 3, pagina: 42, trecho: '5 Função armazenagem: seleção e classificação de materiais: especificação, classificação e codificação; classificação ABC; armazenagem de materiais: técnicas de estocagem e movimentação de materiais; recebimento e localização dos materiais; embalagens de proteção; inventário físico e acurácia dos estoques; avaliação financeira dos estoques; e custos na função armazenagem.' },
        { id: 'gmat-6', codigo: '6', titulo: 'Função administração patrimonial: ativo imobilizado, tombamento, manutenção predial', nivel: 1, ordem: 4, pagina: 42, trecho: '6 Função administração patrimonial: o ativo imobilizado; administração, contabilização e controle do ativo imobilizado; depreciação, tombamento e baixa patrimonial; administração e manutenção de imóveis e prestação de serviços gerais; e sistemas prediais: manutenções preventiva, corretiva e preditiva.' },
        { id: 'gmat-7', codigo: '7', titulo: 'Função documentação: protocolo, distribuição, arquivamento e tabela de temporalidade', nivel: 1, ordem: 5, pagina: 42, trecho: '7 Função documentação: serviços de protocolo, distribuição, classificação e arquivamento de documentos; sigilo e proteção da documentação; e tabela de temporalidade.' },
      ]
    }
  ];

  // Inserir cada disciplina e seus respectivos assuntos
  for (const disc of disciplinasData) {
    insertDisciplina.run(disc.id, concursoId, disc.grupo, disc.nome, disc.ordem, disc.peso, disc.itensEst, now);

    for (const a of disc.assuntos) {
      insertAssunto.run(
        a.id,
        disc.id,
        a.parent_id || null,
        a.codigo,
        a.titulo,
        a.nivel,
        a.ordem,
        a.trecho,
        a.pagina,
        now
      );
    }
  }

  // 4. Configuração Inicial da Rotina de Estudos
  const insertRotina = db.prepare(`
    INSERT INTO rotina_config (
      id, concurso_id, dias_semana_disponiveis, minutos_por_dia,
      duracao_bloco_minutos, pausa_minutos, dias_indisponiveis,
      proporcao_estudo_novo, proporcao_revisoes, proporcao_questoes,
      min_questoes_amostra_manutencao,
      faixa_baixo_acerto_dias, faixa_medio_acerto_dias, faixa_alto_acerto_dias, faixa_excelente_acerto_dias
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRotina.run(
    'config_padrao',
    concursoId,
    JSON.stringify([1, 2, 3, 4, 5, 6]), // Segunda a Sábado
    JSON.stringify({
      "0": 0,    // Domingo folga
      "1": 240,  // Seg 4h
      "2": 240,  // Ter 4h
      "3": 240,  // Qua 4h
      "4": 240,  // Qui 4h
      "5": 240,  // Sex 4h
      "6": 300   // Sáb 5h
    }),
    50, // 50 minutos de bloco
    10, // 10 minutos de pausa
    JSON.stringify([]),
    0.50, // 50% novo estudo
    0.30, // 30% revisões
    0.20, // 20% treino de questões
    5,    // min 5 questões para decidir manutenção
    7,    // < 70% acertos -> 7 dias
    15,   // 70% a 84% -> 15 dias
    30,   // >= 85% -> 30 dias
    45    // consistente -> 45 dias
  );

  console.log(`Seed concluído com sucesso: concurso BACEN Técnico cadastrado com ${disciplinasData.length} disciplinas e todos os tópicos e subtópicos fiéis ao edital.`);
}

// Se executado diretamente via terminal
if (process.argv[1]?.endsWith('bacenTecnicoSeed.ts') || process.argv[1]?.endsWith('bacenTecnicoSeed.js')) {
  seedBacenTecnico();
}
