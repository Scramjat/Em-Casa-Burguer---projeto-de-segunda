const AppError = require('../utils/AppError');
const repo = require('../repositories/categoriaRepository');
const v = require('./validacao');

/** "Hambúrguer" + "Vegano" -> "HAMBURGUER_VEGANO" (código gravado em item_menu.tipo_item). */
function gerarCodigo(nome, grupo) {
  const slug = (t) => (t || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return [slug(grupo), slug(nome)].filter(Boolean).join('_').slice(0, 26) || 'CATEGORIA';
}

async function codigoLivre(base) {
  let codigo = base;
  for (let n = 2; await repo.buscarPorId(codigo); n++) codigo = `${base}_${n}`;
  return codigo;
}

async function validar(dados) {
  const c = {
    nome_categoria: v.texto(dados.nome_categoria, 'Nome da categoria', { max: 30 }),
    grupo_categoria: v.texto(dados.grupo_categoria, 'Grupo', { max: 30, obrigatorio: false }),
  };
  // Reaproveita a grafia de um grupo já existente ("hambúrguer" -> "Hambúrguer")
  if (c.grupo_categoria) {
    const alvo = c.grupo_categoria.toLocaleLowerCase('pt-BR');
    const existente = (await repo.listar()).find((x) => x.grupo_categoria?.toLocaleLowerCase('pt-BR') === alvo);
    if (existente) c.grupo_categoria = existente.grupo_categoria;
  }
  return c;
}

async function obter(id) {
  const c = await repo.buscarPorId(id);
  if (!c) throw new AppError('Categoria não encontrada.', 404);
  return c;
}

async function criar(dados) {
  const c = await validar(dados);
  if (await repo.buscarPorNome(c.nome_categoria, c.grupo_categoria)) {
    throw new AppError('Já existe uma categoria com esse nome.', 409);
  }
  c.id_categoria = await codigoLivre(gerarCodigo(c.nome_categoria, c.grupo_categoria));
  c.ordem = await repo.proximaOrdem(c.grupo_categoria);
  await repo.inserir(c);
  return obter(c.id_categoria);
}

/** Renomeia/reagrupa. O código não muda, então os itens continuam ligados. */
async function atualizar(id, dados) {
  const atual = await obter(id);
  const c = await validar(dados);
  if (atual.padrao) c.grupo_categoria = atual.grupo_categoria; // Smash/Tradicional ficam em Hambúrguer
  if (await repo.buscarPorNome(c.nome_categoria, c.grupo_categoria, id)) {
    throw new AppError('Já existe uma categoria com esse nome.', 409);
  }
  await repo.atualizar(id, c);
  return obter(id);
}

async function excluir(id) {
  await obter(id);
  const n = await repo.contarItens(id);
  if (n > 0) throw new AppError(`A categoria tem ${n} item(ns). Mova ou exclua os itens antes.`, 409);
  await repo.excluir(id);
}

module.exports = { listar: () => repo.listar(), obter, criar, atualizar, excluir };
