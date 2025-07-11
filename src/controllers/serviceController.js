const Service = require("../models/Service");

// @desc    Get all services
// @route   GET /api/services
// @access  Private
exports.getServices = async (req, res, next) => {
  try {
    const services = await Service.find();
    res
      .status(200)
      .json({ success: true, count: services.length, data: services });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Private
exports.getService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false });
    }
    res.status(200).json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

// @desc    Create new service
// @route   POST /api/services
// @access  Private
exports.createService = async (req, res, next) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

// @desc    Update service
// @route   PATCH /api/services/:id
// @access  Private
exports.updateService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!service) {
      return res.status(404).json({ success: false });
    }
    res.status(200).json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};
