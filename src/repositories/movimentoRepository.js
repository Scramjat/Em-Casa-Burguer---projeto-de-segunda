const { pool } = require('../config/db');

async function listar({ ingrediente, tipo, limite = 200 } = {}) {
  const where = [];
  const params = [];
  if (ingrediente) { where.push('m.id_ingrediente = ?'); params.push(ingrediente); }
  if (tipo) { where.push('m.id_tipo_movimento = ?'); params.push(tipo); }
  params.push(Math.min(Number(limite) || 200, 1000));
  const [rows] = await pool.query(
    `SELECT m.*, g.descricao_ingrediente, g.unidade_medida, t.descricao_tipo_movimento
       FROM movimento_de_estoque m
       JOIN ingredientes g ON g.id_ingrediente = m.id_ingrediente
       JOIN tipo_movimento t ON t.id_tipo_movimento = m.id_tipo_movimento
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY m.sequencia_lancamento DESC
      LIMIT ?`,
    params
  );
  return rows;
}

async function inserir(conn, m) {
  const [res] = await conn.query(
    `INSERT INTO movimento_de_estoque
       (data_movimento, id_ingrediente, id_tipo_movimento, quantidade_movida, saldo_anterior, saldo_posterior)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [m.data_movimento, m.id_ingrediente, m.id_tipo_movimento, m.quantidade_movida, m.saldo_anterior, m.saldo_posterior]
  );
  return res.insertId;
}

async function listarTipos() {
  const [rows] = await pool.query('SELECT * FROM tipo_movimento ORDER BY id_tipo_movimento');
  return rows;
}

async function buscarTipo(id) {
  const [rows] = await pool.query('SELECT * FROM tipo_movimento WHERE id_tipo_movimento = ?', [id]);
  return rows[0] || null;
}

module.exports = { listar, inserir, listarTipos, buscarTipo };
