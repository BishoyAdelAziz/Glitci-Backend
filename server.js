const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");
const projectRoutes = require("./src/routes/projects");

const employeeRoutes = require("./src/routes/employees");
const serviceRoutes = require("./src/routes/services");
const financeRoutes = require("./src/routes/finance");
const clientRoutes = require("./src/routes/clientRoutes");

const departments = require("./src/routes/departments");
const positionRoutes = require("./src/routes/positions");
const skillRoutes = require("./src/routes/skill");
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
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/departments", departments);
app.use("/api/positions", positionRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/clients", clientRoutes);
// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
