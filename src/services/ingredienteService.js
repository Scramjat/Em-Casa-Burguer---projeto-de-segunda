const { withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const repo = require('../repositories/ingredienteRepository');
const movimentoService = require('./movimentoService');
const v = require('./validacao');

function validar(dados) {
  return {
    descricao_ingrediente: v.texto(dados.descricao_ingrediente, 'Nome do ingrediente', { max: 50 }),
    unidade_medida: v.texto(dados.unidade_medida || 'un', 'Unidade', { max: 10 }),
    estoque_minimo: v.numero(dados.estoque_minimo ?? 0, 'Estoque mínimo'),
  };
}

async function obter(id) {
  const g = await repo.buscarPorId(id);
  if (!g) throw new AppError('Ingrediente não encontrado.', 404);
  return g;
}

/** Cria o ingrediente; a quantidade inicial entra como movimento de ENTRADA. */
async function criar(dados) {
  const g = validar(dados);
  const qtdInicial = v.numero(dados.quantidade_em_estoque || 0, 'Quantidade inicial');
  const id = await withTransaction(async (conn) => {
    const novoId = await repo.inserir(conn, g);
    if (qtdInicial > 0) {
      await movimentoService.lancar(conn, {
        id_ingrediente: novoId, id_tipo_movimento: 'ENT',
        quantidade_movida: qtdInicial, data_movimento: v.data(),
      });
    }
    return novoId;
  });
  return obter(id);
}

/** Atualiza dados cadastrais. A quantidade só muda via movimento de estoque. */
async function atualizar(id, dados) {
  await obter(id);
  await repo.atualizar(id, validar(dados));
  return obter(id);
}

async function excluir(id) {
  await obter(id);
  const usos = await repo.contarUsos(id);
  if (usos > 0) {
    throw new AppError(
      `Este ingrediente está na ficha técnica de ${usos} item(ns) do cardápio. Remova-o desses itens antes de excluir.`,
      409
    );
  }
  await withTransaction((conn) => repo.excluir(conn, id));
}

module.exports = { listar: (f) => repo.listar(f), obter, criar, atualizar, excluir };
