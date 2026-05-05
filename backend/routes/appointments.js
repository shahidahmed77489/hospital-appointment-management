const express = require("express");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const https = require("https");

const router = express.Router();
const currency = "INR";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
const bookingWindowMessage =
  "Appointment date must be between today and the next 5 days";

const isDateInBookingWindow = (dateValue) => {
  const selected = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 5);
  return selected >= today && selected <= maxDate;
};

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

// Generate appointment number
const generateAppointmentNo = () => {
  const date = new Date();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `APT${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}${random}`;
};

const ensurePaymentColumns = async () => {
  const [columns] = await pool.query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments'
    `,
  );
  const existing = new Set(columns.map((column) => column.COLUMN_NAME));
  const additions = [
    [
      "payment_status",
      "ALTER TABLE appointments ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending'",
    ],
    [
      "payment_amount",
      "ALTER TABLE appointments ADD COLUMN payment_amount DECIMAL(10,2) DEFAULT 0",
    ],
    [
      "razorpay_order_id",
      "ALTER TABLE appointments ADD COLUMN razorpay_order_id VARCHAR(100)",
    ],
    [
      "razorpay_payment_id",
      "ALTER TABLE appointments ADD COLUMN razorpay_payment_id VARCHAR(100)",
    ],
  ];

  for (const [column, sql] of additions) {
    if (!existing.has(column)) {
      await pool.query(sql);
    }
  }
};

const createRazorpayOrder = ({ amount, receipt }) =>
  new Promise((resolve, reject) => {
    if (!razorpayKeyId || !razorpayKeySecret) {
      reject(new Error("Razorpay credentials are not configured"));
      return;
    }

    const payload = JSON.stringify({
      amount,
      currency,
      receipt,
      payment_capture: 1,
    });
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString(
      "base64",
    );

    const request = https.request(
      {
        hostname: "api.razorpay.com",
        path: "/v1/orders",
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          const data = JSON.parse(body || "{}");
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data);
          } else {
            reject(
              new Error(data.error?.description || "Unable to create payment order"),
            );
          }
        });
      },
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
};

router.get("/payment-config", (req, res) => {
  if (!razorpayKeyId) {
    return res.status(500).json({ message: "Razorpay key is not configured" });
  }
  res.json({ key: razorpayKeyId, currency });
});

router.post("/payment-order", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can create appointment payments" });
    }

    const { doctor_id, appointment_date, appointment_time } = req.body;
    if (!isDateInBookingWindow(appointment_date)) {
      return res.status(400).json({ message: bookingWindowMessage });
    }

    const [doctors] = await pool.query(
      `
        SELECT d.id, d.consultation_fee, u.name
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ?
      `,
      [doctor_id],
    );

    if (doctors.length === 0) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const [existing] = await pool.query(
      "SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status NOT IN ('cancelled', 'rejected')",
      [doctor_id, appointment_date, appointment_time],
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    const amount = Math.round(Number(doctors[0].consultation_fee || 0) * 100);
    if (amount <= 0) {
      return res.status(400).json({ message: "Doctor fee is not configured" });
    }

    const order = await createRazorpayOrder({
      amount,
      receipt: `appt_${Date.now()}`,
    });

    res.json({
      key: razorpayKeyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      doctorName: doctors[0].name,
      consultationFee: Number(doctors[0].consultation_fee),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create appointment (patient)
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can book appointments" });
    }

    return res.status(400).json({
      message: "Payment is required before booking an appointment",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify payment and create appointment (patient)
router.post("/verify-payment", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can book appointments" });
    }

    await ensurePaymentColumns();

    const {
      doctor_id,
      department_id,
      appointment_date,
      appointment_time,
      problem_description,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!isDateInBookingWindow(appointment_date)) {
      return res.status(400).json({ message: bookingWindowMessage });
    }

    if (
      !verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      })
    ) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Get patient ID
    const [patients] = await pool.query(
      "SELECT id FROM patients WHERE user_id = ?",
      [req.user.id],
    );
    if (patients.length === 0) {
      return res.status(404).json({ message: "Patient profile not found" });
    }
    const patientId = patients[0].id;

    // Check if slot is available
    const [existing] = await pool.query(
      "SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status NOT IN ('cancelled', 'rejected')",
      [doctor_id, appointment_date, appointment_time],
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    const [doctors] = await pool.query(
      "SELECT consultation_fee FROM doctors WHERE id = ?",
      [doctor_id],
    );
    if (doctors.length === 0) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const appointmentNo = generateAppointmentNo();
    const paymentAmount = Number(doctors[0].consultation_fee || 0);

    const [result] = await pool.query(
      `INSERT INTO appointments (
        appointment_no, patient_id, doctor_id, department_id,
        appointment_date, appointment_time, problem_description,
        payment_status, payment_amount, razorpay_order_id, razorpay_payment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?)`,
      [
        appointmentNo,
        patientId,
        doctor_id,
        department_id,
        appointment_date,
        appointment_time,
        problem_description,
        paymentAmount,
        razorpay_order_id,
        razorpay_payment_id,
      ],
    );

    res
      .status(201)
      .json({
        message: "Appointment booked successfully",
        appointmentId: result.insertId,
        appointmentNo,
        paymentAmount,
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my appointments (based on role)
router.get("/my-appointments", verifyToken, async (req, res) => {
  try {
    await ensurePaymentColumns();

    let query = "";
    let params = [];

    if (req.user.role === "patient") {
      const [patients] = await pool.query(
        "SELECT id FROM patients WHERE user_id = ?",
        [req.user.id],
      );
      if (patients.length === 0) {
        return res.json([]);
      }
      query = `
        SELECT a.*, DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
               d.specialization, u.name as doctor_name, dep.department_name
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        JOIN departments dep ON a.department_id = dep.id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `;
      params = [patients[0].id];
    } else if (req.user.role === "doctor") {
      const [doctors] = await pool.query(
        "SELECT id FROM doctors WHERE user_id = ?",
        [req.user.id],
      );
      if (doctors.length === 0) {
        return res.json([]);
      }
      query = `
        SELECT a.*, DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
               d.specialization, u.name as doctor_name, dep.department_name,
               p.gender, p.age, p.address, usr.name as patient_name, usr.phone as patient_phone
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        JOIN departments dep ON a.department_id = dep.id
        JOIN patients p ON a.patient_id = p.id
        JOIN users usr ON p.user_id = usr.id
        WHERE a.doctor_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `;
      params = [doctors[0].id];
    } else if (req.user.role === "admin") {
      query = `
        SELECT a.*, DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
               d.specialization, u.name as doctor_name, dep.department_name,
               p.gender, p.age, usr.name as patient_name, usr.phone as patient_phone
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        JOIN departments dep ON a.department_id = dep.id
        JOIN patients p ON a.patient_id = p.id
        JOIN users usr ON p.user_id = usr.id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `;
    }

    const [appointments] = await pool.query(query, params);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get dashboard stats (admin/doctor)
router.get("/stats/dashboard", verifyToken, async (req, res) => {
  try {
    await ensurePaymentColumns();

    if (req.user.role === "admin") {
      const [totalDoctors] = await pool.query(
        "SELECT COUNT(*) as count FROM doctors",
      );
      const [totalPatients] = await pool.query(
        "SELECT COUNT(*) as count FROM patients",
      );
      const [totalAppointments] = await pool.query(
        "SELECT COUNT(*) as count FROM appointments",
      );
      const [pendingAppointments] = await pool.query(
        "SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'",
      );
      const [revenue] = await pool.query(
        "SELECT COALESCE(SUM(payment_amount), 0) as total FROM appointments WHERE payment_status = 'paid'",
      );

      res.json({
        totalDoctors: totalDoctors[0].count,
        totalPatients: totalPatients[0].count,
        totalAppointments: totalAppointments[0].count,
        pendingAppointments: pendingAppointments[0].count,
        totalRevenue: Number(revenue[0].total || 0),
      });
    } else if (req.user.role === "doctor") {
      const [doctors] = await pool.query(
        "SELECT id FROM doctors WHERE user_id = ?",
        [req.user.id],
      );
      if (doctors.length === 0) {
        return res.json({ today: 0, pending: 0, completed: 0 });
      }
      const doctorId = doctors[0].id;

      const [today] = await pool.query(
        "SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND appointment_date = CURDATE() AND status NOT IN ('cancelled', 'rejected')",
        [doctorId],
      );
      const [pending] = await pool.query(
        "SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND status = 'pending'",
        [doctorId],
      );
      const [completed] = await pool.query(
        "SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND status = 'completed'",
        [doctorId],
      );
      const [revenue] = await pool.query(
        "SELECT COALESCE(SUM(payment_amount), 0) as total FROM appointments WHERE doctor_id = ? AND payment_status = 'paid'",
        [doctorId],
      );

      res.json({
        today: today[0].count,
        pending: pending[0].count,
        completed: completed[0].count,
        totalRevenue: Number(revenue[0].total || 0),
      });
    } else {
      res.status(403).json({ message: "Access denied" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single appointment
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const [appointments] = await pool.query(
      "SELECT *, DATE_FORMAT(appointment_date, '%Y-%m-%d') as appointment_date FROM appointments WHERE id = ?",
      [req.params.id],
    );
    if (appointments.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json(appointments[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update appointment status (doctor/admin)
router.put("/:id/status", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.body;
    const validStatuses = [
      "pending",
      "approved",
      "rejected",
      "cancelled",
      "completed",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await pool.query("UPDATE appointments SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);

    res.json({ message: "Appointment status updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel appointment (patient can cancel their own)
router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const [appointments] = await pool.query(
      "SELECT a.*, p.user_id as patient_user_id FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE a.id = ?",
      [req.params.id],
    );

    if (appointments.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const appointment = appointments[0];

    if (
      appointment.patient_user_id !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (appointment.status === "completed") {
      return res
        .status(400)
        .json({ message: "Cannot cancel completed appointment" });
    }

    await pool.query(
      "UPDATE appointments SET status = 'cancelled' WHERE id = ?",
      [req.params.id],
    );

    res.json({ message: "Appointment cancelled" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
