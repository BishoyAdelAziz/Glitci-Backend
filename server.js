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
const fs = require("fs");
const path = require("path");

// ✅ SAFE SWAGGER LOADING - Won't crash server
let swaggerDoc;
try {
  // Try multiple possible locations for openapi.yaml
  const possiblePaths = [
    "./openapi.yaml",
    path.join(__dirname, "openapi.yaml"),
    "/var/task/openapi.yaml", // Serverless environments
    "../openapi.yaml", // Sometimes needed in monorepos
  ];

  for (const yamlPath of possiblePaths) {
    if (fs.existsSync(yamlPath)) {
      const YAML = require("yamljs");
      swaggerDoc = YAML.load(yamlPath);
      console.log(`✅ Swagger docs loaded from: ${yamlPath}`);
      break;
    }
  }

  // Fallback to inline minimal spec if file not found
  if (!swaggerDoc) {
    console.warn("⚠️  openapi.yaml not found, using minimal spec");
    swaggerDoc = {
      openapi: "3.0.3",
      info: {
        title: "Marketing & Software Agency API",
        version: "1.0.0",
        description:
          "Comprehensive CRM API for projects, clients, employees & finance",
      },
      servers: [
        {
          url:
            process.env.NODE_ENV === "production"
              ? "/api"
              : "http://localhost:5000/api",
        },
      ],
      tags: [
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Clients", description: "Client management" },
        { name: "Projects", description: "Project tracking & finance" },
        { name: "Employees", description: "Employee management" },
        { name: "Services", description: "Service catalog" },
      ],
      paths: {},
    };
  }
} catch (error) {
  console.error("❌ Swagger load error:", error.message);
  // Don't crash server - use fallback spec
  swaggerDoc = {
    openapi: "3.0.3",
    info: { title: "API", version: "1.0.0" },
    paths: {},
  };
}

const app = express();

// ✅ Swagger UI - Safe mounting
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDoc, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server running healthy",
    timestamp: new Date().toISOString(),
    swaggerDocs: !!swaggerDoc,
  });
});

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown handling
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server gracefully...");
  server.close(() => {
    console.log("Process terminated.");
    process.exit(0);
  });
});

module.exports = { app, server }; // For testing
