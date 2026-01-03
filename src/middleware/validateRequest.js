const Joi = require("joi");
const AppError = require("../utils/AppError");

/* express-validator runner (for small inline checks) */
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));
  next();
};

/* Joi runner (for big schemas) */
const validateRequest =
  (schema, property = "body") =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
    });
    if (error)
      return next(
        new AppError(error.details.map((d) => d.message).join(", "), 400)
      );
    req[property] = value; // overwrite with casted values
    next();
  };

module.exports = { validate, validateRequest }; // ✅ export object
