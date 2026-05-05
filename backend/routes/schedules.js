const express = require("express");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const router = express.Router();

const getDoctorIdForUser = async (userId) => {
  const [doctors] = await pool.query("SELECT id FROM doctors WHERE user_id = ?", [
    userId,
  ]);
  return doctors[0]?.id || null;
};

const isDateInBookingWindow = (dateValue) => {
  const selected = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 5);
  return selected >= today && selected <= maxDate;
};

const bookingWindowMessage =
  "Date must be between today and the next 5 days";

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "hospital_secret_key",
    );
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Get schedules for a doctor
router.get("/doctor/:doctorId", async (req, res) => {
  try {
    const [schedules] = await pool.query(
      "SELECT id, doctor_id, DATE_FORMAT(available_date, '%Y-%m-%d') as available_date, start_time, end_time, slot_duration, status, created_at FROM doctor_schedules WHERE doctor_id = ? AND status = 'active' ORDER BY available_date, start_time",
      [req.params.doctorId],
    );
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available slots for a doctor on a specific date
router.get("/available-slots/:doctorId/:date", async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    if (!isDateInBookingWindow(date)) {
      return res.status(400).json({ message: bookingWindowMessage });
    }

    // Get doctor's schedule for the date
    const [schedules] = await pool.query(
      "SELECT id, doctor_id, DATE_FORMAT(available_date, '%Y-%m-%d') as available_date, start_time, end_time, slot_duration, status, created_at FROM doctor_schedules WHERE doctor_id = ? AND available_date = ? AND status = 'active'",
      [doctorId, date],
    );

    const schedule =
      schedules[0] || {
        start_time: "09:00:00",
        end_time: "13:00:00",
        slot_duration: 30,
      };
    const slotDuration = schedule.slot_duration || 30;

    // Get booked appointments for the date
    const [booked] = await pool.query(
      "SELECT appointment_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('cancelled', 'rejected')",
      [doctorId, date],
    );

    const bookedSlots = booked.map((b) =>
      String(b.appointment_time).slice(0, 5),
    );

    // Generate available slots
    const slots = [];
    const startTime = new Date(`2000-01-01 ${schedule.start_time}`);
    const endTime = new Date(`2000-01-01 ${schedule.end_time}`);

    while (startTime < endTime) {
      const timeString = startTime.toTimeString().slice(0, 5);
      if (!bookedSlots.includes(timeString)) {
        slots.push(timeString);
      }
      startTime.setMinutes(startTime.getMinutes() + slotDuration);
    }

    res.json({
      slots,
      message:
        schedules.length === 0
          ? "Default OPD slots shown because no custom schedule exists for this date"
          : "Slots loaded",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create schedule (doctor or admin)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { doctor_id, available_date, start_time, end_time, slot_duration } =
      req.body;

    // Verify doctor or admin
    if (req.user.role !== "admin" && req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isDateInBookingWindow(available_date)) {
      return res.status(400).json({ message: bookingWindowMessage });
    }

    let scheduleDoctorId = doctor_id;
    if (req.user.role === "doctor") {
      scheduleDoctorId = await getDoctorIdForUser(req.user.id);
      if (!scheduleDoctorId) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }
    }

    const [result] = await pool.query(
      "INSERT INTO doctor_schedules (doctor_id, available_date, start_time, end_time, slot_duration) VALUES (?, ?, ?, ?, ?)",
      [scheduleDoctorId, available_date, start_time, end_time, slot_duration || 30],
    );

    res.status(201).json({ message: "Schedule created", id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update schedule
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { available_date, start_time, end_time, slot_duration, status } =
      req.body;

    if (req.user.role !== "admin" && req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isDateInBookingWindow(available_date)) {
      return res.status(400).json({ message: bookingWindowMessage });
    }

    if (req.user.role === "doctor") {
      const doctorId = await getDoctorIdForUser(req.user.id);
      const [schedules] = await pool.query(
        "SELECT id FROM doctor_schedules WHERE id = ? AND doctor_id = ?",
        [req.params.id, doctorId],
      );
      if (schedules.length === 0) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    await pool.query(
      "UPDATE doctor_schedules SET available_date = ?, start_time = ?, end_time = ?, slot_duration = ?, status = ? WHERE id = ?",
      [
        available_date,
        start_time,
        end_time,
        slot_duration,
        status,
        req.params.id,
      ],
    );
    res.json({ message: "Schedule updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete schedule
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (req.user.role === "doctor") {
      const doctorId = await getDoctorIdForUser(req.user.id);
      const [schedules] = await pool.query(
        "SELECT id FROM doctor_schedules WHERE id = ? AND doctor_id = ?",
        [req.params.id, doctorId],
      );
      if (schedules.length === 0) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    await pool.query("DELETE FROM doctor_schedules WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "Schedule deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
