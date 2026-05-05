const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

// Register new user (patient)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, gender, age, address, blood_group } =
      req.body;

    // Check if user already exists
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [userResult] = await pool.query(
      "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'patient', ?)",
      [name, email, hashedPassword, phone],
    );

    const userId = userResult.insertId;

    // Insert patient details
    await pool.query(
      "INSERT INTO patients (user_id, gender, age, address, blood_group) VALUES (?, ?, ?, ?, ?)",
      [userId, gender, age, address, blood_group],
    );

    res
      .status(201)
      .json({ message: "Patient registered successfully", userId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (user.status === "inactive") {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "hospital_secret_key",
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get profile
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "hospital_secret_key",
    );
    const [users] = await pool.query(
      "SELECT id, name, email, role, phone FROM users WHERE id = ?",
      [decoded.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Logout (client-side token removal, just return success)
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
