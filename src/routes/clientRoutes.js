const express = require("express");
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

const router = express.Router();

// Assuming you have authentication middleware like 'protect' and 'authorize'
// const { protect, authorize } = require('../middleware/auth');
// router.use(protect);

// Routes for /api/clients
router
  .route("/")
  .get(getClients) // Anyone can view clients (adjust as needed)
  .post(createClient); // Example: .post(authorize('admin', 'manager'), createClient);

// Routes for /api/clients/:id
router
  .route("/:id")
  .get(getClient) // Anyone can view a single client
  .patch(updateClient) // Example: .patch(authorize('admin', 'manager'), updateClient)
  .delete(deleteClient); // Example: .delete(authorize('admin'), deleteClient);

module.exports = router;
