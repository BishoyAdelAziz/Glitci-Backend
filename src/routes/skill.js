const express = require("express");
const {
  createSkill,
  deleteSkill,
  getSkill,
  getSkillsByPosition,
  updateSkill,
} = require("../controllers/skillController");
const router = express.Router();

router.get("/:id", getSkill);
router.post("/", createSkill);
router.patch("/:id", updateSkill);
router.delete("/:id", deleteSkill);
// new route for skills by role
router.get("/positions/:positionId", getSkillsByPosition);

module.exports = router;
