const express = require("express");
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");
const { protect, manager } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .get(protect, getEmployees)
  .post(protect, manager, createEmployee);

router
  .route("/:id")
  .get(protect, getEmployee)
  .patch(protect, manager, updateEmployee)
  .delete(protect, manager, deleteEmployee);

module.exports = router;
