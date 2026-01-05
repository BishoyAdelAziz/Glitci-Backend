// api/index.js
const express = require("express");

console.log("=== Starting serverless function ===");

const app = express();

app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "Root working" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error("Error caught:", err.message, err.stack);
  res.status(500).json({ error: err.message });
});

console.log("=== App configured, exporting ===");

module.exports = app;
