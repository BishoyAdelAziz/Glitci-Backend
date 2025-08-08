const asyncHandler = require("express-async-handler");
const Client = require("../models/Client");
const User = require("../models/User");

// @desc    Get all clients with pagination
// @route   GET /api/clients
// @access  Private
const getClients = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    Client.find({ isActive: true })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Client.countDocuments({ isActive: true }),
  ]);

  res.json({
    success: true,
    count: clients.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: clients,
  });
});

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
const getClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  res.json({
    success: true,
    data: client,
  });
});

// @desc    Create new client
// @route   POST /api/clients
// @access  Private (Manager/Admin)
const createClient = asyncHandler(async (req, res) => {
  const { name, email, password, ...restOfBody } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "client",
  });

  if (!user) {
    res.status(400);
    throw new Error("Failed to create user for the client");
  }

  const client = await Client.create({
    ...restOfBody,
    user: user._id,
  });

  res.status(201).json({
    success: true,
    data: client,
  });
});

// @desc    Update client
// @route   PATCH /api/clients/:id
// @access  Private (Manager/Admin)
const updateClient = asyncHandler(async (req, res) => {
  const { name, email, ...updateData } = req.body;

  const client = await Client.findById(req.params.id);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  if (name || email) {
    const user = await User.findById(client.user);
    if (!user) {
      res.status(404);
      throw new Error("Associated user not found for this client");
    }
    if (name) user.name = name;
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        res.status(400);
        throw new Error("Email is already in use");
      }
      user.email = email;
    }
    await user.save();
  }

  const updatedClient = await Client.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate("user", "name email");

  res.json({
    success: true,
    data: updatedClient,
  });
});

// @desc    Delete client (soft delete)
// @route   DELETE /api/clients/:id
// @access  Private (Manager/Admin)
const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  client.isActive = false;
  await client.save();

  // Also deactivate the associated user
  await User.findByIdAndUpdate(client.user, { isActive: false });

  res.json({
    success: true,
    message: "Client deactivated successfully",
  });
});

module.exports = {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
};
