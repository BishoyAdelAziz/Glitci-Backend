const express = require("express");
const {
  getPositionsByDepartment,
  getPosition,
  createPosition,
  updatePosition,
  deletePosition,
} = require("../controllers/positionController");
const { protect, manager, admin } = require("../middleware/auth");

const router = express.Router();

// Protect all routes
router.use(protect);

// GET /api/Positions/department/:departmentId - Get Positions by department
router.get("/:departmentId", getPositionsByDepartment);

// GET /api/Positions/:id - Get single Position
router.get("/:id", getPosition);

// POST /api/Positions - Create Position (manager+ only)
router.post("/", createPosition);

// PATCH /api/Positions/:id - Update Position (manager+ only)
router.patch("/:id", updatePosition);

// DELETE /api/Positions/:id - Delete Position (admin only)
router.delete("/:id", deletePosition);

module.exports = router;
