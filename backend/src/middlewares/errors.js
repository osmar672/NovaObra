export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function errorHandler(err, req, res, next) {
  const conflicts = [
    "ER_DUP_ENTRY",
    "ER_ROW_IS_REFERENCED_2",
    "ER_NO_REFERENCED_ROW_2",
    "ER_LOCK_DEADLOCK",
    "ER_LOCK_WAIT_TIMEOUT",
  ];
  const status =
    err.status ||
    (conflicts.includes(err.code)
      ? 409
      : [
            "ER_CHECK_CONSTRAINT_VIOLATED",
            "ER_DATA_TOO_LONG",
            "WARN_DATA_TRUNCATED",
            "ER_TRUNCATED_WRONG_VALUE",
            "ER_WARN_DATA_OUT_OF_RANGE",
          ].includes(err.code)
        ? 400
        : err.type === "entity.parse.failed"
          ? 400
          : 500);
  if (status === 500) console.error("Fallo interno:", err.code || err.name);
  res
    .status(status)
    .json({
      error: err.status
        ? err.message
        : status === 409
          ? "Conflicto: registro duplicado, relación inválida o dependencia existente."
          : status === 400
            ? "Datos inválidos."
            : "Error interno del servidor.",
    });
}
