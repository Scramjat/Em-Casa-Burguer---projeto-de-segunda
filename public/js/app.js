/* global api */
// Interface da aplicação: roteamento por hash, telas e formulários.

// Categorias vêm do banco (tabela categoria_item). As 5 padrão têm cor própria.
const CORES_PADRAO = {
  HAMBURGUER_SMASH: 'cat-smash', HAMBURGUER_TRADICIONAL: 'cat-trad',
  ACOMPANHAMENTO: 'cat-acomp', BEBIDA: 'cat-bebida', SOBREMESA: 'cat-sobremesa',
};
let CATEGORIAS = [];
let CAT = {};

async function carregarCategorias() {
  CATEGORIAS = (await api.categorias()).map((c) => ({
    id: c.id_categoria, nome: c.nome_categoria, grupo: c.grupo_categoria,
    padrao: c.padrao, total: c.total_itens, cls: CORES_PADRAO[c.id_categoria] || 'cat-custom',
  }));
  CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));
  return CATEGORIAS;
}
const nomeCategoria = (id) => (CAT[id]?.grupo ? `${CAT[id].grupo} ${CAT[id].nome}` : CAT[id]?.nome || id);
const chaveGrupo = (c) => (c.grupo ? `g:${c.grupo.toLowerCase()}` : c.id);

/** Agrupa as categorias pelo grupo (ex.: Hambúrguer -> Smash, Tradicional), mantendo a ordem. */
function gruposCardapio() {
  const grupos = [];
  for (const c of CATEGORIAS) {
    let g = grupos.find((x) => x.chave === chaveGrupo(c));
    if (!g) grupos.push(g = { chave: chaveGrupo(c), nome: c.grupo || c.nome, dividido: Boolean(c.grupo), cls: c.cls, categorias: [] });
    g.categorias.push(c);
  }
  return grupos;
}

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONES = {
  mov: svg('<path d="M7 4v16M3 8l4-4 4 4M17 20V4M21 16l-4 4-4-4"/>'),
  hist: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  editar: svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  excluir: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>'),
};

const UNIDADES = ['un', 'kg', 'g', 'L', 'ml', 'pct', 'cx', 'fatia'];
const ENTRADAS = ['ENT', 'AJP'];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');

// ---------- formatação ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const qtd = (n, un) => `${num(n)} ${esc(un || '')}`.trim();
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ---------- tema claro/escuro ----------
const temaEscuroSistema = window.matchMedia('(prefers-color-scheme: dark)');
const temaAtual = () => document.documentElement.dataset.theme || (temaEscuroSistema.matches ? 'dark' : 'light');
$('#theme-toggle').addEventListener('click', () => {
  const novo = temaAtual() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = novo;
  try { localStorage.setItem('tema', novo); } catch (e) { /* armazenamento indisponível */ }
});

// ---------- toasts ----------
function toast(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3600);
}

// ---------- modal genérico ----------
const modal = $('#modal');
let modalSubmit = null;
let modalCancel = null; // o que fazer em Cancelar/✕/Esc (padrão: fechar)

function abrirModal({ titulo, corpo, botao = 'Salvar', perigo = false, onSubmit, onOpen, onCancel }) {
  $('#modal-title').textContent = titulo;
  // Troca o corpo por um elemento novo para descartar listeners do formulário anterior
  const antigo = $('#modal-body');
  const novo = antigo.cloneNode(false);
  antigo.replaceWith(novo);
  novo.innerHTML = corpo;
  $('#modal-error').hidden = true;
  const btn = $('#modal-submit');
  btn.textContent = botao;
  btn.className = `btn ${perigo ? 'btn-danger' : 'btn-primary'}`;
  btn.disabled = false;
  modalSubmit = onSubmit;
  modalCancel = onCancel || null;
  if (!modal.open) modal.showModal();
  onOpen?.($('#modal-body'));
  ($('#modal-body input:not([type=hidden]), #modal-body select, #modal-body textarea') || btn).focus();
}
const fecharModal = () => modal.close();

$('#modal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!modalSubmit) return fecharModal();
  const btn = $('#modal-submit');
  btn.disabled = true;
  try {
    // onSubmit pode devolver 'manter' quando já abriu outra tela no mesmo modal
    const resultado = await modalSubmit(new FormData(e.target), $('#modal-body'));
    if (resultado !== 'manter') fecharModal();
  } catch (err) {
    $('#modal-error').textContent = err.message;
    $('#modal-error').hidden = false;
  } finally {
    btn.disabled = false;
  }
});
/** Cancelar volta para a tela anterior quando houver (ex.: lista de categorias); senão fecha. */
function cancelarModal() {
  if (modalCancel) modalCancel(); else fecharModal();
}
$$('[data-close]', modal).forEach((b) => b.addEventListener('click', cancelarModal));
modal.addEventListener('click', (e) => { if (e.target === modal) cancelarModal(); });
modal.addEventListener('cancel', (e) => { e.preventDefault(); cancelarModal(); }); // tecla Esc

function confirmar(titulo, mensagem, botao, acao, onCancel) {
  abrirModal({ titulo, corpo: `<p class="confirm-text">${mensagem}</p>`, botao, perigo: true, onSubmit: acao, onCancel });
}

// ---------- roteamento ----------
const telas = { painel: telaPainel, cardapio: telaCardapio, estoque: telaEstoque, movimentos: telaMovimentos };

async function rotear() {
  const rota = location.hash.slice(1) || 'painel';
  const tela = telas[rota] || telaPainel;
  $$('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === rota));
  try {
    await tela();
  } catch (err) {
    app.innerHTML = `<div class="empty error-state"><h2>Não foi possível carregar</h2><p>${esc(err.message)}</p>
      <button class="btn btn-primary" onclick="rotear()">Tentar novamente</button></div>`;
  }
}
window.addEventListener('hashchange', rotear);
const recarregar = () => rotear();

// =====================================================================
//  PAINEL
// =====================================================================
async function telaPainel() {
  const [r] = await Promise.all([api.resumo(), carregarCategorias()]);
  const maxTipo = Math.max(1, ...CATEGORIAS.map((c) => c.total));

  app.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">Bem-vindo de volta</p>
        <h1>Painel da casa</h1>
      </div>
      <div class="head-actions">
        <a class="btn btn-ghost" href="#estoque">Ver estoque</a>
        <a class="btn btn-primary" href="#cardapio">Gerenciar cardápio</a>
      </div>
    </section>

    <section class="kpis">
      <article class="kpi"><span>Itens no cardápio</span><strong>${r.cardapio.total_itens}</strong><small>cadastrados no cardápio</small></article>
      <article class="kpi"><span>Ingredientes</span><strong>${r.estoque.total_ingredientes}</strong><small>cadastrados no estoque</small></article>
      <article class="kpi ${r.estoque.abaixo_minimo ? 'kpi-alert' : ''}"><span>Abaixo do mínimo</span><strong>${r.estoque.abaixo_minimo}</strong><small>${r.estoque.abaixo_minimo ? 'precisam de reposição' : 'tudo em ordem'}</small></article>
    </section>

    <section class="grid-2">
      <article class="panel">
        <h2>Cardápio por categoria</h2>
        <ul class="bars">
          ${CATEGORIAS.map((c) => `
            <li>
              <span class="bar-label"><i class="dot ${c.cls}"></i>${esc(nomeCategoria(c.id))}</span>
              <span class="bar-track"><span class="bar-fill ${c.cls}" style="width:${(c.total / maxTipo) * 100}%"></span></span>
              <span class="bar-value">${c.total}</span>
            </li>`).join('')}
        </ul>
      </article>

      <article class="panel">
        <h2>Reposição necessária</h2>
        ${r.alertas.length ? `<ul class="alert-list">
          ${r.alertas.map((a) => `
            <li>
              <div><strong>${esc(a.descricao_ingrediente)}</strong>
              <small>mínimo ${qtd(a.estoque_minimo, a.unidade_medida)}</small></div>
              <span class="badge badge-low">${qtd(a.quantidade_em_estoque, a.unidade_medida)}</span>
            </li>`).join('')}
        </ul>` : '<p class="muted">Nenhum ingrediente abaixo do estoque mínimo.</p>'}
      </article>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Últimas movimentações</h2><a href="#movimentos" class="link">Ver todas →</a></div>
      ${tabelaMovimentos(r.ultimos)}
    </section>`;
}

// =====================================================================
//  CARDÁPIO
// =====================================================================
const filtroCardapio = { tipo: '', busca: '' };

async function telaCardapio() {
  await carregarCategorias();
  const grupos = gruposCardapio();
  if (filtroCardapio.tipo && !grupos.some((g) => g.chave === filtroCardapio.tipo) && !CAT[filtroCardapio.tipo]) {
    filtroCardapio.tipo = '';
  }
  const chip = (tipo, nome, extra = '') => `<button class="chip ${extra}" data-tipo="${esc(tipo)}">${esc(nome)}</button>`;

  app.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">Itens à venda</p><h1>Cardápio</h1>
        <p class="page-sub">Hambúrgueres (Smash e Tradicional), acompanhamentos, bebidas, sobremesas e as categorias que você criar.</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-ghost" id="gerenciar-cat">Categorias</button>
        <button class="btn btn-primary" id="novo-item">+ Novo item</button>
      </div>
    </section>
    <section class="toolbar">
      <input type="search" id="busca-item" class="input search" placeholder="Buscar por nome ou descrição…" value="${esc(filtroCardapio.busca)}">
      <div class="chips" role="tablist" aria-label="Filtrar por categoria">
        ${chip('', 'Todos')}
        ${grupos.map((g) => (g.dividido
          ? `<span class="chip-group">${chip(g.chave, g.nome)}${g.categorias.map((c) => chip(c.id, c.nome, 'chip-sub')).join('')}</span>`
          : chip(g.chave, g.nome))).join('')}
      </div>
    </section>
    <div id="lista-itens"></div>`;

  $('#novo-item').onclick = () => formItem(null, filtroCardapio.tipo);
  $('#gerenciar-cat').onclick = () => gerenciarCategorias();
  $('#busca-item').oninput = debounce((e) => { filtroCardapio.busca = e.target.value; carregarItens(); });
  $$('.chip').forEach((c) => {
    c.onclick = () => { filtroCardapio.tipo = c.dataset.tipo; carregarItens(); };
  });
  await carregarItens();
}

async function carregarItens() {
  const { tipo, busca } = filtroCardapio;
  $$('.chip').forEach((c) => {
    const ativo = c.dataset.tipo === tipo;
    c.classList.toggle('active', ativo);
    c.setAttribute('aria-selected', ativo);
  });
  const todos = await api.itens({ busca });
  const lista = $('#lista-itens');
  if (!lista) return;

  const visivel = (c) => !tipo || c.id === tipo || chaveGrupo(c) === tipo;
  const itens = todos.filter((i) => CAT[i.tipo_item] && visivel(CAT[i.tipo_item]));
  const buscando = Boolean(busca.trim());

  if (buscando && !itens.length) {
    lista.innerHTML = '<div class="empty"><h2>Nenhum item encontrado</h2><p>Tente outro termo de busca.</p></div>';
    return;
  }

  const acoesCategoria = (c) => `
    <span class="cat-actions" data-cat="${esc(c.id)}">
      <button type="button" class="icon-btn" data-cat-acao="editar" title="Editar categoria" aria-label="Editar categoria ${esc(c.nome)}">${ICONES.editar}</button>
      <button type="button" class="icon-btn danger" data-cat-acao="excluir" title="Excluir categoria" aria-label="Excluir categoria ${esc(c.nome)}">${ICONES.excluir}</button>
    </span>`;

  const blocoCategoria = (c, subtitulo) => {
    const grupo = itens.filter((i) => i.tipo_item === c.id);
    if (buscando && !grupo.length) return '';
    const rotulo = c.grupo ? c.nome : nomeCategoria(c.id);
    return `
      ${subtitulo ? `<h3 class="sub-title">${esc(c.nome)} <span>${grupo.length}</span>${acoesCategoria(c)}</h3>` : ''}
      <div class="cards">
        ${grupo.map(cardItem).join('')}
        ${buscando ? '' : `<button type="button" class="card card-add" data-novo="${esc(c.id)}">
          <span class="plus" aria-hidden="true">+</span>Adicionar ${esc(rotulo.toLowerCase())}</button>`}
      </div>`;
  };

  lista.innerHTML = gruposCardapio().map((g) => {
    const cats = g.categorias.filter(visivel);
    if (!cats.length) return '';
    const total = itens.filter((i) => cats.some((c) => c.id === i.tipo_item)).length;
    if (buscando && !total) return '';
    return `
      <section class="cat-section">
        <h2 class="cat-title"><i class="dot ${g.cls}"></i>${esc(g.nome)} <span>${total}</span>${g.dividido || buscando ? '' : acoesCategoria(cats[0])}</h2>
        ${cats.map((c) => `<div class="cat-block">${blocoCategoria(c, g.dividido)}</div>`).join('')}
      </section>`;
  }).join('') + (tipo || buscando ? '' : `
    <button type="button" class="nova-categoria" id="nova-cat">
      <span class="plus" aria-hidden="true">+</span>
      <span><strong>Nova categoria</strong><small>Ex.: Porções, Combos ou um novo tipo de hambúrguer</small></span>
    </button>`);

  $('#nova-cat')?.addEventListener('click', () => formCategoria());
  $$('[data-cat-acao]', lista).forEach((b) => {
    const c = CAT[b.closest('[data-cat]').dataset.cat];
    b.onclick = () => (b.dataset.catAcao === 'editar' ? formCategoria(c) : excluirCategoria(c));
  });
  $$('[data-novo]', lista).forEach((b) => { b.onclick = () => formItem(null, b.dataset.novo); });
  $$('[data-acao]', lista).forEach((b) => {
    const id = Number(b.closest('[data-id]').dataset.id);
    const item = itens.find((i) => i.id_item === id);
    b.onclick = () => ({ editar: () => formItem(id), vender: () => formVenda(item), excluir: () => excluirItem(item) })[b.dataset.acao]();
  });
}

/** Recarrega a tela do cardápio (chips e listas) se ela estiver aberta. */
function atualizarCardapio() {
  if ((location.hash.slice(1) || 'painel') === 'cardapio') telaCardapio();
}

// ---------- categorias ----------
async function gerenciarCategorias() {
  await carregarCategorias();
  const linha = (c, sub) => `
    <li class="cat-list-item ${sub ? 'sub' : ''}" data-cat="${esc(c.id)}">
      <i class="dot ${c.cls}"></i>
      <span class="cat-name">${esc(c.nome)}${c.padrao ? ' <small class="tag">padrão</small>' : ''}</span>
      <span class="muted cat-count">${c.total} ${c.total === 1 ? 'item' : 'itens'}</span>
      <button type="button" class="icon-btn" data-cat-acao="editar" title="Editar" aria-label="Editar ${esc(c.nome)}">${ICONES.editar}</button>
      <button type="button" class="icon-btn danger" data-cat-acao="excluir" title="Excluir" aria-label="Excluir ${esc(c.nome)}">${ICONES.excluir}</button>
    </li>`;
  abrirModal({
    titulo: 'Categorias do cardápio',
    botao: 'Concluir',
    corpo: `
      <div class="cat-manage-head">
        <p class="hint">As categorias <b>padrão</b> vêm do enunciado. Só é possível excluir categorias sem itens.</p>
        <button type="button" class="btn btn-primary btn-sm" id="cat-nova">+ Nova categoria</button>
      </div>
      <ul class="cat-list">
        ${gruposCardapio().map((g) => (g.dividido
          ? `<li class="cat-list-group">${esc(g.nome)}</li>${g.categorias.map((c) => linha(c, true)).join('')}`
          : linha(g.categorias[0], false))).join('')}
      </ul>`,
    onOpen: (body) => {
      $('#cat-nova', body).onclick = () => formCategoria(null, true);
      $$('[data-cat-acao]', body).forEach((b) => {
        const c = CAT[b.closest('[data-cat]').dataset.cat];
        b.onclick = () => (b.dataset.catAcao === 'editar' ? formCategoria(c, true) : excluirCategoria(c, true));
      });
    },
    onSubmit: null,
  });
}

function formCategoria(c, voltarParaLista = false) {
  const grupos = [...new Set(CATEGORIAS.map((x) => x.grupo).filter(Boolean))];
  abrirModal({
    titulo: c ? 'Editar categoria' : 'Nova categoria',
    botao: c ? 'Salvar' : 'Criar categoria',
    corpo: `
      <div class="form-grid">
        <label class="field span-2">Nome da categoria
          <input name="nome_categoria" class="input" maxlength="30" required value="${esc(c?.nome)}" placeholder="Ex.: Porções, Combos, Vegano">
        </label>
        <label class="field span-2">Grupo <span class="hint">(opcional)</span>
          <input name="grupo_categoria" class="input" maxlength="30" list="grupos-cat" value="${esc(c?.grupo)}"
            placeholder="Vazio = categoria principal" ${c?.padrao ? 'readonly' : ''}>
          <datalist id="grupos-cat">${grupos.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
          <small class="hint">${c?.padrao
            ? 'O grupo das categorias padrão não pode ser alterado.'
            : 'Escreva “Hambúrguer” para criar um novo tipo de hambúrguer, ao lado de Smash e Tradicional.'}</small>
        </label>
      </div>`,
    onSubmit: async (fd) => {
      const dados = Object.fromEntries(fd);
      if (c) await api.atualizarCategoria(c.id, dados); else await api.criarCategoria(dados);
      toast(c ? 'Categoria atualizada.' : `Categoria “${dados.nome_categoria.trim()}” criada.`);
      atualizarCardapio();
      if (voltarParaLista) { await gerenciarCategorias(); return 'manter'; }
      return undefined;
    },
    onCancel: voltarParaLista ? () => gerenciarCategorias() : null,
  });
}

function excluirCategoria(c, voltarParaLista = false) {
  const aviso = c.padrao
    ? '<br><br><span class="aviso">Atenção: esta é uma categoria padrão exigida pelo enunciado do projeto. Dá para criá-la de novo depois em “Nova categoria”.</span>'
    : '';
  confirmar('Excluir categoria', `Excluir a categoria <b>${esc(nomeCategoria(c.id))}</b>?${aviso}`, 'Excluir categoria', async () => {
    await api.excluirCategoria(c.id);
    if (filtroCardapio.tipo === c.id) filtroCardapio.tipo = '';
    toast(`Categoria “${c.nome}” excluída.`);
    atualizarCardapio();
    if (voltarParaLista) { await gerenciarCategorias(); return 'manter'; }
    return undefined;
  }, voltarParaLista ? () => gerenciarCategorias() : null);
}

function cardItem(i) {
  const semFicha = !i.total_ingredientes;
  const porcoes = i.porcoes_disponiveis;
  return `
    <article class="card" data-id="${i.id_item}">
      <div class="card-top">
        <span class="badge ${CAT[i.tipo_item]?.cls}">${esc(CAT[i.tipo_item]?.nome || i.tipo_item)}</span>
        <span class="price">${brl(i.preco_de_venda)}</span>
      </div>
      <h3>${esc(i.descricao_item)}</h3>
      <p class="desc">${esc(i.detalhes_item) || '<span class="muted">Sem descrição</span>'}</p>
      <dl class="card-meta">
        <div><dt>Ingredientes</dt><dd>${semFicha ? '—' : i.total_ingredientes}</dd></div>
        <div><dt>Dá para fazer</dt><dd class="${!semFicha && porcoes < 5 ? 'warn' : ''}">${semFicha ? 'sem ficha' : `${num(porcoes)} un`}</dd></div>
      </dl>
      <div class="card-actions">
        <button class="btn btn-sm btn-ghost" data-acao="editar">Editar</button>
        <button class="btn btn-sm btn-ghost" data-acao="vender" ${semFicha ? 'disabled title="Cadastre a ficha técnica primeiro"' : ''}>Registrar venda</button>
        <button class="btn btn-sm btn-icon-danger" data-acao="excluir" aria-label="Excluir ${esc(i.descricao_item)}">Excluir</button>
      </div>
    </article>`;
}

async function formItem(id, tipoPadrao) {
  const [item, ingredientes] = await Promise.all([id ? api.item(id) : null, api.ingredientes(), carregarCategorias()]);
  const ficha = item?.ingredientes?.length ? item.ingredientes : [];
  const opt = (sel) => ingredientes.map((g) =>
    `<option value="${g.id_ingrediente}" data-un="${esc(g.unidade_medida)}" ${g.id_ingrediente === sel ? 'selected' : ''}>${esc(g.descricao_ingrediente)}</option>`).join('');

  const linha = (r = {}) => `
    <div class="ficha-row">
      <select name="ing" class="input" aria-label="Ingrediente"><option value="">Selecione…</option>${opt(r.id_ingrediente)}</select>
      <div class="input-suffix"><input name="ingqtd" class="input" type="number" step="0.01" min="0.01" placeholder="Qtd" value="${r.quantidade_requerida ?? ''}" aria-label="Quantidade"><span class="suffix">${esc(r.unidade_medida || '')}</span></div>
      <button type="button" class="icon-btn" data-remover aria-label="Remover ingrediente">✕</button>
    </div>`;

  abrirModal({
    titulo: id ? 'Editar item do cardápio' : 'Novo item do cardápio',
    corpo: `
      <div class="form-grid">
        <label class="field span-2">Nome do item
          <input name="descricao_item" class="input" maxlength="50" required value="${esc(item?.descricao_item)}" placeholder="Ex.: Smash Clássico">
        </label>
        <label class="field">Categoria
          <select name="tipo_item" class="input" required>
            <option value="">Selecione…</option>
            ${gruposCardapio().map((g) => {
              const opts = g.categorias.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('');
              return g.dividido ? `<optgroup label="${esc(g.nome)}">${opts}</optgroup>` : opts;
            }).join('')}
          </select>
        </label>
        <label class="field">Preço de venda (R$)
          <input name="preco_de_venda" class="input" type="number" step="0.01" min="0.01" required value="${item?.preco_de_venda ?? ''}" placeholder="0,00">
        </label>
        <label class="field span-2">Descrição
          <textarea name="detalhes_item" class="input" rows="2" maxlength="255" placeholder="Pão, carne, queijo, molho…">${esc(item?.detalhes_item)}</textarea>
          <small class="hint"><span id="desc-count">0</span>/255</small>
        </label>
      </div>
      <fieldset class="ficha">
        <legend>Ficha técnica <small>(ingredientes usados por unidade)</small></legend>
        <div id="ficha-linhas">${(ficha.length ? ficha : [{}]).map(linha).join('')}</div>
        <button type="button" class="btn btn-sm btn-ghost" id="add-ing">+ Adicionar ingrediente</button>
      </fieldset>`,
    onOpen: (body) => {
      const tipoInicial = item?.tipo_item || (CAT[tipoPadrao] ? tipoPadrao : '');
      if (tipoInicial) $('[name=tipo_item]', body).value = tipoInicial;
      const desc = $('[name=detalhes_item]', body);
      const contar = () => { $('#desc-count').textContent = desc.value.length; };
      desc.oninput = contar; contar();

      const atualizarTotal = () => {
        $$('.ficha-row', body).forEach((row) => {
          const o = $('select', row).selectedOptions[0];
          $('.suffix', row).textContent = o?.dataset.un || '';
        });
      };
      body.addEventListener('input', atualizarTotal);
      body.addEventListener('change', atualizarTotal);
      body.addEventListener('click', (e) => {
        if (e.target.closest('[data-remover]')) {
          const rows = $$('.ficha-row', body);
          if (rows.length > 1) e.target.closest('.ficha-row').remove();
          else { $('select', rows[0]).value = ''; $('input', rows[0]).value = ''; }
          atualizarTotal();
        }
      });
      $('#add-ing').onclick = () => {
        $('#ficha-linhas').insertAdjacentHTML('beforeend', linha());
        $('#ficha-linhas .ficha-row:last-child select').focus();
      };
      atualizarTotal();
    },
    onSubmit: async (fd, body) => {
      const dados = {
        descricao_item: fd.get('descricao_item'),
        tipo_item: fd.get('tipo_item'),
        preco_de_venda: fd.get('preco_de_venda'),
        detalhes_item: fd.get('detalhes_item'),
        ingredientes: $$('.ficha-row', body)
          .map((row) => ({ id_ingrediente: $('select', row).value, quantidade_requerida: $('input', row).value }))
          .filter((r) => r.id_ingrediente),
      };
      if (id) await api.atualizarItem(id, dados); else await api.criarItem(dados);
      toast(id ? 'Item atualizado.' : 'Item adicionado ao cardápio.');
      carregarItens();
    },
  });
}

async function formVenda(itemResumo) {
  const item = await api.item(itemResumo.id_item);
  abrirModal({
    titulo: `Registrar venda · ${item.descricao_item}`,
    botao: 'Dar baixa no estoque',
    corpo: `
      <label class="field">Quantidade vendida
        <input name="quantidade" class="input" type="number" min="1" step="1" value="1" required>
      </label>
      <p class="hint">Os ingredientes abaixo serão descontados do estoque (movimento <b>VEN</b>):</p>
      <ul class="consumo" id="consumo"></ul>`,
    onOpen: (body) => {
      const render = () => {
        const n = Math.max(0, Number($('[name=quantidade]', body).value) || 0);
        $('#consumo').innerHTML = item.ingredientes.map((r) => {
          const usa = r.quantidade_requerida * n;
          const falta = usa > r.quantidade_em_estoque;
          return `<li class="${falta ? 'falta' : ''}"><span>${esc(r.descricao_ingrediente)}</span>
            <span>−${qtd(usa, r.unidade_medida)} <small>(tem ${qtd(r.quantidade_em_estoque, r.unidade_medida)})</small></span></li>`;
        }).join('');
      };
      $('[name=quantidade]', body).oninput = render;
      render();
    },
    onSubmit: async (fd) => {
      const r = await api.venderItem(item.id_item, fd.get('quantidade'));
      toast(r.mensagem);
      carregarItens();
    },
  });
}

function excluirItem(item) {
  confirmar('Excluir item', `Excluir <b>${esc(item.descricao_item)}</b> do cardápio? A ficha técnica também será removida.`, 'Excluir', async () => {
    await api.excluirItem(item.id_item);
    toast('Item excluído.');
    carregarItens();
  });
}

// =====================================================================
//  ESTOQUE
// =====================================================================
const filtroEstoque = { busca: '', baixo: '' };

async function telaEstoque() {
  app.innerHTML = `
    <section class="page-head">
      <div><p class="eyebrow">Ingredientes</p><h1>Estoque</h1></div>
      <div class="head-actions">
        <button class="btn btn-ghost" id="mov-rapido">Movimentar estoque</button>
        <button class="btn btn-primary" id="novo-ing">+ Novo ingrediente</button>
      </div>
    </section>
    <section class="toolbar">
      <input type="search" id="busca-ing" class="input search" placeholder="Buscar ingrediente…" value="${esc(filtroEstoque.busca)}">
      <label class="toggle"><input type="checkbox" id="so-baixo" ${filtroEstoque.baixo ? 'checked' : ''}> Somente abaixo do mínimo</label>
    </section>
    <div id="lista-ing" class="panel panel-flush"></div>`;

  $('#novo-ing').onclick = () => formIngrediente();
  $('#mov-rapido').onclick = () => formMovimento();
  $('#busca-ing').oninput = debounce((e) => { filtroEstoque.busca = e.target.value; carregarIngredientes(); });
  $('#so-baixo').onchange = (e) => { filtroEstoque.baixo = e.target.checked ? '1' : ''; carregarIngredientes(); };
  await carregarIngredientes();
}

async function carregarIngredientes() {
  const lista = await api.ingredientes(filtroEstoque);
  const el = $('#lista-ing');
  if (!el) return;
  if (!lista.length) {
    el.innerHTML = `<div class="empty"><h2>Nenhum ingrediente</h2><p>${filtroEstoque.busca || filtroEstoque.baixo ? 'Nada encontrado com esse filtro.' : 'Cadastre os ingredientes para controlar o estoque.'}</p></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead><tr>
        <th>Ingrediente</th><th class="num">Em estoque</th><th class="num">Mínimo</th>
<th>Situação</th><th class="actions-col"><span class="sr-only">Ações</span></th>
      </tr></thead>
      <tbody>
        ${lista.map((g) => {
          const baixo = g.quantidade_em_estoque <= g.estoque_minimo;
          const zerado = g.quantidade_em_estoque <= 0;
          return `<tr data-id="${g.id_ingrediente}">
            <td><strong>${esc(g.descricao_ingrediente)}</strong><small class="sub">usado em ${g.usado_em} item(ns)</small></td>
            <td class="num"><b>${qtd(g.quantidade_em_estoque, g.unidade_medida)}</b></td>
            <td class="num">${qtd(g.estoque_minimo, g.unidade_medida)}</td>
            <td><span class="badge ${zerado ? 'badge-out' : baixo ? 'badge-low' : 'badge-ok'}">${zerado ? 'Sem estoque' : baixo ? 'Repor' : 'OK'}</span></td>
            <td class="row-actions">
              <button class="icon-btn" data-acao="mov" title="Movimentar estoque" aria-label="Movimentar ${esc(g.descricao_ingrediente)}">${ICONES.mov}</button>
              <button class="icon-btn" data-acao="hist" title="Ver histórico" aria-label="Histórico de ${esc(g.descricao_ingrediente)}">${ICONES.hist}</button>
              <button class="icon-btn" data-acao="editar" title="Editar" aria-label="Editar ${esc(g.descricao_ingrediente)}">${ICONES.editar}</button>
              <button class="icon-btn danger" data-acao="excluir" title="Excluir" aria-label="Excluir ${esc(g.descricao_ingrediente)}">${ICONES.excluir}</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;

  $$('[data-acao]', el).forEach((b) => {
    const g = lista.find((x) => x.id_ingrediente === Number(b.closest('tr').dataset.id));
    b.onclick = () => ({
      mov: () => formMovimento(g.id_ingrediente),
      hist: () => { filtroMov.ingrediente = String(g.id_ingrediente); location.hash = 'movimentos'; },
      editar: () => formIngrediente(g),
      excluir: () => excluirIngrediente(g),
    })[b.dataset.acao]();
  });
}

function formIngrediente(g) {
  const editando = Boolean(g);
  abrirModal({
    titulo: editando ? 'Editar ingrediente' : 'Novo ingrediente',
    corpo: `
      <div class="form-grid">
        <label class="field span-2">Nome do ingrediente
          <input name="descricao_ingrediente" class="input" maxlength="50" required value="${esc(g?.descricao_ingrediente)}" placeholder="Ex.: Queijo cheddar fatia">
        </label>
        <label class="field">${editando ? 'Quantidade em estoque' : 'Quantidade inicial'}
          <input name="quantidade_em_estoque" class="input" type="number" step="0.01" min="0" value="${g?.quantidade_em_estoque ?? ''}" ${editando ? 'disabled' : ''} placeholder="0">
          ${editando ? '<small class="hint">Altere pelo botão “Movimentar” para manter o histórico.</small>' : '<small class="hint">Será registrada como entrada (ENT).</small>'}
        </label>
        <label class="field">Unidade de medida
          <select name="unidade_medida" class="input">
            ${UNIDADES.map((u) => `<option ${u === (g?.unidade_medida || 'un') ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
        </label>
        <label class="field span-2">Estoque mínimo
          <input name="estoque_minimo" class="input" type="number" step="0.01" min="0" value="${g?.estoque_minimo ?? ''}" placeholder="0">
          <small class="hint">Abaixo disso aparece o alerta de reposição.</small>
        </label>
      </div>`,
    onSubmit: async (fd) => {
      const dados = Object.fromEntries(fd);
      if (editando) await api.atualizarIngrediente(g.id_ingrediente, dados); else await api.criarIngrediente(dados);
      toast(editando ? 'Ingrediente atualizado.' : 'Ingrediente cadastrado.');
      carregarIngredientes();
    },
  });
}

function excluirIngrediente(g) {
  confirmar('Excluir ingrediente', `Excluir <b>${esc(g.descricao_ingrediente)}</b>? O histórico de movimentações dele também será apagado.`, 'Excluir', async () => {
    await api.excluirIngrediente(g.id_ingrediente);
    toast('Ingrediente excluído.');
    carregarIngredientes();
  });
}

// =====================================================================
//  MOVIMENTAÇÕES
// =====================================================================
const filtroMov = { ingrediente: '', tipo: '' };

async function formMovimento(idIngrediente) {
  const [ingredientes, tipos] = await Promise.all([api.ingredientes(), api.tiposMovimento()]);
  if (!ingredientes.length) return toast('Cadastre um ingrediente primeiro.', 'erro');
  abrirModal({
    titulo: 'Movimentar estoque',
    botao: 'Lançar movimento',
    corpo: `
      <div class="form-grid">
        <label class="field span-2">Ingrediente
          <select name="id_ingrediente" class="input" required>
            ${ingredientes.map((g) => `<option value="${g.id_ingrediente}" ${g.id_ingrediente === idIngrediente ? 'selected' : ''}>${esc(g.descricao_ingrediente)}</option>`).join('')}
          </select>
        </label>
        <label class="field span-2">Tipo de movimento
          <select name="id_tipo_movimento" class="input" required>
            ${tipos.map((t) => `<option value="${t.id_tipo_movimento}">${ENTRADAS.includes(t.id_tipo_movimento) ? '＋' : '－'} ${esc(t.descricao_tipo_movimento)} (${t.id_tipo_movimento})</option>`).join('')}
          </select>
        </label>
        <label class="field">Quantidade
          <div class="input-suffix"><input name="quantidade_movida" class="input" type="number" step="0.01" min="0.01" required placeholder="0"><span class="suffix" id="mov-un"></span></div>
        </label>
        <label class="field">Data
          <input name="data_movimento" class="input" type="date" value="${hoje()}" max="${hoje()}" required>
        </label>
      </div>
      <div class="saldo-preview" id="saldo-preview"></div>`,
    onOpen: (body) => {
      const render = () => {
        const g = ingredientes.find((x) => x.id_ingrediente === Number($('[name=id_ingrediente]', body).value));
        const tipo = $('[name=id_tipo_movimento]', body).value;
        const q = Number($('[name=quantidade_movida]', body).value) || 0;
        const novo = g.quantidade_em_estoque + (ENTRADAS.includes(tipo) ? q : -q);
        $('#mov-un').textContent = g.unidade_medida;
        $('#saldo-preview').innerHTML = `
          <div><span>Saldo atual</span><b>${qtd(g.quantidade_em_estoque, g.unidade_medida)}</b></div>
          <div class="arrow">→</div>
          <div class="${novo < 0 ? 'neg' : ''}"><span>Saldo após</span><b>${qtd(novo, g.unidade_medida)}</b></div>`;
      };
      body.addEventListener('input', render);
      body.addEventListener('change', render);
      render();
    },
    onSubmit: async (fd) => {
      const r = await api.registrarMovimento(Object.fromEntries(fd));
      toast(`Movimento lançado. Novo saldo: ${num(r.saldo_posterior)}.`);
      recarregar();
    },
  });
}

async function telaMovimentos() {
  const [ingredientes, tipos] = await Promise.all([api.ingredientes(), api.tiposMovimento()]);
  app.innerHTML = `
    <section class="page-head">
      <div><p class="eyebrow">Histórico do estoque</p><h1>Movimentações</h1></div>
      <div class="head-actions"><button class="btn btn-primary" id="nova-mov">+ Nova movimentação</button></div>
    </section>
    <section class="toolbar">
      <select id="f-ing" class="input">
        <option value="">Todos os ingredientes</option>
        ${ingredientes.map((g) => `<option value="${g.id_ingrediente}">${esc(g.descricao_ingrediente)}</option>`).join('')}
      </select>
      <select id="f-tipo" class="input">
        <option value="">Todos os tipos</option>
        ${tipos.map((t) => `<option value="${t.id_tipo_movimento}">${esc(t.descricao_tipo_movimento)}</option>`).join('')}
      </select>
    </section>
    <div id="lista-mov" class="panel panel-flush"></div>`;

  $('#f-ing').value = filtroMov.ingrediente;
  $('#f-tipo').value = filtroMov.tipo;
  $('#nova-mov').onclick = () => formMovimento(Number(filtroMov.ingrediente) || undefined);
  $('#f-ing').onchange = (e) => { filtroMov.ingrediente = e.target.value; carregarMovimentos(); };
  $('#f-tipo').onchange = (e) => { filtroMov.tipo = e.target.value; carregarMovimentos(); };
  await carregarMovimentos();
}

async function carregarMovimentos() {
  const lista = await api.movimentos(filtroMov);
  const el = $('#lista-mov');
  if (el) el.innerHTML = lista.length ? tabelaMovimentos(lista) : '<div class="empty"><h2>Nenhuma movimentação</h2><p>Nada encontrado com esse filtro.</p></div>';
}

function tabelaMovimentos(lista) {
  if (!lista.length) return '<p class="muted">Nenhuma movimentação registrada.</p>';
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>#</th><th>Data</th><th>Ingrediente</th><th>Tipo</th><th class="num">Quantidade</th><th class="num">Saldo anterior</th><th class="num">Saldo posterior</th></tr></thead>
    <tbody>${lista.map((m) => {
      const entrada = ENTRADAS.includes(m.id_tipo_movimento);
      return `<tr>
        <td class="muted">${m.sequencia_lancamento}</td>
        <td>${dataBR(m.data_movimento)}</td>
        <td><strong>${esc(m.descricao_ingrediente)}</strong></td>
        <td class="tipo-cell"><span class="badge ${entrada ? 'badge-in' : 'badge-outflow'}">${esc(m.id_tipo_movimento)}</span> <small class="muted">${esc(m.descricao_tipo_movimento)}</small></td>
        <td class="num ${entrada ? 'pos' : 'neg'}">${entrada ? '+' : '−'}${qtd(m.quantidade_movida, m.unidade_medida)}</td>
        <td class="num">${qtd(m.saldo_anterior, m.unidade_medida)}</td>
        <td class="num"><b>${qtd(m.saldo_posterior, m.unidade_medida)}</b></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

rotear();
