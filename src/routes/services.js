const express = require("express");
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const router = express.Router();

// Import authentication middleware if you have it
// const { protect, authorize } = require('../middleware/auth');

// Example of protecting routes:
// router.use(protect);
// router.use(authorize('admin')); // Or any other role that can manage services

router.route("/").get(getServices).post(createService);

router.route("/:id").get(getService).patch(updateService).delete(deleteService);

module.exports = router;
