const express = require("express");
const {
  register,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
  getCurrentUser,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const {
  validateRegister,
  validateLogin,
  validateChangePassword,
} = require("../middleware/validation");

const router = express.Router();
router.get("/me", protect, getCurrentUser);
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.patch(
  "/change-password",
  protect,
  validateChangePassword,
  changePassword
);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:resettoken", resetPassword);
router.post("/refresh", refreshAccessToken);
router.post("/logout", protect, logout);

module.exports = router;
