const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

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

router.get("/", verifyAdmin, async (req, res) => {
  try {
    const [patients] = await pool.query(`
      SELECT p.id, p.gender, p.age, p.address, p.blood_group,
             u.name, u.email, u.phone, u.status, u.created_at
      FROM patients p
      JOIN users u ON p.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
