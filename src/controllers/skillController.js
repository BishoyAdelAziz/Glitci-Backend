const skillService = require("../services/skillService");
const asyncHandler = require("../middleware/asyncHandler");
const {
  listQuery,
  createSkill,
  updateSkill,
} = require("../validators/skillValidator");
const { getPaginationData, paginate } = require("../utils/pagination");

exports.getSkills = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationData(
    req.query.page,
    req.query.limit
  );
  const { data, count } = await skillService.listSkills(req.query, {
    skip,
    limit,
  });
  res.json({ success: true, count, ...paginate({ count }, page, limit), data });
});

exports.getSkillsByPosition = asyncHandler(async (req, res) => {
  const list = await skillService.getSkillsByPosition(req.params.positionId);
  res.json({ success: true, data: list });
});

exports.getSkill = asyncHandler(async (req, res) => {
  const skill = await skillService.getSkillById(req.params.id);
  res.json({ success: true, data: skill });
});

exports.createSkill = asyncHandler(async (req, res) => {
  const skill = await skillService.createSkill(req.body);
  res.status(201).json({ success: true, data: skill });
});

exports.updateSkill = asyncHandler(async (req, res) => {
  const skill = await skillService.updateSkill(req.params.id, req.body);
  res.json({ success: true, data: skill });
});

exports.deleteSkill = asyncHandler(async (req, res) => {
  await skillService.deleteSkill(req.params.id);
  res.json({ success: true, message: "Skill removed" });
});
