import { validation } from './errors.js';

// Wraps a zod schema as Express middleware. On success it replaces req[part] with the
// parsed (and coerced/defaulted) value, so routes always read validated data.
// Express 5 made req.query a read-only getter, so reassigning it is silently a no-op -
// query results land on req.validatedQuery instead; body/params still assign directly.
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
    if (part === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[part] = result.data;
    }
    next();
  };
}
