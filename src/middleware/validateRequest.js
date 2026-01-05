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
const validateRequest = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message.replace(/['"]/g, ""),
      }));

      return next(new AppError("Validation Error", 400, errors));
    }

    req[property] = value;
    next();
  };
};
module.exports = { validate, validateRequest }; // ✅ export object
