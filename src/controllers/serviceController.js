const serviceService = require("../services/serviceService");
const asyncHandler = require("../middleware/asyncHandler");
const { getPaginationData, paginate } = require("../utils/pagination");

// Get all active services
exports.getServices = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );

  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.skip;

  const { data, count } = await serviceService.listServices(filters, {
    skip,
    limit,
  });

  res.json({
    success: true,
    count,
    ...paginate({ count }, page, limit),
    data,
  });
});

// Get all services (including inactive)
exports.getAllServices = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );

  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.skip;

  const { data, count } = await serviceService.listAllServices(filters, {
    skip,
    limit,
  });

  res.json({
    success: true,
    count,
    ...paginate({ count }, page, limit),
    data,
  });
});

// Get single service
exports.getService = asyncHandler(async (req, res) => {
  const service = await serviceService.getServiceById(req.params.id);
  res.json({ success: true, data: service });
});

// Create service
exports.createService = asyncHandler(async (req, res) => {
  const service = await serviceService.createService(req.body);
  res.status(201).json({ success: true, data: service });
});

// Update service
exports.updateService = asyncHandler(async (req, res) => {
  const service = await serviceService.updateService(req.params.id, req.body);
  res.json({ success: true, data: service });
});

// Soft delete service
exports.deleteService = asyncHandler(async (req, res) => {
  const result = await serviceService.deleteService(req.params.id);
  res.json({ success: true, data: result });
});

// Restore service
exports.restoreService = asyncHandler(async (req, res) => {
  const result = await serviceService.restoreService(req.params.id);
  res.json({ success: true, data: result });
});

// Permanent delete service
exports.permanentDeleteService = asyncHandler(async (req, res) => {
  const result = await serviceService.permanentDeleteService(req.params.id);
  res.json({ success: true, data: result });
});

// Get services by department
exports.getServicesByDepartment = asyncHandler(async (req, res) => {
  const services = await serviceService.getServicesByDepartment(
    req.params.departmentId
  );
  res.json({ success: true, data: services });
});

// Bulk delete services
exports.bulkDeleteServices = asyncHandler(async (req, res) => {
  const result = await serviceService.bulkDelete(req.body.ids);
  res.json({ success: true, data: result });
});
