export function validate(schema) {
  return async (req, res, next) => {
    try {
      await schema.validate(req.body, { abortEarly: false, stripUnknown: true });
      next();
    } catch (error) {
      res.status(400).json({
        message: "Validation failed",
        errors: error.errors || [error.message]
      });
    }
  };
}
