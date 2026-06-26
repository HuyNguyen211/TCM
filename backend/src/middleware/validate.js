/**
 * validate.js — runs a zod schema against req.body (or req.query) and returns
 * field-level 400 errors when invalid. The parsed/coerced value replaces the source.
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'ValidationError',
        fields: flatten(result.error),
      });
    }
    req.body = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'ValidationError',
        fields: flatten(result.error),
      });
    }
    req.validatedQuery = result.data;
    return next();
  };
}

function flatten(zodError) {
  // -> { fieldName: "message", ... }
  const out = {};
  for (const issue of zodError.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
