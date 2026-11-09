const { withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const repo = require('../repositories/itemRepository');
const ingredienteRepo = require('../repositories/ingredienteRepository');
const categoriaRepo = require('../repositories/categoriaRepository');
const movimentoService = require('./movimentoService');
const v = require('./validacao');

async function validar(dados) {
  const item = {
    descricao_item: v.texto(dados.descricao_item, 'Nome do item', { max: 50 }),
    detalhes_item: v.texto(dados.detalhes_item, 'Descrição', { max: 255, obrigatorio: false }),
    preco_de_venda: v.numero(dados.preco_de_venda, 'Preço de venda', { positivo: true }),
    tipo_item: dados.tipo_item,
  };
  if (!item.tipo_item || !(await categoriaRepo.buscarPorId(item.tipo_item))) {
    throw new AppError('Selecione uma categoria válida.');
  }

  const ingredientes = [];
  const vistos = new Set();
  for (const r of dados.ingredientes || []) {
    const idIng = Number(r.id_ingrediente);
    if (!idIng) continue;
    if (vistos.has(idIng)) throw new AppError('Há ingredientes repetidos na ficha técnica.');
    if (!(await ingredienteRepo.buscarPorId(idIng))) throw new AppError(`Ingrediente #${idIng} não existe.`);
    vistos.add(idIng);
    ingredientes.push({
      id_ingrediente: idIng,
      quantidade_requerida: v.numero(r.quantidade_requerida, 'Quantidade do ingrediente', { positivo: true }),
    });
  }
  return { item, ingredientes };
}

async function obter(id) {
  const item = await repo.buscarPorId(id);
  if (!item) throw new AppError('Item do cardápio não encontrado.', 404);
  item.ingredientes = await repo.listarIngredientes(id);
  return item;
}

async function criar(dados) {
  const { item, ingredientes } = await validar(dados);
  const id = await withTransaction(async (conn) => {
    const novoId = await repo.inserir(conn, item);
    await repo.substituirIngredientes(conn, novoId, ingredientes);
    return novoId;
  });
  return obter(id);
}

async function atualizar(id, dados) {
  await obter(id);
  const { item, ingredientes } = await validar(dados);
  await withTransaction(async (conn) => {
    await repo.atualizar(conn, id, item);
    await repo.substituirIngredientes(conn, id, ingredientes);
  });
  return obter(id);
}

async function excluir(id) {
  if (!(await repo.excluir(id))) throw new AppError('Item do cardápio não encontrado.', 404);
}

/** Registra a venda de N unidades: dá baixa em cada ingrediente da ficha técnica. */
async function vender(id, dados) {
  const quantidade = v.numero(dados.quantidade ?? 1, 'Quantidade vendida', { positivo: true });
  if (!Number.isInteger(quantidade)) throw new AppError('A quantidade vendida deve ser um número inteiro.');
  const item = await obter(id);
  if (!item.ingredientes.length) {
    throw new AppError('Este item não tem ficha técnica. Cadastre os ingredientes para dar baixa no estoque.');
  }
  const hoje = v.data();
  await withTransaction(async (conn) => {
    for (const r of item.ingredientes) {
      await movimentoService.lancar(conn, {
        id_ingrediente: r.id_ingrediente,
        id_tipo_movimento: 'VEN',
        quantidade_movida: Math.round(r.quantidade_requerida * quantidade * 100) / 100,
        data_movimento: hoje,
      });
    }
  });
  return { mensagem: `Baixa de ${quantidade}x "${item.descricao_item}" registrada no estoque.` };
}

module.exports = {
  listar: (f) => repo.listar(f),
  obter, criar, atualizar, excluir, vender,
};
