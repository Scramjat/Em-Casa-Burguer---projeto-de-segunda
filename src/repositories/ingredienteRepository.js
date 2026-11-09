const { pool } = require('../config/db');

async function listar({ busca, baixo } = {}) {
  const where = [];
  const params = [];
  if (busca) { where.push('g.descricao_ingrediente LIKE ?'); params.push(`%${busca}%`); }
  if (baixo) where.push('g.quantidade_em_estoque <= g.estoque_minimo');
  const [rows] = await pool.query(
    `SELECT g.*,
            (SELECT COUNT(*) FROM requer r WHERE r.id_ingrediente = g.id_ingrediente) AS usado_em
       FROM ingredientes g
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY g.descricao_ingrediente`,
    params
  );
  return rows;
}

async function buscarPorId(id, conn = pool, { lock = false } = {}) {
  const [rows] = await conn.query(
    `SELECT * FROM ingredientes WHERE id_ingrediente = ?${lock ? ' FOR UPDATE' : ''}`,
    [id]
  );
  return rows[0] || null;
}

async function inserir(conn, g) {
  const [res] = await conn.query(
    `INSERT INTO ingredientes (descricao_ingrediente, unidade_medida, quantidade_em_estoque, estoque_minimo)
     VALUES (?, ?, 0, ?)`,
    [g.descricao_ingrediente, g.unidade_medida, g.estoque_minimo]
  );
  return res.insertId;
}

async function atualizar(id, g) {
  await pool.query(
    `UPDATE ingredientes SET descricao_ingrediente = ?, unidade_medida = ?, estoque_minimo = ?
      WHERE id_ingrediente = ?`,
    [g.descricao_ingrediente, g.unidade_medida, g.estoque_minimo, id]
  );
}

async function atualizarSaldo(conn, id, saldo) {
  await conn.query('UPDATE ingredientes SET quantidade_em_estoque = ? WHERE id_ingrediente = ?', [saldo, id]);
}

async function contarUsos(id) {
  const [rows] = await pool.query('SELECT COUNT(*) AS itens FROM requer WHERE id_ingrediente = ?', [id]);
  return rows[0].itens;
}

/** Remove o ingrediente e seu histórico de movimentos. */
async function excluir(conn, id) {
  await conn.query('DELETE FROM movimento_de_estoque WHERE id_ingrediente = ?', [id]);
  const [res] = await conn.query('DELETE FROM ingredientes WHERE id_ingrediente = ?', [id]);
  return res.affectedRows > 0;
}

module.exports = { listar, buscarPorId, inserir, atualizar, atualizarSaldo, contarUsos, excluir };
