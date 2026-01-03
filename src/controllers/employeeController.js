const employeeService = require("../services/employeeService");
const asyncHandler = require("../middleware/asyncHandler");
const { getPaginationData, paginate } = require("../utils/pagination");

exports.getEmployees = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );

  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.skip;

  const { data, count } = await employeeService.listEmployees(filters, {
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

exports.getAllEmployees = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );

  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.skip;

  const { data, count } = await employeeService.listAllEmployees(filters, {
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

exports.getEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);
  res.json({ success: true, data: employee });
});

exports.createEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  res.status(201).json({ success: true, data: employee });
});

exports.updateEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(
    req.params.id,
    req.body
  );
  res.json({ success: true, data: employee });
});

exports.deleteEmployee = asyncHandler(async (req, res) => {
  const result = await employeeService.deleteEmployee(req.params.id);
  res.json({ success: true, data: result });
});

exports.restoreEmployee = asyncHandler(async (req, res) => {
  const result = await employeeService.restoreEmployee(req.params.id);
  res.json({ success: true, data: result });
});

exports.getEmployeesByDepartment = asyncHandler(async (req, res) => {
  const employees = await employeeService.listEmployeesByDepartment(
    req.params.departmentId
  );
  res.json({ success: true, data: employees });
});

exports.bulkDeleteEmployees = asyncHandler(async (req, res) => {
  const result = await employeeService.bulkDelete(req.body.ids);
  res.json({ success: true, data: result });
});

exports.permanentDeleteEmployee = asyncHandler(async (req, res) => {
  const result = await employeeService.permanentDeleteEmployee(req.params.id);
  res.json({ success: true, data: result });
});
