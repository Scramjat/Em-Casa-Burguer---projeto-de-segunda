const { pool } = require('../config/db');

async function listar({ tipo, busca } = {}) {
  const where = [];
  const params = [];
  if (tipo) { where.push('i.tipo_item = ?'); params.push(tipo); }
  if (busca) { where.push('(i.descricao_item LIKE ? OR i.detalhes_item LIKE ?)'); params.push(`%${busca}%`, `%${busca}%`); }

  const [rows] = await pool.query(
    `SELECT i.*,
            COUNT(r.id_ingrediente) AS total_ingredientes,
            MIN(FLOOR(g.quantidade_em_estoque / r.quantidade_requerida)) AS porcoes_disponiveis
       FROM item_menu i
       JOIN categoria_item c ON c.id_categoria = i.tipo_item
       LEFT JOIN requer r ON r.id_item = i.id_item
       LEFT JOIN ingredientes g ON g.id_ingrediente = r.id_ingrediente
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      GROUP BY i.id_item
      ORDER BY c.ordem, i.descricao_item`,
    params
  );
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM item_menu WHERE id_item = ?', [id]);
  return rows[0] || null;
}

async function listarIngredientes(idItem, conn = pool) {
  const [rows] = await conn.query(
    `SELECT r.id_ingrediente, r.quantidade_requerida, g.descricao_ingrediente,
            g.unidade_medida, g.quantidade_em_estoque
       FROM requer r
       JOIN ingredientes g ON g.id_ingrediente = r.id_ingrediente
      WHERE r.id_item = ?
      ORDER BY g.descricao_ingrediente`,
    [idItem]
  );
  return rows;
}

async function inserir(conn, item) {
  const [res] = await conn.query(
    'INSERT INTO item_menu (descricao_item, detalhes_item, preco_de_venda, tipo_item) VALUES (?, ?, ?, ?)',
    [item.descricao_item, item.detalhes_item, item.preco_de_venda, item.tipo_item]
  );
  return res.insertId;
}

async function atualizar(conn, id, item) {
  await conn.query(
    'UPDATE item_menu SET descricao_item = ?, detalhes_item = ?, preco_de_venda = ?, tipo_item = ? WHERE id_item = ?',
    [item.descricao_item, item.detalhes_item, item.preco_de_venda, item.tipo_item, id]
  );
}

async function substituirIngredientes(conn, idItem, ingredientes) {
  await conn.query('DELETE FROM requer WHERE id_item = ?', [idItem]);
  if (!ingredientes.length) return;
  await conn.query(
    'INSERT INTO requer (id_item, id_ingrediente, quantidade_requerida) VALUES ?',
    [ingredientes.map((r) => [idItem, r.id_ingrediente, r.quantidade_requerida])]
  );
}

async function excluir(id) {
  const [res] = await pool.query('DELETE FROM item_menu WHERE id_item = ?', [id]);
  return res.affectedRows > 0;
}

module.exports = { listar, buscarPorId, listarIngredientes, inserir, atualizar, substituirIngredientes, excluir };
