const clientService = require("../services/clientService");
const asyncHandler = require("../middleware/asyncHandler");
const { getPaginationData, paginate } = require("../utils/pagination");

// Get all active clients
exports.getClients = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );

  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.skip;

  const { data, count } = await clientService.listClients(filters, {
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

// Get all clients (including inactive)
exports.getAllClients = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );

  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.skip;

  const { data, count } = await clientService.listAllClients(filters, {
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

// Create client
exports.createClient = asyncHandler(async (req, res) => {
  const client = await clientService.createClient(req.body);
  res.status(201).json({ success: true, data: client });
});

// Get single client by ID
exports.getClient = asyncHandler(async (req, res) => {
  const client = await clientService.getClientById(req.params.id);
  res.json({ success: true, data: client });
});

// Update client
exports.updateClient = asyncHandler(async (req, res) => {
  const client = await clientService.updateClient(req.params.id, req.body);
  res.json({ success: true, data: client });
});

// Soft delete client
exports.deleteClient = asyncHandler(async (req, res) => {
  const result = await clientService.deleteClient(req.params.id);
  res.json({ success: true, data: result });
});

// Restore client
exports.restoreClient = asyncHandler(async (req, res) => {
  const result = await clientService.restoreClient(req.params.id);
  res.json({ success: true, data: result });
});

// Permanent delete client
exports.permanentDeleteClient = asyncHandler(async (req, res) => {
  const result = await clientService.permanentDeleteClient(req.params.id);
  res.json({ success: true, data: result });
});

// Get clients by industry
exports.getClientsByIndustry = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );

  const { data, count } = await clientService.getClientsByIndustry(
    req.params.industry,
    { skip, limit }
  );

  res.json({
    success: true,
    count,
    ...paginate({ count }, page, limit),
    data,
  });
});

// Bulk delete clients
exports.bulkDeleteClients = asyncHandler(async (req, res) => {
  const result = await clientService.bulkDelete(req.body.ids);
  res.json({ success: true, data: result });
});
