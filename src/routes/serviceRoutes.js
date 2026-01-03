const express = require("express");
const serviceController = require("../controllers/serviceController");
const { validateRequest } = require("../middleware/validateRequest");
const {
  createService,
  updateService,
  listQuery,
} = require("../validators/serviceValidator");

const router = express.Router();

// GET /services - List active services
router.get(
  "/",
  validateRequest(listQuery, "query"),
  serviceController.getServices
);

// GET /services/all - List all services (including inactive)
router.get(
  "/all",
  validateRequest(listQuery, "query"),
  serviceController.getAllServices
);

// GET /services/department/:departmentId - Get services by department
router.get(
  "/department/:departmentId",
  serviceController.getServicesByDepartment
);

// POST /services - Create service
router.post(
  "/",
  validateRequest(createService),
  serviceController.createService
);

// GET /services/:id - Get service by ID
router.get("/:id", serviceController.getService);

// PATCH /services/:id - Update service
router.patch(
  "/:id",
  validateRequest(updateService),
  serviceController.updateService
);

// DELETE /services/:id - Soft delete service
router.delete("/:id", serviceController.deleteService);

// POST /services/:id/restore - Restore service
router.post("/:id/restore", serviceController.restoreService);

// DELETE /services/:id/permanent - Permanent delete service
router.delete("/:id/permanent", serviceController.permanentDeleteService);

// POST /services/bulk/delete - Bulk delete services
router.post("/bulk/delete", serviceController.bulkDeleteServices);

module.exports = router;
