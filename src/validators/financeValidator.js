const Joi = require("joi");

const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

// Base financial record schema
const baseFinancialRecordSchema = Joi.object({
  amount: Joi.string().required(),
  description: Joi.string().trim().max(500).allow(""),
  category: Joi.string()
    .valid(
      "client_payment",
      "employee_salary",
      "employee_bonus",
      "equipment",
      "software",
      "rent",
      "utilities",
      "marketing",
      "travel",
      "office_supplies",
      "other"
    )
    .required(),
  paymentMethod: Joi.string()
    .valid("cash", "bank_transfer", "check", "credit_card", "other")
    .default("bank_transfer"),
  date: Joi.date().default(Date.now),
  referenceNumber: Joi.string().trim().allow(""),
  status: Joi.string()
    .valid("pending", "completed", "cancelled", "reconciled")
    .default("completed"),
  notes: Joi.string().trim().max(1000).allow(""),
  receiptUrl: Joi.string().uri().allow(""),
});

// Client installment validator
exports.addClientInstallment = baseFinancialRecordSchema.keys({
  client: mongoId.required(),
  project: mongoId.optional(),
  category: Joi.string()
    .valid("client_payment", "other")
    .default("client_payment"),
});

// Employee payment validator
exports.addEmployeePayment = baseFinancialRecordSchema.keys({
  employee: mongoId.required(),
  project: mongoId.optional(),
  category: Joi.string()
    .valid("employee_salary", "employee_bonus", "other")
    .default("employee_salary"),
});

// Expense validator
exports.addExpense = baseFinancialRecordSchema.keys({
  category: Joi.string()
    .valid(
      "equipment",
      "software",
      "rent",
      "utilities",
      "marketing",
      "travel",
      "office_supplies",
      "other"
    )
    .required(),
  project: mongoId.optional(),
});

// Update financial record
exports.updateFinancialRecord = baseFinancialRecordSchema.fork(
  [
    "amount",
    "description",
    "category",
    "paymentMethod",
    "date",
    "referenceNumber",
    "status",
    "notes",
    "receiptUrl",
  ],
  (schema) => schema.optional()
);

// Finance report query validator
exports.financeReportQuery = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  recordType: Joi.string()
    .valid(
      "client_installment",
      "employee_payment",
      "expense",
      "revenue",
      "other"
    )
    .optional(),
  category: Joi.string().optional(),
  client: mongoId.optional(),
  employee: mongoId.optional(),
  project: mongoId.optional(),
  paymentMethod: Joi.string().optional(),
  status: Joi.string().optional(),
});

// List financial records query
exports.listFinancialRecordsQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  skip: Joi.number().integer().min(0).optional(),
  recordType: Joi.string()
    .valid(
      "client_installment",
      "employee_payment",
      "expense",
      "revenue",
      "other"
    )
    .optional(),
  category: Joi.string().optional(),
  client: mongoId.optional(),
  employee: mongoId.optional(),
  project: mongoId.optional(),
  paymentMethod: Joi.string().optional(),
  status: Joi.string().optional(),
  search: Joi.string().trim().min(1).max(100).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
}).unknown(true);
