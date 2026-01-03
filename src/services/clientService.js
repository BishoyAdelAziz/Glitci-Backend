const Client = require("../models/Client");
const AppError = require("../utils/AppError");

/* helpers */
const projection = "-__v";

/* list active clients - EXACT SAME PATTERN AS EMPLOYEE */
const listClients = async (filters, { skip, limit }) => {
  const q = { isActive: true };

  // Add industry filter if provided
  if (filters.industry) {
    q.industry = { $regex: filters.industry, $options: "i" };
  }

  // Handle sequential search
  if (filters.search) {
    const searchTerm = filters.search.trim();

    // 1. First try to find by name
    const nameQuery = { ...q, name: { $regex: searchTerm, $options: "i" } };
    const nameResults = await Client.find(nameQuery)
      .select(projection)
      .sort({ name: 1 })
      .lean();

    if (nameResults.length > 0) {
      // Apply pagination to name results
      const paginatedResults = nameResults.slice(skip, skip + limit);
      return {
        data: paginatedResults,
        count: nameResults.length,
        searchType: "name",
      };
    }

    // 2. If no name results, search by company name
    q.companyName = { $regex: searchTerm, $options: "i" };
  }

  const [data, count] = await Promise.all([
    Client.find(q)
      .select(projection)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .lean(),
    Client.countDocuments(q),
  ]);

  return {
    data,
    count,
    searchType: filters.search ? "company" : "none",
  };
};

/* list all clients (including inactive) - SEQUENTIAL SEARCH VERSION */
const listAllClients = async (filters, { skip, limit }) => {
  const q = {};

  if (filters.industry) {
    q.industry = { $regex: filters.industry, $options: "i" };
  }

  if (filters.isActive !== undefined) {
    q.isActive = filters.isActive;
  }

  // Handle sequential search
  if (filters.search) {
    const searchTerm = filters.search.trim();

    // 1. First try to find by name
    const nameQuery = { ...q, name: { $regex: searchTerm, $options: "i" } };
    const nameResults = await Client.find(nameQuery)
      .select(projection)
      .sort({ name: 1 })
      .lean();

    if (nameResults.length > 0) {
      // Apply pagination to name results
      const paginatedResults = nameResults.slice(skip, skip + limit);
      return {
        data: paginatedResults,
        count: nameResults.length,
        searchType: "name",
      };
    }

    // 2. If no name results, search by company name
    q.companyName = { $regex: searchTerm, $options: "i" };
  }

  const [data, count] = await Promise.all([
    Client.find(q)
      .select(projection)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .lean(),
    Client.countDocuments(q),
  ]);

  return {
    data,
    count,
    searchType: filters.search ? "company" : "none",
  };
};

/* single - SAME PATTERN AS EMPLOYEE */
const getClientById = async (id) => {
  const client = await Client.findById(id).select(projection).lean();

  // Check if client exists AND is active - SAME AS EMPLOYEE
  if (!client || client.isActive === false) {
    throw new AppError("Client not found", 404);
  }
  return client;
};

/* create - SIMPLIFIED LIKE EMPLOYEE */
const createClient = async (dto) => {
  const client = await Client.create({
    ...dto,
    isActive: true, // Explicitly set to true like employee
  });

  return client.toObject();
};

/* update - SIMPLIFIED */
const updateClient = async (id, dto) => {
  const client = await Client.findById(id);

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  const updated = await Client.findByIdAndUpdate(id, dto, {
    new: true,
    runValidators: true,
  })
    .select(projection)
    .lean();

  return updated;
};

/* soft delete - SAME AS EMPLOYEE */
const deleteClient = async (id) => {
  const client = await Client.findById(id);

  // Check if client exists AND is active - SAME AS EMPLOYEE
  if (!client || client.isActive === false) {
    throw new AppError("Client not found", 404);
  }

  await Client.findByIdAndUpdate(id, { isActive: false });

  return { id, message: "Client deactivated successfully" };
};

/* restore - SAME AS EMPLOYEE */
const restoreClient = async (id) => {
  const client = await Client.findById(id);

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  if (client.isActive === true) {
    throw new AppError("Client is already active", 400);
  }

  await Client.findByIdAndUpdate(id, { isActive: true });

  return { id, message: "Client restored successfully" };
};

/* permanent delete - SAME AS EMPLOYEE */
const permanentDeleteClient = async (id) => {
  const client = await Client.findById(id);
  if (!client) throw new AppError("Client not found", 404);
  await client.deleteOne();
  return { id, message: "Client permanently deleted" };
};

/* get clients by industry (optional - similar to employees by department) */
const getClientsByIndustry = async (industry, { skip, limit }) => {
  const q = {
    isActive: true,
    industry: { $regex: industry, $options: "i" },
  };

  const [data, count] = await Promise.all([
    Client.find(q)
      .select(projection)
      .skip(skip)
      .limit(limit)
      .sort({ companyName: 1 })
      .lean(),
    Client.countDocuments(q),
  ]);

  return { data, count };
};

/* bulk delete - SAME AS EMPLOYEE */
const bulkDelete = async (ids) => {
  const result = await Client.updateMany(
    { _id: { $in: ids } },
    { isActive: false }
  );

  if (!result.matchedCount) {
    throw new AppError("No records found", 404);
  }

  return result;
};

module.exports = {
  listClients,
  listAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  restoreClient,
  permanentDeleteClient,
  getClientsByIndustry,
  bulkDelete,
};
