const express = require("express");
const controller = require("../controllers/employeeController");
const { validateRequest } = require("../middleware/validateRequest");
const {
  createEmployee,
  updateEmployee,
  listQuery,
} = require("../validators/employeeValidator");

const router = express.Router();

router
  .route("/")
  .get(validateRequest(listQuery, "query"), controller.getEmployees)
  .post(validateRequest(createEmployee), controller.createEmployee);

router
  .route("/:id")
  .get(controller.getEmployee)
  .patch(validateRequest(updateEmployee), controller.updateEmployee)
  .delete(controller.deleteEmployee);
router.get("/department/:departmentId", controller.getEmployeesByDepartment);

module.exports = router;
