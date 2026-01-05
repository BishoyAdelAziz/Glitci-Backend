const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");

const errorHandler = require("./src/middleware/errorHandler");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDoc = YAML.load("./openapi.yaml");

const app = express();
// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/services", require("./src/routes/serviceRoutes"));
app.use("/api/clients", require("./src/routes/clientRoutes"));
app.use("/api/employees", require("./src/routes/employeeRoutes"));
// NEW – MVC modules we just built
app.use("/api/projects", require("./src/routes/projectRoutes"));
app.use("/api/analytics", require("./src/routes/analyticsRoutes"));
app.use("/api/departments", require("./src/routes/departmentRoutes"));
app.use("/api/positions", require("./src/routes/positionRoutes"));
app.use("/api/skills", require("./src/routes/skillRoutes"));
app.use("/api/finance", require("./src/routes/financeRoutes"));
// Error handling
app.use(errorHandler);
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
function doPeriodicWork() {
  // your job here
  console.log("Running periodic task at", new Date().toISOString());
}
setInterval(doPeriodicWork, 5 * 60 * 1000); // every 5 minutes
