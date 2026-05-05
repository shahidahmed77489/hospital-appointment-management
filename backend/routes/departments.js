const express = require("express");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "hospital_secret_key",
    );
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Get all departments (public)
router.get("/", async (req, res) => {
  try {
    const [departments] = await pool.query(
      "SELECT * FROM departments WHERE status = 'active' ORDER BY department_name",
    );
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single department
router.get("/:id", async (req, res) => {
  try {
    const [departments] = await pool.query(
      "SELECT * FROM departments WHERE id = ?",
      [req.params.id],
    );
    if (departments.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }
    res.json(departments[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create department (admin only)
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { department_name, description } = req.body;
    const [result] = await pool.query(
      "INSERT INTO departments (department_name, description) VALUES (?, ?)",
      [department_name, description],
    );
    res
      .status(201)
      .json({ message: "Department created", id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update department (admin only)
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { department_name, description, status } = req.body;
    await pool.query(
      "UPDATE departments SET department_name = ?, description = ?, status = ? WHERE id = ?",
      [department_name, description, status, req.params.id],
    );
    res.json({ message: "Department updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete department (admin only)
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM departments WHERE id = ?", [req.params.id]);
    res.json({ message: "Department deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
