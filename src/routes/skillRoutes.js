const express = require("express");
const controller = require("../controllers/skillController");
const { validateRequest } = require("../middleware/validateRequest");
const {
  listQuery,
  createSkill,
  updateSkill,
} = require("../validators/skillValidator");

const router = express.Router();

router
  .route("/")
  .get(validateRequest(listQuery, "query"), controller.getSkills)
  .post(validateRequest(createSkill), controller.createSkill);

router.get("/position/:positionId", controller.getSkillsByPosition);

router
  .route("/:id")
  .get(controller.getSkill)
  .patch(validateRequest(updateSkill), controller.updateSkill)
  .delete(controller.deleteSkill);

module.exports = router;
