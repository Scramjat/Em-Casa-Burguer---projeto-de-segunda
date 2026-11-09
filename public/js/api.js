// Camada de acesso à API REST do servidor.
const api = (() => {
  async function request(method, url, body) {
    const res = await fetch('/api' + url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
  }

  const qs = (params = {}) => {
    const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
    return p.toString() ? `?${p}` : '';
  };

  return {
    resumo: () => request('GET', '/resumo'),

    categorias: () => request('GET', '/categorias'),
    criarCategoria: (d) => request('POST', '/categorias', d),
    atualizarCategoria: (id, d) => request('PUT', `/categorias/${encodeURIComponent(id)}`, d),
    excluirCategoria: (id) => request('DELETE', `/categorias/${encodeURIComponent(id)}`),
    itens: (filtros) => request('GET', '/itens' + qs(filtros)),
    item: (id) => request('GET', `/itens/${id}`),
    criarItem: (d) => request('POST', '/itens', d),
    atualizarItem: (id, d) => request('PUT', `/itens/${id}`, d),
    excluirItem: (id) => request('DELETE', `/itens/${id}`),
    venderItem: (id, quantidade) => request('POST', `/itens/${id}/vender`, { quantidade }),

    ingredientes: (filtros) => request('GET', '/ingredientes' + qs(filtros)),
    criarIngrediente: (d) => request('POST', '/ingredientes', d),
    atualizarIngrediente: (id, d) => request('PUT', `/ingredientes/${id}`, d),
    excluirIngrediente: (id) => request('DELETE', `/ingredientes/${id}`),

    tiposMovimento: () => request('GET', '/tipos-movimento'),
    movimentos: (filtros) => request('GET', '/movimentos' + qs(filtros)),
    registrarMovimento: (d) => request('POST', '/movimentos', d),
  };
})();
