// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = [];

  // Joi validation error
  if (err.isJoi) {
    statusCode = 400;
    message = "Validation Error";
    // Fix: Check if err.details exists before accessing it
    errors = err.details
      ? err.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }))
      : [];
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
    const field = Object.keys(err.keyPattern)[0];
    errors = [{ field, message: `This ${field} already exists` }];
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
    errors = [{ field: err.path, message: `Invalid ${err.path} format` }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
