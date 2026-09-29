export interface Concurso {
  id: string;
  nome: string;
  orgao: string;
  banca: string;
  edital_numero: string;
  cargo: string;
  area: string;
  escolaridade: string;
  remuneracao_inicial: number;
  jornada_horas: number;
  data_prova: string | null;
  data_prova_estimada: number;
}

export interface AssuntoNode {
  id: string;
  disciplina_id: string;
  parent_id: string | null;
  codigo_edital: string;
  titulo: string;
  nivel: number;
  ordem: number;
  trecho_original_edital: string | null;
  pagina_edital: number | null;
  is_sugestao_estudo: number;
  is_leaf: boolean;
  estudo_concluido: boolean;
  data_estudo: string | null;
  tempo_minutos: number;
  anotacoes: string | null;
  materiais: string | null;
  revisao_pendente: boolean;
  total_questoes: number;
  total_acertos: number;
  taxa_acerto: number | null;
  total_sessoes?: number;
  em_estudo?: boolean;
  children: AssuntoNode[];
}

export interface SessaoEstudo {
  id: string;
  assunto_id: string;
  disciplina_id: string;
  data: string;
  tempo_minutos: number;
  questoes_realizadas: number;
  questoes_acertos: number;
  questoes_erros: number;
  anotacoes: string | null;
  concluiu_topico: number;
  criado_em: string;
}

export interface EstudoSemanaDia {
  data: string;
  diaNome: string;
  diaSemana: number;
  minutos: number;
  horasFormatadas: string;
  sessoes: number;
  isHoje: boolean;
}

export interface EstudoSemana {
  inicioSemana: string;
  fimSemana: string;
  totalMinutos: number;
  horasFormatadas: string;
  horasDecimais: number;
  totalSessoes: number;
  totalQuestoes: number;
  metaSemanalMinutos: number;
  metaSemanalHoras: number;
  percentualMeta: number | null;
  dias: EstudoSemanaDia[];
}


export interface DisciplinaTree {
  id: string;
  grupo: string;
  nome: string;
  ordem: number;
  peso: number;
  quantidade_itens_estimada: number;
  total_topicos_folha: number;
  topicos_estudados: number;
  percentual_cobertura: number;
  total_questoes: number;
  total_acertos: number;
  taxa_acerto_disciplina: number | null;
  revisoes_atrasadas: number;
  assuntos: AssuntoNode[];
}

export interface Revisao {
  id: string;
  assunto_id: string;
  assunto_titulo?: string;
  codigo_edital?: string;
  disciplina_nome?: string;
  ciclo: '7d' | '15d' | '30d' | 'manutencao' | 'recuperacao';
  numero_ciclo_manutencao: number;
  data_prevista: string;
  data_real: string | null;
  status: 'agendada' | 'disponivel' | 'atrasada' | 'concluida' | 'recuperada';
  intervalo_dias: number;
  sessao_questao_id: string | null;
  observacoes: string | null;
  revisoes_substituidas_ids: string | null;
  heuristica_intervalo_motivo: string | null;
  diasAtraso?: number;
}

export interface SessaoQuestao {
  id: string;
  disciplina_id: string;
  disciplina_nome?: string;
  assunto_id: string | null;
  assunto_titulo?: string;
  revisao_id: string | null;
  data: string;
  total_questoes: number;
  acertos: number;
  erros: number;
  taxa_acerto: number;
  origem: string | null;
  observacoes: string | null;
  tipo: 'estudo_inicial' | 'revisao' | 'treino_avulso' | 'simulado';
  criado_em: string;
}

export interface BlocoAgenda {
  id: string;
  concurso_id: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  duracao_minutos: number;
  disciplina_id: string;
  disciplina_nome?: string;
  disciplina_grupo?: string;
  assunto_id: string | null;
  assunto_titulo?: string;
  codigo_edital?: string;
  revisao_id: string | null;
  revisao_ciclo?: string;
  revisao_status?: string;
  tipo: 'estudo_inicial' | 'revisao' | 'questoes' | 'simulado';
  status: 'pendente' | 'em_andamento' | 'concluido' | 'reagendado' | 'cancelado';
  fixado: number;
  motivo_prioridade: string | null;
  concluido_em: string | null;
}

export interface Simulado {
  id: string;
  concurso_id: string;
  titulo: string;
  data: string;
  tempo_gasto_minutos: number | null;
  itens_certos_p1: number;
  itens_errados_p1: number;
  itens_branco_p1: number;
  nota_p1_liquida: number;
  itens_certos_p2: number;
  itens_errados_p2: number;
  itens_branco_p2: number;
  nota_p2_liquida: number;
  nota_total_liquida: number;
  aprovado_minimos: number;
  nota_discursiva: number | null;
  discursiva_aprovada: number | null;
  observacoes: string | null;
  criado_em: string;
}

export interface RotinaConfig {
  diasSemanaDisponiveis: number[];
  minutosPorDia: Record<string, number>;
  duracaoBlocoMinutos: number;
  pausaMinutos: number;
  diasIndisponiveis: string[];
  proporcaoEstudoNovo: number;
  proporcaoRevisoes: number;
  proporcaoQuestoes: number;
}
