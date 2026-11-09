const { Router } = require('express');
const item = require('../controllers/itemController');
const ingrediente = require('../controllers/ingredienteController');
const movimento = require('../controllers/movimentoController');
const categoria = require('../controllers/categoriaController');

const router = Router();

// Express 5 encaminha rejeições de handlers async ao errorHandler automaticamente.
router.get('/resumo', movimento.resumo);

router.get('/categorias', categoria.listar);
router.post('/categorias', categoria.criar);
router.put('/categorias/:id', categoria.atualizar);
router.delete('/categorias/:id', categoria.excluir);

router.get('/itens', item.listar);
router.get('/itens/:id', item.obter);
router.post('/itens', item.criar);
router.put('/itens/:id', item.atualizar);
router.delete('/itens/:id', item.excluir);
router.post('/itens/:id/vender', item.vender);

router.get('/ingredientes', ingrediente.listar);
router.get('/ingredientes/:id', ingrediente.obter);
router.post('/ingredientes', ingrediente.criar);
router.put('/ingredientes/:id', ingrediente.atualizar);
router.delete('/ingredientes/:id', ingrediente.excluir);

router.get('/tipos-movimento', movimento.tipos);
router.get('/movimentos', movimento.listar);
router.post('/movimentos', movimento.registrar);

module.exports = router;
