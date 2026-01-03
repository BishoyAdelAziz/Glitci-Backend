const positionService = require("../services/positionService");
const asyncHandler = require("../middleware/asyncHandler");
const {
  listQuery,
  createPosition: createPositionValidator, // Rename the import
  updatePosition: updatePositionValidator, // Rename the import
} = require("../validators/positionValidator");
const { getPaginationData, paginate } = require("../utils/pagination");

exports.getPositions = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );
  const { data, count } = await positionService.listPositions(req.query, {
    skip,
    limit,
  });
  res.json({ success: true, count, ...paginate({ count }, page, limit), data });
});

exports.getPositionsByDepartment = asyncHandler(async (req, res) => {
  const list = await positionService.getPositionsByDepartment(
    req.params.departmentId
  );
  res.json({ success: true, data: list });
});

exports.getPosition = asyncHandler(async (req, res) => {
  const pos = await positionService.getPositionById(req.params.id);
  res.json({ success: true, data: pos });
});

// Renamed to avoid conflict
exports.createPositionHandler = asyncHandler(async (req, res) => {
  // Validate with the validator
  const { error, value } = createPositionValidator.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const pos = await positionService.createPosition(value);
  res.status(201).json({ success: true, data: pos });
});

exports.updatePosition = asyncHandler(async (req, res) => {
  // Validate with the validator
  const { error, value } = updatePositionValidator.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const pos = await positionService.updatePosition(req.params.id, value);
  res.json({ success: true, data: pos });
});

exports.deletePosition = asyncHandler(async (req, res) => {
  await positionService.deletePosition(req.params.id);
  res.json({ success: true, message: "Position removed" });
});
