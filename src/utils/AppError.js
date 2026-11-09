/** Erro de regra de negócio com status HTTP associado. */
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

module.exports = AppError;
