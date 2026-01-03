const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const analyticsService = require('../services/analytics.service');
const router = express.Router();
router.get('/financeSummary', asyncHandler(async (req, res) => {
  const data = await analyticsService.financeSummary();
  res.json({ success: true, data });
}));
module.exports = router;
