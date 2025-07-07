const asyncHandler = require("express-async-handler");
const Service = require("../models/Service");

// @desc    Get all services
// @route   GET /api/services
// @access  Private
const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ isActive: true }).sort({
    category: 1,
    name: 1,
  });

  res.json({
    success: true,
    count: services.length,
    data: services,
  });
});

// @desc    Create new service
// @route   POST /api/services
// @access  Private (Manager/Admin)
const createService = asyncHandler(async (req, res) => {
  const service = await Service.create(req.body);

  res.status(201).json({
    success: true,
    data: service,
  });
});

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Manager/Admin)
const updateService = asyncHandler(async (req, res) => {
  let service = await Service.findById(req.params.id);

  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  service = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: service,
  });
});

// @desc    Delete service (soft delete)
// @route   DELETE /api/services/:id
// @access  Private (Manager/Admin)
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  service.isActive = false;
  await service.save();

  res.json({
    success: true,
    message: "Service deactivated successfully",
  });
});

module.exports = {
  getServices,
  createService,
  updateService,
  deleteService,
};
