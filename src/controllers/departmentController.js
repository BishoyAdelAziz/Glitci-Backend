const departmentService = require("../services/departmentService");
const asyncHandler = require("../middleware/asyncHandler");
const {
  listQuery,
  createDepartment,
  updateDepartment,
} = require("../validators/departmentValidator");
const { getPaginationData, paginate } = require("../utils/pagination");

exports.getDepartments = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );
  const { data, count } = await departmentService.listDepartments(req.query, {
    skip,
    limit,
  });
  res.json({ success: true, count, ...paginate({ count }, page, limit), data });
});

exports.createDepartment = asyncHandler(async (req, res) => {
  const dept = await departmentService.createDepartment(req.body);
  res.status(201).json({ success: true, data: dept });
});

exports.getDepartment = asyncHandler(async (req, res) => {
  const dept = await departmentService.getDepartmentById(req.params.id);
  res.json({ success: true, data: dept });
});

exports.updateDepartment = asyncHandler(async (req, res) => {
  const dept = await departmentService.updateDepartment(
    req.params.id,
    req.body
  );
  res.json({ success: true, data: dept });
});

exports.deleteDepartment = asyncHandler(async (req, res) => {
  await departmentService.deleteDepartment(req.params.id);
  res.json({ success: true, message: "Department removed" });
});
