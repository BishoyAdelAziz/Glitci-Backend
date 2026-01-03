const express = require("express");
const controller = require("../controllers/positionController");
const { validateRequest } = require("../middleware/validateRequest");
const {
  listQuery,
  createPosition,
  updatePosition,
} = require("../validators/positionValidator");

const router = express.Router();

router
  .route("/")
  .get(validateRequest(listQuery, "query"), controller.getPositions)
  .post(validateRequest(createPosition), controller.createPositionHandler);

router.get("/department/:departmentId", controller.getPositionsByDepartment);

router
  .route("/:id")
  .get(controller.getPosition)
  .patch(validateRequest(updatePosition), controller.updatePosition)
  .delete(controller.deletePosition);

module.exports = router;
