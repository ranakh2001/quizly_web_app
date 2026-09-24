import { validation } from './errors.js';

// Wraps a zod schema as Express middleware. On success it replaces req[part] with the
// parsed (and coerced/defaulted) value, so routes always read validated data.
export default function validate(schema, part = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      next(validation('Invalid request', details));
      return;
    }
    req[part] = result.data;
    next();
  };
}
