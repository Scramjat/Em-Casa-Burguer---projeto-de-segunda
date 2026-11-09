const { withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { MOVIMENTOS_ENTRADA } = require('../utils/constants');
const repo = require('../repositories/movimentoRepository');
const ingredienteRepo = require('../repositories/ingredienteRepository');
const v = require('./validacao');

/**
 * Lança um movimento usando uma conexão já em transação: trava a linha do
 * ingrediente, calcula o novo saldo, grava o histórico e atualiza o estoque.
 */
async function lancar(conn, { id_ingrediente, id_tipo_movimento, quantidade_movida, data_movimento }) {
  const ingrediente = await ingredienteRepo.buscarPorId(id_ingrediente, conn, { lock: true });
  if (!ingrediente) throw new AppError('Ingrediente não encontrado.', 404);

  const sinal = MOVIMENTOS_ENTRADA.includes(id_tipo_movimento) ? 1 : -1;
  const saldoAnterior = Number(ingrediente.quantidade_em_estoque);
  const saldoPosterior = Math.round((saldoAnterior + sinal * quantidade_movida) * 100) / 100;

  if (saldoPosterior < 0) {
    throw new AppError(
      `Estoque insuficiente de "${ingrediente.descricao_ingrediente}": ` +
      `saldo ${saldoAnterior} ${ingrediente.unidade_medida}, necessário ${quantidade_movida}.`,
      409
    );
  }
  if (saldoPosterior > 999999.99) throw new AppError('O saldo resultante excede o limite do estoque.');

  const id = await repo.inserir(conn, {
    data_movimento, id_ingrediente, id_tipo_movimento, quantidade_movida,
    saldo_anterior: saldoAnterior, saldo_posterior: saldoPosterior,
  });
  await ingredienteRepo.atualizarSaldo(conn, id_ingrediente, saldoPosterior);
  return { sequencia_lancamento: id, saldo_anterior: saldoAnterior, saldo_posterior: saldoPosterior };
}

async function registrar(dados) {
  const tipo = await repo.buscarTipo(dados.id_tipo_movimento);
  if (!tipo) throw new AppError('Selecione um tipo de movimento válido.');
  const movimento = {
    id_ingrediente: Number(dados.id_ingrediente),
    id_tipo_movimento: tipo.id_tipo_movimento,
    quantidade_movida: v.numero(dados.quantidade_movida, 'Quantidade', { positivo: true }),
    data_movimento: v.data(dados.data_movimento),
  };
  return withTransaction((conn) => lancar(conn, movimento));
}

module.exports = {
  lancar,
  registrar,
  listar: (filtros) => repo.listar(filtros),
  listarTipos: () => repo.listarTipos(),
};
