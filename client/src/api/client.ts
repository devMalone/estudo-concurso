const API_BASE = '/api';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Erro na requisição (${res.status})`);
  }
  return json;
}

export const api = {
  // Dashboard & Concurso
  getDashboard: (hoje?: string) => apiFetch<{ success: boolean; data: any }>(`/dashboard${hoje ? `?hoje=${hoje}` : ''}`),
  getConcurso: () => apiFetch<{ success: boolean; concurso: any; etapas: any[] }>('/concurso'),
  updateDataProva: (dataProva: string, estimada: boolean) =>
    apiFetch<{ success: boolean }>('/concurso/data-prova', {
      method: 'PUT',
      body: JSON.stringify({ dataProva, estimada })
    }),

  // Árvore do Edital & Assuntos
  getArvore: () => apiFetch<{ success: boolean; data: any[] }>('/arvore'),
  getAssuntoDetalhes: (id: string) => apiFetch<{ success: boolean; data: any }>(`/assuntos/${id}`),
  registrarEstudo: (id: string, data: { concluido: boolean; dataEstudo?: string; tempoMinutos?: number; anotacoes?: string; materiais?: string }, hoje?: string) =>
    apiFetch<{ success: boolean; estudo: any; revisoesGeradas: number }>(`/assuntos/${id}/estudo${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  registrarSessaoEstudo: (id: string, data: { data?: string; tempoMinutos: number; questoesRealizadas?: number; questoesAcertos?: number; anotacoes?: string; concluirTopico?: boolean }, hoje?: string) =>
    apiFetch<{ success: boolean; sessaoEstudo: any; revisoesGeradas: number; estudo: any }>(`/assuntos/${id}/sessao-estudo${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  excluirSessaoEstudo: (sessaoId: string) =>
    apiFetch<{ success: boolean }>(`/assuntos/sessoes-estudo/${sessaoId}`, {
      method: 'DELETE'
    }),

  // Sessões de Questões
  getQuestoes: (params?: { disciplinaId?: string; assuntoId?: string; tipo?: string; limite?: number }) => {
    const query = new URLSearchParams();
    if (params?.disciplinaId) query.set('disciplinaId', params.disciplinaId);
    if (params?.assuntoId) query.set('assuntoId', params.assuntoId);
    if (params?.tipo) query.set('tipo', params.tipo);
    if (params?.limite) query.set('limite', String(params.limite));
    return apiFetch<{ success: boolean; data: any[] }>(`/questoes?${query.toString()}`);
  },
  criarSessaoQuestoes: (data: any, hoje?: string) =>
    apiFetch<{ success: boolean; data: any }>(`/questoes${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  atualizarSessaoQuestoes: (id: string, data: any) =>
    apiFetch<{ success: boolean; data: any }>(`/questoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  excluirSessaoQuestoes: (id: string) =>
    apiFetch<{ success: boolean }>(`/questoes/${id}`, { method: 'DELETE' }),
  getEstatisticasQuestoes: () =>
    apiFetch<{ success: boolean; data: any }>('/questoes/estatisticas'),

  // Revisões & Manutenção
  getRevisoes: (status?: string, hoje?: string) => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (hoje) q.set('hoje', hoje);
    return apiFetch<{ success: boolean; data: any[] }>(`/revisoes?${q.toString()}`);
  },
  concluirRevisao: (id: string, data: { dataReal?: string; totalQuestoes?: number; acertos?: number; origem?: string; observacoes?: string }, hoje?: string) =>
    apiFetch<{ success: boolean; revisaoConcluida: any; proximaRevisao?: any }>(`/revisoes/${id}/concluir${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  desfazerRevisao: (id: string, hoje?: string) =>
    apiFetch<{ success: boolean; data: any }>(`/revisoes/${id}/desfazer${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST'
    }),
  criarRecuperacao: (data: { assuntoId: string; revisoesAtrasadasIds: string[]; dataAgendada?: string }, hoje?: string) =>
    apiFetch<{ success: boolean; data: any }>(`/revisoes/recuperacao${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Agenda & Rotina
  getAgenda: (dataInicio?: string, dataFim?: string, hoje?: string) => {
    const q = new URLSearchParams();
    if (dataInicio) q.set('dataInicio', dataInicio);
    if (dataFim) q.set('dataFim', dataFim);
    if (hoje) q.set('hoje', hoje);
    return apiFetch<{ success: boolean; data: any[]; dataInicio: string; dataFim: string }>(`/agenda?${q.toString()}`);
  },
  gerarAgenda: (data: { dataInicio?: string; diasParaPlanejar?: number }, hoje?: string) =>
    apiFetch<{ success: boolean; totalBlocosGerados: number; sobrecargas: any[] }>(`/agenda/gerar${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  concluirBloco: (id: string, questaoData?: any, hoje?: string) =>
    apiFetch<{ success: boolean; bloco: any; status: string }>(`/agenda/blocos/${id}/concluir${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(questaoData || {})
    }),
  toggleFixadoBloco: (id: string) =>
    apiFetch<{ success: boolean; data: any }>(`/agenda/blocos/${id}/toggle-fixado`, { method: 'POST' }),
  getRotinaConfig: () => apiFetch<{ success: boolean; data: any }>('/agenda/config'),
  salvarRotinaConfig: (data: any) =>
    apiFetch<{ success: boolean }>('/agenda/config', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Simulados
  getSimulados: () => apiFetch<{ success: boolean; data: any[] }>('/simulados'),
  registrarSimulado: (data: any, hoje?: string) =>
    apiFetch<{ success: boolean; simulado: any; resultado: any }>(`/simulados${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Backup & Supabase
  exportarBackup: async () => {
    const res = await fetch(`${API_BASE}/backup/exportar`);
    if (!res.ok) throw new Error('Falha ao exportar backup');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-concurso-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
  restaurarBackup: (payload: any) =>
    apiFetch<{ success: boolean; totalRegistros: number; hashVerificado: boolean }>('/backup/restaurar', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getSupabaseScript: () => apiFetch<{ success: boolean; script: string }>('/supabase/script'),
  salvarSupabaseConfig: (data: { url: string; anonKey: string }) =>
    apiFetch<{ success: boolean }>('/supabase/config', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getSupabaseConfig: () => apiFetch<{ success: boolean; data: any }>('/supabase/config')
};
