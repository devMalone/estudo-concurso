import { browserEngine } from './browserEngine';

const API_BASE = '/api';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal,
      ...options
    });
    clearTimeout(timeoutId);

    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || `Erro na requisição (${res.status})`);
    }
    return json;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const api = {
  // Dashboard & Concurso
  getDashboard: async (hoje?: string) => {
    try {
      return await apiFetch<{ success: boolean; data: any }>(`/dashboard${hoje ? `?hoje=${hoje}` : ''}`);
    } catch {
      return browserEngine.getDashboard(hoje);
    }
  },
  getConcurso: async () => {
    try {
      return await apiFetch<{ success: boolean; concurso: any; etapas: any[] }>('/concurso');
    } catch {
      return browserEngine.getConcurso();
    }
  },
  updateDataProva: async (dataProva: string, estimada: boolean) => {
    try {
      return await apiFetch<{ success: boolean }>('/concurso/data-prova', {
        method: 'PUT',
        body: JSON.stringify({ dataProva, estimada })
      });
    } catch {
      return browserEngine.updateDataProva(dataProva, estimada);
    }
  },

  // Árvore do Edital & Assuntos
  getArvore: async () => {
    try {
      return await apiFetch<{ success: boolean; data: any[] }>('/arvore');
    } catch {
      return browserEngine.getArvore();
    }
  },
  getAssuntoDetalhes: async (id: string) => {
    try {
      return await apiFetch<{ success: boolean; data: any }>(`/assuntos/${id}`);
    } catch {
      return browserEngine.getAssuntoDetalhes(id);
    }
  },
  registrarEstudo: async (id: string, data: { concluido: boolean; dataEstudo?: string; tempoMinutos?: number; anotacoes?: string; materiais?: string }, hoje?: string) => {
    try {
      return await apiFetch<{ success: boolean; estudo: any; revisoesGeradas: number }>(`/assuntos/${id}/estudo${hoje ? `?hoje=${hoje}` : ''}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return browserEngine.registrarEstudo(id, data, hoje);
    }
  },
  registrarSessaoEstudo: async (id: string, data: { data?: string; tempoMinutos: number; questoesRealizadas?: number; questoesAcertos?: number; anotacoes?: string; concluirTopico?: boolean }, hoje?: string) => {
    try {
      return await apiFetch<{ success: boolean; sessaoEstudo: any; revisoesGeradas: number; estudo: any }>(`/assuntos/${id}/sessao-estudo${hoje ? `?hoje=${hoje}` : ''}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return browserEngine.registrarSessaoEstudo(id, data, hoje);
    }
  },
  excluirSessaoEstudo: async (sessaoId: string) => {
    try {
      return await apiFetch<{ success: boolean }>(`/assuntos/sessoes-estudo/${sessaoId}`, {
        method: 'DELETE'
      });
    } catch {
      return browserEngine.excluirSessaoEstudo(sessaoId);
    }
  },

  // Sessões de Questões
  getQuestoes: async (params?: { disciplinaId?: string; assuntoId?: string; tipo?: string; limite?: number }) => {
    try {
      const query = new URLSearchParams();
      if (params?.disciplinaId) query.set('disciplinaId', params.disciplinaId);
      if (params?.assuntoId) query.set('assuntoId', params.assuntoId);
      if (params?.tipo) query.set('tipo', params.tipo);
      if (params?.limite) query.set('limite', String(params.limite));
      return await apiFetch<{ success: boolean; data: any[] }>(`/questoes?${query.toString()}`);
    } catch {
      return browserEngine.getQuestoes(params);
    }
  },
  criarSessaoQuestoes: async (data: any, hoje?: string) => {
    try {
      return await apiFetch<{ success: boolean; data: any }>(`/questoes${hoje ? `?hoje=${hoje}` : ''}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return browserEngine.criarSessaoQuestoes(data, hoje);
    }
  },
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
  getRevisoes: async (status?: string, hoje?: string) => {
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (hoje) q.set('hoje', hoje);
      return await apiFetch<{ success: boolean; data: any[] }>(`/revisoes?${q.toString()}`);
    } catch {
      return browserEngine.getRevisoes(hoje);
    }
  },
  concluirRevisao: async (id: string, data: { dataReal?: string; totalQuestoes?: number; acertos?: number; origem?: string; observacoes?: string }, hoje?: string) => {
    try {
      return await apiFetch<{ success: boolean; revisaoConcluida: any; proximaRevisao?: any }>(`/revisoes/${id}/concluir${hoje ? `?hoje=${hoje}` : ''}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return browserEngine.concluirRevisao(id, data, hoje);
    }
  },
  desfazerRevisao: (id: string, hoje?: string) =>
    apiFetch<{ success: boolean; data: any }>(`/revisoes/${id}/desfazer${hoje ? `?hoje=${hoje}` : ''}`, {
      method: 'POST'
    }),
  criarRecuperacao: async (data: { assuntoId: string; revisoesAtrasadasIds: string[]; dataAgendada?: string }, hoje?: string) => {
    try {
      return await apiFetch<{ success: boolean; data: any }>(`/revisoes/recuperacao${hoje ? `?hoje=${hoje}` : ''}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return browserEngine.unificarRevisoes(data.assuntoId, hoje || data.dataAgendada || '');
    }
  },

  // Agenda & Rotina
  getAgenda: async (dataInicio?: string, dataFim?: string, hoje?: string) => {
    try {
      const q = new URLSearchParams();
      if (dataInicio) q.set('dataInicio', dataInicio);
      if (dataFim) q.set('dataFim', dataFim);
      if (hoje) q.set('hoje', hoje);
      return await apiFetch<{ success: boolean; data: any[]; dataInicio: string; dataFim: string }>(`/agenda?${q.toString()}`);
    } catch {
      return browserEngine.getAgenda(hoje);
    }
  },
  gerarAgenda: async (data: { dataInicio?: string; diasParaPlanejar?: number }, hoje?: string) => {
    try {
      return await apiFetch<{ success: boolean; totalBlocosGerados: number; sobrecargas: any[] }>(`/agenda/gerar${hoje ? `?hoje=${hoje}` : ''}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return browserEngine.gerarAgenda(hoje || data.dataInicio || '');
    }
  },
  concluirBloco: async (id: string, questaoData?: any, hoje?: string) => {
    try {
      return await apiFetch<{ success: boolean; bloco: any; status: string }>(`/agenda/blocos/${id}/concluir${hoje ? `?hoje=${hoje}` : ''}`, {
        method: 'POST',
        body: JSON.stringify(questaoData || {})
      });
    } catch {
      return browserEngine.concluirBloco(id, questaoData, hoje);
    }
  },
  toggleFixadoBloco: (id: string) =>
    apiFetch<{ success: boolean; data: any }>(`/agenda/blocos/${id}/toggle-fixado`, { method: 'POST' }),
  getRotinaConfig: async () => {
    try {
      return await apiFetch<{ success: boolean; data: any }>('/agenda/config');
    } catch {
      return browserEngine.getConfiguracoes();
    }
  },
  salvarRotinaConfig: async (data: any) => {
    try {
      return await apiFetch<{ success: boolean }>('/agenda/config', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return browserEngine.salvarConfiguracoes(data);
    }
  },

  // Simulados
  getSimulados: async () => {
    try {
      return await apiFetch<{ success: boolean; data: any[] }>('/simulados');
    } catch {
      return browserEngine.getSimulados();
    }
  },
  registrarSimulado: async (data: any, hoje?: string) => {
    try {
      return await apiFetch<{ success: boolean; simulado: any; resultado: any }>(`/simulados${hoje ? `?hoje=${hoje}` : ''}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return browserEngine.salvarSimulado(data);
    }
  },

  // Backup & Supabase
  exportarBackup: async () => {
    try {
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
    } catch {
      const data = {
        timestamp: new Date().toISOString(),
        estudos: localStorage.getItem('estudos_lista'),
        sessoes: localStorage.getItem('sessoes_estudo_lista'),
        questoes: localStorage.getItem('questoes_sessoes_lista'),
        revisoes: localStorage.getItem('revisoes_lista'),
        agenda: localStorage.getItem('agenda_blocos_lista'),
        simulados: localStorage.getItem('simulados_lista'),
        concurso: localStorage.getItem('concurso_dados')
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-concurso-navegador-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
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
