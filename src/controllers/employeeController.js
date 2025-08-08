const asyncHandler = require("express-async-handler");
const Employee = require("../models/Employee");
const Department = require("../models/Departments");
const Position = require("../models/Position");
const Skill = require("../models/Skill");

// Helper function to validate departments exist
const validateDepartments = async (departmentIds) => {
  const departments = await Department.find({
    _id: { $in: departmentIds },
    isActive: true,
  });
  if (departments.length !== departmentIds.length) {
    throw new Error("One or more departments not found or inactive");
  }
  return departments;
};

// Helper function to validate Positions and their department associations
const validatePositions = async (Positions, departmentIds) => {
  const PositionIds = Positions.map((r) => r.Position);
  const PositionObjects = await Position.find({
    _id: { $in: PositionIds },
    isActive: true,
  });

  if (PositionObjects.length !== PositionIds.length) {
    throw new Error("One or more Positions not found or inactive");
  }

  // Validate that each Position belongs to one of the selected departments
  for (const PositionObj of PositionObjects) {
    if (!departmentIds.includes(PositionObj.department)) {
      throw new Error(
        `Position "${PositionObj.name}" is not available in the selected departments`
      );
    }
  }

  return PositionObjects;
};

// Helper function to validate skills
const validateSkills = async (skills) => {
  const skillIds = skills.map((s) => s.skill);
  const skillObjects = await Skill.find({
    _id: { $in: skillIds },
    isActive: true,
  });

  if (skillObjects.length !== skillIds.length) {
    throw new Error("One or more skills not found or inactive");
  }

  return skillObjects;
};

// @desc    Get all employees with advanced filtering
const getEmployees = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    department,
    Position,
    skill,
    search,
    availability,
    employeeType,
  } = req.query;

  const filter = { isActive: true };

  if (department) filter.departments = { $in: [department] };
  if (Position) filter["Positions.Position"] = { $in: [Position] };
  if (skill) filter["skills.skill"] = { $in: [skill] };
  if (availability) filter.availability = availability;
  if (employeeType) filter.employeeType = employeeType;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("departments", "name")
      .populate("Positions.Position", "name")
      .populate("skills.skill", "name category"),
    Employee.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: employees.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: employees,
  });
});

// @desc    Get single employee
const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate("departments", "name description")
    .populate("Positions.Position", "name description level")
    .populate("skills.skill", "name category level")
    .populate("manager", "name email");

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found",
    });
  }

  res.json({
    success: true,
    data: employee,
  });
});

// @desc    Create employee with comprehensive validation
const createEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phones,
    departments,
    Positions,
    skills,
    availability,
    employeeType,
    location,
    manager,
  } = req.body;

  // Validate required fields
  if (!name || !email || !departments || !Positions || !skills) {
    return res.status(400).json({
      success: false,
      message: "Name, email, departments, Positions, and skills are required",
    });
  }

  // Check if email already exists
  if (await Employee.findOne({ email: email.toLowerCase() })) {
    return res.status(400).json({
      success: false,
      message: "Email already exists",
    });
  }

  try {
    // Validate departments
    const validDepartments = await validateDepartments(departments);

    // Validate Positions and their department associations
    const validPositions = await validatePositions(Positions, departments);

    // Validate skills
    const validSkills = await validateSkills(skills);

    // Validate manager if provided
    let managerEmployee = null;
    if (manager) {
      managerEmployee = await Employee.findById(manager);
      if (!managerEmployee) {
        return res.status(400).json({
          success: false,
          message: "Manager not found",
        });
      }
    }

    // Ensure only one primary Position
    const primaryPositions = Positions.filter((r) => r.isPrimary);
    if (primaryPositions.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Only one primary Position is allowed",
      });
    }

    // If no primary Position specified, make the first one primary
    if (primaryPositions.length === 0 && Positions.length > 0) {
      Positions[0].isPrimary = true;
    }

    const employee = await Employee.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phones: phones || [],
      departments,
      Positions: Positions.map((r) => ({
        Position: r.Position,
        isPrimary: r.isPrimary || false,
        startDate: r.startDate || new Date(),
      })),
      skills: skills.map((s) => ({
        skill: s.skill,
        proficiencyLevel: s.proficiencyLevel || "intermediate",
        verified: s.verified || false,
        verifiedBy: s.verifiedBy || null,
      })),
      availability: availability || "available",
      employeeType: employeeType || "full_time",
      location: location || "",
      manager: manager || null,
    });

    // Populate the created employee for response
    const populatedEmployee = await Employee.findById(employee._id)
      .populate("departments", "name")
      .populate("Positions.Position", "name level")
      .populate("skills.skill", "name category")
      .populate("manager", "name email");

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: populatedEmployee,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Update employee
const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const employee = await Employee.findById(id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found",
    });
  }

  try {
    // Validate departments if being updated
    if (updateData.departments) {
      await validateDepartments(updateData.departments);
    }

    // Validate Positions if being updated
    if (updateData.Positions) {
      const targetDepartments = updateData.departments || employee.departments;
      await validatePositions(updateData.Positions, targetDepartments);

      // Ensure only one primary Position
      const primaryPositions = updateData.Positions.filter((r) => r.isPrimary);
      if (primaryPositions.length > 1) {
        return res.status(400).json({
          success: false,
          message: "Only one primary Position is allowed",
        });
      }
    }

    // Validate skills if being updated
    if (updateData.skills) {
      await validateSkills(updateData.skills);
    }

    // Validate manager if being updated

    // Update email validation
    if (updateData.email && updateData.email !== employee.email) {
      const existingEmployee = await Employee.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("departments", "name")
      .populate("Positions.Position", "name level")
      .populate("skills.skill", "name category");

    res.json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Delete employee (soft delete)
const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found",
    });
  }

  // Soft delete by setting isActive to false
  employee.isActive = false;
  await employee.save();

  res.json({
    success: true,
    message: "Employee deactivated successfully",
  });
});

// @desc    Get employees by department
const getEmployeesByDepartment = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Validate department exists
  const department = await Department.findById(departmentId);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  const [employees, total] = await Promise.all([
    Employee.find({
      departments: { $in: [departmentId] },
      isActive: true,
    })
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("Positions.Position", "name")
      .populate("skills.skill", "name"),
    Employee.countDocuments({
      departments: { $in: [departmentId] },
      isActive: true,
    }),
  ]);

  res.json({
    success: true,
    count: employees.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: employees,
  });
});

// @desc    Get available options for employee creation
const getEmployeeOptions = asyncHandler(async (req, res) => {
  const [departments, Positions, skills] = await Promise.all([
    Department.find({ isActive: true })
      .select("_id name description")
      .sort({ name: 1 }),
    Position.find({ isActive: true })
      .select("_id name description department level")
      .populate("department", "name")
      .sort({ name: 1 }),
    Skill.find({ isActive: true })
      .select("_id name description category level")
      .sort({ name: 1 }),
  ]);

  res.json({
    success: true,
    data: {
      departments: departments.map((dept) => ({
        id: dept._id,
        name: dept.name,
        description: dept.description,
      })),
      Positions: Positions.map((Position) => ({
        id: Position._id,
        name: Position.name,
        description: Position.description,
        department: {
          id: Position.department._id,
          name: Position.department.name,
        },
        level: Position.level,
      })),
      skills: skills.map((skill, idx) => ({
        id: skill._id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        level: skill.level,
        isPrimary: idx === 0 ? true : false,
      })),
    },
  });
});

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByDepartment,
  getEmployeeOptions,
};
