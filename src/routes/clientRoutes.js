const express = require("express");
const clientController = require("../controllers/clientController");
const { validateRequest } = require("../middleware/validateRequest");
const {
  createClient,
  updateClient,
  listQuery,
} = require("../validators/clientValidator");

const router = express.Router();

// GET /clients - List active clients (with search: name first, then company name)
router.get(
  "/",
  validateRequest(listQuery, "query"),
  clientController.getClients
);

// GET /clients/all - List all clients (including inactive)
router.get(
  "/all",
  validateRequest(listQuery, "query"),
  clientController.getAllClients
);

// POST /clients - Create client
router.post("/", validateRequest(createClient), clientController.createClient);

// GET /clients/:id - Get client by ID
router.get("/:id", clientController.getClient);

// PATCH /clients/:id - Update client
router.patch(
  "/:id",
  validateRequest(updateClient),
  clientController.updateClient
);

// DELETE /clients/:id - Soft delete client
router.delete("/:id", clientController.deleteClient);

// POST /clients/:id/restore - Restore client
router.post("/:id/restore", clientController.restoreClient);

// DELETE /clients/:id/permanent - Permanent delete client
router.delete("/:id/permanent", clientController.permanentDeleteClient);

// POST /clients/bulk/delete - Bulk delete clients
router.post("/bulk/delete", clientController.bulkDeleteClients);

module.exports = router;
