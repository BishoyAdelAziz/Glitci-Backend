const Service = require("../models/Service");
const Department = require("../models/Departments");
const AppError = require("../utils/AppError");

/* helpers */
const projection = "-__v";

/* list active services */
const listServices = async (filters, { skip, limit }) => {
  const q = { isActive: true };

  if (filters.department) q.department = filters.department;
  if (filters.search) {
    q.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [data, count] = await Promise.all([
    Service.find(q)
      .populate("department", "name")
      .select(projection)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .lean(),
    Service.countDocuments(q),
  ]);

  return { data, count };
};

/* list all services (including inactive) */
const listAllServices = async (filters, { skip, limit }) => {
  const q = {};

  if (filters.department) q.department = filters.department;
  if (filters.isActive !== undefined) q.isActive = filters.isActive;
  if (filters.search) {
    q.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [data, count] = await Promise.all([
    Service.find(q)
      .populate("department", "name")
      .select(projection)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .lean(),
    Service.countDocuments(q),
  ]);

  return { data, count };
};

/* single */
const getServiceById = async (id) => {
  const service = await Service.findById(id)
    .populate("department", "name")
    .select(projection)
    .lean();

  if (!service || service.isActive === false) {
    throw new AppError("Service not found", 404);
  }
  return service;
};

/* create */
const createService = async (dto) => {
  // Validate department exists
  const departmentExists = await Department.findById(dto.department);
  if (!departmentExists) {
    throw new AppError("Department not found", 400);
  }

  // Check if service with same name exists for this department
  const existing = await Service.findOne({
    name: dto.name,
    department: dto.department,
  });

  if (existing) {
    throw new AppError(
      "Service with this name already exists for this department",
      400
    );
  }

  const service = await Service.create({
    ...dto,
    isActive: true,
  });

  return Service.findById(service._id).populate("department", "name").lean();
};

/* update */
const updateService = async (id, dto) => {
  const service = await Service.findById(id);

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  // If department is being updated, validate it exists
  if (dto.department) {
    const departmentExists = await Department.findById(dto.department);
    if (!departmentExists) {
      throw new AppError("Department not found", 400);
    }
  }

  // If name is being updated, check for duplicates
  if (dto.name && dto.name !== service.name) {
    const existing = await Service.findOne({
      name: dto.name,
      department: dto.department || service.department,
      _id: { $ne: id },
    });

    if (existing) {
      throw new AppError(
        "Service with this name already exists for this department",
        400
      );
    }
  }

  const updated = await Service.findByIdAndUpdate(id, dto, {
    new: true,
    runValidators: true,
  })
    .populate("department", "name")
    .lean();

  return updated;
};

/* soft delete */
const deleteService = async (id) => {
  const service = await Service.findById(id);

  if (!service || service.isActive === false) {
    throw new AppError("Service not found", 404);
  }

  await Service.findByIdAndUpdate(id, { isActive: false });

  return { id, message: "Service deactivated successfully" };
};

/* restore */
const restoreService = async (id) => {
  const service = await Service.findById(id);

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  if (service.isActive === true) {
    throw new AppError("Service is already active", 400);
  }

  await Service.findByIdAndUpdate(id, { isActive: true });

  return { id, message: "Service restored successfully" };
};

/* permanent delete */
const permanentDeleteService = async (id) => {
  const service = await Service.findById(id);
  if (!service) throw new AppError("Service not found", 404);
  await service.deleteOne();
  return { id, message: "Service permanently deleted" };
};

/* get services by department */
const getServicesByDepartment = async (departmentId) => {
  return Service.find({
    department: departmentId,
    isActive: true,
  })
    .populate("department", "name")
    .select(projection)
    .sort({ name: 1 })
    .lean();
};

/* bulk delete */
const bulkDelete = async (ids) => {
  const result = await Service.updateMany(
    { _id: { $in: ids } },
    { isActive: false }
  );

  if (!result.matchedCount) {
    throw new AppError("No records found", 404);
  }

  return result;
};

module.exports = {
  listServices,
  listAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  restoreService,
  permanentDeleteService,
  getServicesByDepartment,
  bulkDelete,
};
