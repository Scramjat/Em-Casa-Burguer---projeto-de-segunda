const { pool } = require('../config/db');

async function listar() {
  const [rows] = await pool.query(
    `SELECT c.*, COUNT(i.id_item) AS total_itens
       FROM categoria_item c
       LEFT JOIN item_menu i ON i.tipo_item = c.id_categoria
      GROUP BY c.id_categoria
      ORDER BY c.ordem, c.nome_categoria`
  );
  return rows.map((c) => ({ ...c, padrao: Boolean(c.padrao) }));
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM categoria_item WHERE id_categoria = ?', [id]);
  return rows[0] || null;
}

// A comparação é feita em JS: as tabelas são latin1 e a conexão utf8mb4,
// e misturar as duas collations em LOWER()/COALESCE() gera erro no MySQL.
async function buscarPorNome(nome, grupo, ignorarId = null) {
  const norm = (t) => (t || '').trim().toLocaleLowerCase('pt-BR');
  const [rows] = await pool.query('SELECT id_categoria, nome_categoria, grupo_categoria FROM categoria_item');
  return rows.find((c) => c.id_categoria !== ignorarId
    && norm(c.nome_categoria) === norm(nome) && norm(c.grupo_categoria) === norm(grupo)) || null;
}

/** Próxima posição: logo após a última categoria do mesmo grupo, ou no fim da lista. */
async function proximaOrdem(grupo) {
  const [rows] = await pool.query('SELECT ordem, grupo_categoria FROM categoria_item');
  const norm = (t) => (t || '').trim().toLocaleLowerCase('pt-BR');
  const doGrupo = grupo ? rows.filter((c) => norm(c.grupo_categoria) === norm(grupo)) : [];
  if (doGrupo.length) return Math.max(...doGrupo.map((c) => c.ordem)) + 1;
  const maior = rows.length ? Math.max(...rows.map((c) => c.ordem)) : 0;
  return Math.ceil((maior + 1) / 10) * 10;
}

async function inserir(c) {
  await pool.query(
    'INSERT INTO categoria_item (id_categoria, nome_categoria, grupo_categoria, ordem, padrao) VALUES (?, ?, ?, ?, 0)',
    [c.id_categoria, c.nome_categoria, c.grupo_categoria, c.ordem]
  );
}

async function atualizar(id, c) {
  await pool.query(
    'UPDATE categoria_item SET nome_categoria = ?, grupo_categoria = ? WHERE id_categoria = ?',
    [c.nome_categoria, c.grupo_categoria, id]
  );
}

async function contarItens(id) {
  const [[r]] = await pool.query('SELECT COUNT(*) AS n FROM item_menu WHERE tipo_item = ?', [id]);
  return r.n;
}

async function excluir(id) {
  await pool.query('DELETE FROM categoria_item WHERE id_categoria = ?', [id]);
}

module.exports = { listar, buscarPorId, buscarPorNome, proximaOrdem, inserir, atualizar, contarItens, excluir };
