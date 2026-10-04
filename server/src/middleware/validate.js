// Usage: validate(schema) parses req.body; validate(schema, 'query') parses req.query
export const validate = (schema, source = 'body') => (req, _res, next) => {
  try {
    const parsed = schema.parse(req[source]);
    if (source === 'query') req.validQuery = parsed;
    else req[source] = parsed;
    next();
  } catch (e) {
    next(e);
  }
};
