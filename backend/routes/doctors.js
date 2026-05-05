const express = require("express");
const bcrypt = require("bcryptjs");
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

// Get all doctors (public)
router.get("/", async (req, res) => {
  try {
    const [doctors] = await pool.query(`
      SELECT d.id, d.specialization, d.qualification, d.experience, 
             d.consultation_fee, d.available_status,
             u.name, u.email, u.phone, d.department_id, dep.department_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN departments dep ON d.department_id = dep.id
      WHERE u.status = 'active'
      ORDER BY u.name
    `);
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get doctors by department
router.get("/department/:departmentId", async (req, res) => {
  try {
    const [doctors] = await pool.query(
      `
      SELECT d.id, d.specialization, d.qualification, d.experience, 
             d.consultation_fee, d.available_status,
             u.name, u.email, u.phone, d.department_id, dep.department_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN departments dep ON d.department_id = dep.id
      WHERE d.department_id = ? AND u.status = 'active'
      ORDER BY u.name
    `,
      [req.params.departmentId],
    );
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single doctor
router.get("/:id", async (req, res) => {
  try {
    const [doctors] = await pool.query(
      `
      SELECT d.*, u.name, u.email, u.phone
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `,
      [req.params.id],
    );
    if (doctors.length === 0) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.json(doctors[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create doctor (admin only)
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      department_id,
      specialization,
      qualification,
      experience,
      consultation_fee,
    } = req.body;

    // Check if user exists
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
      "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'doctor', ?)",
      [name, email, hashedPassword, phone],
    );

    const userId = userResult.insertId;

    // Insert doctor
    const [doctorResult] = await pool.query(
      "INSERT INTO doctors (user_id, department_id, specialization, qualification, experience, consultation_fee) VALUES (?, ?, ?, ?, ?, ?)",
      [
        userId,
        department_id,
        specialization,
        qualification,
        experience,
        consultation_fee,
      ],
    );

    res
      .status(201)
      .json({
        message: "Doctor created successfully",
        doctorId: doctorResult.insertId,
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update doctor (admin only)
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const {
      department_id,
      specialization,
      qualification,
      experience,
      consultation_fee,
      available_status,
    } = req.body;
    await pool.query(
      "UPDATE doctors SET department_id = ?, specialization = ?, qualification = ?, experience = ?, consultation_fee = ?, available_status = ? WHERE id = ?",
      [
        department_id,
        specialization,
        qualification,
        experience,
        consultation_fee,
        available_status,
        req.params.id,
      ],
    );
    res.json({ message: "Doctor updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete doctor (admin only)
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const [doctors] = await pool.query(
      "SELECT user_id FROM doctors WHERE id = ?",
      [req.params.id],
    );
    if (doctors.length === 0) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    await pool.query("DELETE FROM doctors WHERE id = ?", [req.params.id]);
    await pool.query("DELETE FROM users WHERE id = ?", [doctors[0].user_id]);

    res.json({ message: "Doctor deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
