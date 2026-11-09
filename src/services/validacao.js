const AppError = require('../utils/AppError');

function texto(valor, campo, { max, obrigatorio = true } = {}) {
  const v = (valor ?? '').toString().trim();
  if (obrigatorio && !v) throw new AppError(`O campo "${campo}" é obrigatório.`);
  if (max && v.length > max) throw new AppError(`O campo "${campo}" aceita no máximo ${max} caracteres.`);
  return v || null;
}

function numero(valor, campo, { min = 0, positivo = false, max = 999999.99 } = {}) {
  const n = Number(typeof valor === 'string' ? valor.replace(',', '.') : valor);
  if (valor === '' || valor === null || valor === undefined || Number.isNaN(n)) {
    throw new AppError(`Informe um número válido para "${campo}".`);
  }
  if (positivo && n <= 0) throw new AppError(`"${campo}" deve ser maior que zero.`);
  if (n < min) throw new AppError(`"${campo}" não pode ser menor que ${min}.`);
  if (n > max) throw new AppError(`"${campo}" excede o valor máximo permitido.`);
  return Math.round(n * 100) / 100;
}

function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function data(valor) {
  if (!valor) return hojeLocal();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw new AppError('Data do movimento inválida.');
  }
  return valor;
}

module.exports = { texto, numero, data };
