const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.json({ message: "Root working" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Health check working" });
});

app.get("*", (req, res) => {
  res.json({
    message: "Catch all route",
    path: req.path,
    method: req.method,
  });
});

module.exports = app;
