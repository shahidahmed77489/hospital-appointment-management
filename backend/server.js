const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const pool = require("./config/db");

// Import routes
const authRoutes = require("./routes/auth");
const departmentRoutes = require("./routes/departments");
const doctorRoutes = require("./routes/doctors");
const scheduleRoutes = require("./routes/schedules");
const appointmentRoutes = require("./routes/appointments");
const patientRoutes = require("./routes/patients");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/patients", patientRoutes);

// Test database connection
app.get("/api/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({ status: "ok", message: "Database connected" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Hospital Appointment System API");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
