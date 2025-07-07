const express = require("express");
const {
  getServices,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");
const { protect, manager } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .get(protect, getServices)
  .post(protect, manager, createService);

router
  .route("/:id")
  .put(protect, manager, updateService)
  .delete(protect, manager, deleteService);

module.exports = router;
