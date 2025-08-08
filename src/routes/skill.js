const express = require("express");
const {
  createSkill,
  updateSkill,
  deleteSkill,
  getSkill,
  getSkillsByRole,
} = require("../controllers/skillController");
const router = express.Router();

router.get("/:id", getSkill);
router.post("/", createSkill);
router.patch("/:id", updateSkill);
router.delete("/:id", deleteSkill);
// new route for skills by role
router.get("/skills/by-role/:roleId", getSkillsByRole);

module.exports = router;
