import { ZodError } from 'zod';

export function validate(schema, target = 'body') {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[target] || {});

      try {
        req[target] = parsed;
      } catch {
        // En Express 5, req.query / req.params son getters de solo lectura
        if (typeof req[target] === 'object' && req[target] !== null) {
          Object.assign(req[target], parsed);
        }
      }

      req[`validated_${target}`] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = (error.issues || []).map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          rule: err.code
        }));

        return res.status(400).json({
          success: false,
          message: 'Error de validación en los datos enviados',
          errors: details
        });
      }

      console.error('Error de validación no-Zod:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno durante la validación de datos',
        error: error.message
      });
    }
  };
}
