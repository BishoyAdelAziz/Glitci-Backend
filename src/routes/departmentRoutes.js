const express = require("express");
const controller = require("../controllers/departmentController");
const { validateRequest } = require("../middleware/validateRequest");
const {
  listQuery,
  createDepartment,
  updateDepartment,
} = require("../validators/departmentValidator");

const router = express.Router();

router
  .route("/")
  .get(validateRequest(listQuery, "query"), controller.getDepartments)
  .post(validateRequest(createDepartment), controller.createDepartment);

router
  .route("/:id")
  .get(controller.getDepartment)
  .patch(validateRequest(updateDepartment), controller.updateDepartment)
  .delete(controller.deleteDepartment);

module.exports = router;
