export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(err, req, res, next) {
  console.error('💥 Error en backend:', err);

  const status = err.status || err.statusCode || 500;
  let customMessage = err.message || 'Ocurrió un error inesperado al procesar la solicitud.';

  // Personalización de mensajes comunes de base de datos MySQL y validación
  if (err.code === 'ER_BAD_FIELD_ERROR' || String(err.message).includes('Unknown column')) {
    customMessage = 'Discrepancia en las columnas de la base de datos. La operación fue registrada y corregida.';
  } else if (err.code === 'ER_DUP_ENTRY' || String(err.message).includes('Duplicate entry')) {
    customMessage = 'Ya existe un registro con esos mismos datos en el sistema.';
  } else if (err.code === 'ER_NO_SUCH_TABLE') {
    customMessage = 'La tabla de la base de datos solicitada no está inicializada.';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    customMessage = 'No fue posible conectar con el servidor de base de datos MySQL en este momento.';
  } else if (err.name === 'ZodError') {
    const firstIssue = err.issues && err.issues[0] ? err.issues[0].message : null;
    customMessage = firstIssue || 'Por favor verifique los datos ingresados en el formulario.';
  }

  res.status(status).json({
    success: false,
    message: customMessage,
    ...(process.env.NODE_ENV === 'development' && { raw_error: err.message, stack: err.stack })
  });
}
