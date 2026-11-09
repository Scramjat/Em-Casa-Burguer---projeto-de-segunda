const service = require('../services/itemService');

module.exports = {
  listar: async (req, res) => res.json(await service.listar({ tipo: req.query.tipo, busca: req.query.busca })),
  obter: async (req, res) => res.json(await service.obter(req.params.id)),
  criar: async (req, res) => res.status(201).json(await service.criar(req.body)),
  atualizar: async (req, res) => res.json(await service.atualizar(req.params.id, req.body)),
  excluir: async (req, res) => { await service.excluir(req.params.id); res.status(204).end(); },
  vender: async (req, res) => res.json(await service.vender(req.params.id, req.body || {})),
};
