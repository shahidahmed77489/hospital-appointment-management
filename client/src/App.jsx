import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import Swal from "sweetalert2";
import "./App.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api`;
const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayDate = formatDateInput(new Date());
const maxBookingDate = formatDateInput(
  new Date(new Date().setDate(new Date().getDate() + 5)),
);

const isDateInBookingWindow = (date) =>
  date >= todayDate && date <= maxBookingDate;

const emptyLogin = { email: "admin@hospital.com", password: "password123" };
const emptyRegister = {
  name: "",
  email: "",
  password: "",
  phone: "",
  gender: "female",
  age: "",
  address: "",
  blood_group: "",
};
const emptyDoctor = {
  name: "",
  email: "",
  password: "password123",
  phone: "",
  department_id: "",
  specialization: "",
  qualification: "",
  experience: "",
  consultation_fee: "",
};

const loadRazorpayCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("razorpay-checkout");
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout";
    script.src = RAZORPAY_CHECKOUT_URL;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Unable to load Razorpay checkout"));
    document.body.appendChild(script);
  });

const reportContents = [
  ["1", "Student's declaration"],
  ["2", "Certificate from Supervisor"],
  ["3", "Content"],
  ["4", "List of Illustrations"],
  ["5", "Abstract"],
  ["6", "Chapter I: Introduction"],
  ["7", "Chapter II: Objectives of the study"],
  ["8", "Chapter III: Problem statement"],
  ["9", "Chapter IV: Methodology"],
  ["10", "Chapter V: Data Analysis and Interpretation"],
  ["11", "Chapter VI: Discussion and Results"],
  ["12", "Chapter VII: Conclusion"],
  ["13", "Chapter VIII: Recommendations and Suggestions"],
  ["14", "Bibliography / References"],
  ["15", "Appendices / Annexures"],
];

const reportChapters = [
  {
    title: "Chapter I: Introduction",
    text: "Rationale of the study, overview of hospital appointment management, organization profile, project scope, and literature review.",
  },
  {
    title: "Chapter II: Objectives of the Study",
    text: "Specific objectives for online appointment booking, role-based dashboards, doctor scheduling, patient records, and appointment status tracking.",
  },
  {
    title: "Chapter III: Problem Statement",
    text: "Manual appointment handling creates delays, slot conflicts, poor visibility, and weak record management. The project solves these issues with a centralized web system.",
  },
  {
    title: "Chapter IV: Methodology",
    text: "Research design, data collection method, system design, React frontend, Express API, MySQL database, JWT authentication, and testing approach.",
  },
  {
    title: "Chapter V: Data Analysis and Interpretation",
    text: "Tables, charts, and findings from modules such as departments, doctors, patients, schedules, and appointment history.",
  },
  {
    title: "Chapter VI: Discussion and Results",
    text: "Evaluation of implemented features, role-wise access, booking flow, dashboard statistics, and operational improvements.",
  },
  {
    title: "Chapter VII: Conclusion",
    text: "Summary of how the Hospital Appointment Management System meets the project objectives and improves appointment workflows.",
  },
  {
    title: "Chapter VIII: Recommendations and Suggestions",
    text: "Future enhancements such as payment integration, SMS alerts, prescription upload, reports export, and teleconsultation support.",
  },
];

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null"),
  );
  const [path, setPath] = useState(window.location.pathname);
  const [activeView, setActiveView] = useState("dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [guestForm, setGuestForm] = useState({
    ...emptyRegister,
    password: "",
  });
  const [showPatientPopup, setShowPatientPopup] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [scheduleDoctorId, setScheduleDoctorId] = useState("");
  const [scheduleDurations, setScheduleDurations] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingProblem, setBookingProblem] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [departmentForm, setDepartmentForm] = useState({
    department_name: "",
    description: "",
  });
  const [doctorForm, setDoctorForm] = useState(emptyDoctor);
  const [scheduleForm, setScheduleForm] = useState({
    doctor_id: "",
    available_date: "",
    start_time: "09:00",
    end_time: "13:00",
    slot_duration: 30,
  });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const visibleDoctors = useMemo(() => {
    if (!selectedDepartment) return doctors;
    return doctors.filter(
      (doctor) => String(doctor.department_id) === String(selectedDepartment),
    );
  }, [doctors, selectedDepartment]);

  const currentDoctor = doctors.find(
    (doctor) => String(doctor.id) === String(selectedDoctor),
  );
  const loggedInDoctor = useMemo(() => {
    if (user?.role !== "doctor") return null;
    return doctors.find((doctor) => doctor.email === user.email) || null;
  }, [doctors, user]);

  useEffect(() => {
    loadPublicData();

    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (token && user) {
      loadPrivateData();
    }
  }, [token, user]);

  useEffect(() => {
    if (
      selectedDoctor &&
      !visibleDoctors.some(
        (doctor) => String(doctor.id) === String(selectedDoctor),
      )
    ) {
      setSelectedDoctor("");
      setSlots([]);
      setSelectedSlot("");
    }
  }, [selectedDoctor, visibleDoctors]);

  const request = async (path, options = {}) => {
    try {
      const response = await axios.request({
        url: `${API_URL}${path}`,
        method: options.method || "GET",
        data: options.body ? JSON.parse(options.body) : undefined,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Request failed");
    }
  };

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const navigate = (nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  const loadPublicData = async () => {
    try {
      const [departmentData, doctorData] = await Promise.all([
        request("/departments"),
        request("/doctors"),
      ]);
      setDepartments(departmentData);
      setDoctors(doctorData);
    } catch (error) {
      flash(error.message);
    }
  };

  const loadPrivateData = async () => {
    try {
      const tasks = [
        request("/appointments/my-appointments", { headers: authHeaders }),
      ];
      if (user.role !== "patient") {
        tasks.push(
          request("/appointments/stats/dashboard", { headers: authHeaders }),
        );
      }
      if (user.role === "admin") {
        tasks.push(request("/patients", { headers: authHeaders }));
      }
      const [appointmentData, statsData, patientData] =
        await Promise.all(tasks);
      setAppointments(appointmentData);
      setStats(statsData || null);
      setPatients(patientData || []);
    } catch (error) {
      flash(error.message);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setActiveView("dashboard");
      navigate("/");
      flash(`Welcome, ${data.user.name}`);
    } catch (error) {
      flash(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await request("/auth/register", {
        method: "POST",
        body: JSON.stringify(registerForm),
      });
      setAuthMode("login");
      setLoginForm({
        email: registerForm.email,
        password: registerForm.password,
      });
      setRegisterForm(emptyRegister);
      flash("Patient registered. You can login now.");
    } catch (error) {
      flash(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setAppointments([]);
    setStats(null);
    setPatients([]);
    setActiveView("dashboard");
    navigate("/");
  };

  const loadSlots = async () => {
    if (!selectedDoctor || !bookingDate) {
      flash("Select doctor and date first.");
      return;
    }
    if (!isDateInBookingWindow(bookingDate)) {
      flash(`Choose a date from ${todayDate} to ${maxBookingDate}.`);
      return;
    }
    try {
      const data = await request(
        `/schedules/available-slots/${selectedDoctor}/${bookingDate}`,
      );
      setSlots(data.slots || []);
      setSelectedSlot("");
      if (!data.slots?.length) flash(data.message || "No slots available.");
    } catch (error) {
      flash(error.message);
    }
  };

  const getAppointmentPayload = () => ({
    doctor_id: currentDoctor.id,
    department_id: currentDoctor.department_id,
    appointment_date: bookingDate,
    appointment_time: selectedSlot,
    problem_description: bookingProblem,
  });

  const saveAppointment = async (
    appointmentToken = token,
    appointmentUser = user,
  ) => {
    const appointmentPayload = getAppointmentPayload();
    const order = await request("/appointments/payment-order", {
      method: "POST",
      headers: { Authorization: `Bearer ${appointmentToken}` },
      body: JSON.stringify(appointmentPayload),
    });

    await loadRazorpayCheckout();

    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "Hospital Appointment System",
        description: `Consultation with ${order.doctorName}`,
        order_id: order.orderId,
        prefill: {
          name: appointmentUser?.name || "",
          email: appointmentUser?.email || "",
        },
        theme: {
          color: "#0f766e",
        },
        method: {
          card: true,
          upi: true,
          netbanking: false,
          wallet: false,
          emi: false,
          paylater: false,
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay by UPI",
                instruments: [{ method: "upi" }],
              },
              card: {
                name: "Pay by Card",
                instruments: [{ method: "card" }],
              },
            },
            sequence: ["block.upi", "block.card"],
            preferences: {
              show_default_blocks: false,
            },
          },
        },
        handler: async (paymentResponse) => {
          try {
            const data = await request("/appointments/verify-payment", {
              method: "POST",
              headers: { Authorization: `Bearer ${appointmentToken}` },
              body: JSON.stringify({
                ...appointmentPayload,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });
            flash(
              `Payment received Rs. ${data.paymentAmount}. Appointment booked: ${data.appointmentNo}`,
            );
            setBookingProblem("");
            setSelectedSlot("");
            setSlots([]);
            setShowPatientPopup(false);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
      });

      checkout.open();
    });
  };

  const bookAppointment = async () => {
    if (!currentDoctor || !bookingDate) {
      flash("Choose a doctor and date.");
      return;
    }
    if (!isDateInBookingWindow(bookingDate)) {
      flash(
        `Appointments are available only from ${todayDate} to ${maxBookingDate}.`,
      );
      return;
    }
    if (!selectedSlot) {
      if (!slots.length) {
        await loadSlots();
      }
      flash("Select one available time slot.");
      return;
    }
    if (!user) {
      setShowPatientPopup(true);
      return;
    }
    try {
      setLoading(true);
      await saveAppointment();
      loadPrivateData();
    } catch (error) {
      flash(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitGuestBooking = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      try {
        await request("/auth/register", {
          method: "POST",
          body: JSON.stringify(guestForm),
        });
      } catch (error) {
        if (!error.message.toLowerCase().includes("email already")) {
          throw error;
        }
      }

      const loginData = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: guestForm.email,
          password: guestForm.password,
        }),
      });

      await saveAppointment(loginData.token, loginData.user);
      localStorage.setItem("token", loginData.token);
      localStorage.setItem("user", JSON.stringify(loginData.user));
      setToken(loginData.token);
      setUser(loginData.user);
      setActiveView("appointments");
      setGuestForm({ ...emptyRegister, password: "" });
    } catch (error) {
      flash(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await request(`/appointments/${id}/status`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      flash("Appointment updated.");
      loadPrivateData();
    } catch (error) {
      flash(error.message);
    }
  };

  const cancelAppointment = async (id) => {
    try {
      await request(`/appointments/${id}/cancel`, {
        method: "PUT",
        headers: authHeaders,
      });
      flash("Appointment cancelled.");
      loadPrivateData();
    } catch (error) {
      flash(error.message);
    }
  };

  const createDepartment = async (event) => {
    event.preventDefault();
    try {
      await request("/departments", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(departmentForm),
      });
      setDepartmentForm({ department_name: "", description: "" });
      flash("Department added.");
      loadPublicData();
    } catch (error) {
      flash(error.message);
    }
  };

  const createDoctor = async (event) => {
    event.preventDefault();
    try {
      await request("/doctors", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(doctorForm),
      });
      setDoctorForm(emptyDoctor);
      flash("Doctor added.");
      loadPublicData();
    } catch (error) {
      flash(error.message);
    }
  };

  const deleteDoctor = async (doctorId) => {
    const result = await Swal.fire({
      title: "Delete doctor?",
      text: "This will remove the doctor and related schedules.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#334155",
      confirmButtonText: "Yes, delete",
    });

    if (!result.isConfirmed) return;

    try {
      await request(`/doctors/${doctorId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      setSelectedDoctor("");
      flash("Doctor deleted.");
      Swal.fire({
        title: "Deleted",
        text: "Doctor removed successfully.",
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
      });
      loadPublicData();
      loadPrivateData();
    } catch (error) {
      Swal.fire("Delete failed", error.message, "error");
      flash(error.message);
    }
  };

  const createSchedule = async (event) => {
    event.preventDefault();
    const effectiveDoctorId =
      user.role === "doctor" ? loggedInDoctor?.id : scheduleForm.doctor_id;
    if (!effectiveDoctorId) {
      flash("Doctor profile not found.");
      return;
    }
    if (!isDateInBookingWindow(scheduleForm.available_date)) {
      flash(
        `Schedules can be created only from ${todayDate} to ${maxBookingDate}.`,
      );
      return;
    }

    try {
      await request("/schedules", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ...scheduleForm,
          doctor_id: effectiveDoctorId,
        }),
      });
      flash("Schedule added.");
      setScheduleForm({
        doctor_id: user.role === "doctor" ? effectiveDoctorId : "",
        available_date: "",
        start_time: "09:00",
        end_time: "13:00",
        slot_duration: 30,
      });
    } catch (error) {
      flash(error.message);
    }
  };

  const loadDoctorSchedules = async (doctorId) => {
    setScheduleDoctorId(doctorId);
    setDoctorSchedules([]);
    setScheduleDurations({});
    if (!doctorId) return;

    try {
      const data = await request(`/schedules/doctor/${doctorId}`);
      setDoctorSchedules(data);
      setScheduleDurations(
        data.reduce(
          (durations, schedule) => ({
            ...durations,
            [schedule.id]: schedule.slot_duration,
          }),
          {},
        ),
      );
    } catch (error) {
      flash(error.message);
    }
  };

  const updateSlotDuration = async (schedule) => {
    try {
      await request(`/schedules/${schedule.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          available_date: String(schedule.available_date).slice(0, 10),
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          slot_duration: scheduleDurations[schedule.id],
          status: schedule.status,
        }),
      });
      flash("Slot duration updated.");
      loadDoctorSchedules(scheduleDoctorId);
    } catch (error) {
      flash(error.message);
    }
  };

  useEffect(() => {
    if (user?.role !== "doctor" || !loggedInDoctor) return;

    setScheduleForm((current) => ({
      ...current,
      doctor_id: loggedInDoctor.id,
    }));

    if (
      activeView === "manage" &&
      String(scheduleDoctorId) !== String(loggedInDoctor.id)
    ) {
      loadDoctorSchedules(loggedInDoctor.id);
    }
  }, [activeView, loggedInDoctor, scheduleDoctorId, user]);

  if (path === "/project-report") {
    return (
      <main className="min-h-screen bg-[#edf4f2] text-slate-950">
        <ProjectReport navigate={navigate} user={user} />
        <Toast message={notice} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9f7ef_0,#f6f8fb_34%,#eef3f8_100%)] text-slate-900">
        {path === "/login" ? (
          <LoginPage
            authMode={authMode}
            handleLogin={handleLogin}
            handleRegister={handleRegister}
            loading={loading}
            loginForm={loginForm}
            navigate={navigate}
            registerForm={registerForm}
            setAuthMode={setAuthMode}
            setLoginForm={setLoginForm}
            setRegisterForm={setRegisterForm}
          />
        ) : (
          <PublicLanding
            bookingDate={bookingDate}
            bookingProblem={bookingProblem}
            bookAppointment={bookAppointment}
            currentDoctor={currentDoctor}
            departments={departments}
            loadSlots={loadSlots}
            loading={loading}
            navigate={navigate}
            selectedDepartment={selectedDepartment}
            selectedDoctor={selectedDoctor}
            selectedSlot={selectedSlot}
            setBookingDate={setBookingDate}
            setBookingProblem={setBookingProblem}
            setSelectedDepartment={setSelectedDepartment}
            setSelectedDoctor={setSelectedDoctor}
            setSelectedSlot={setSelectedSlot}
            slots={slots}
            visibleDoctors={visibleDoctors}
          />
        )}
        {showPatientPopup && (
          <PatientPopup
            form={guestForm}
            loading={loading}
            onChange={(updates) => setGuestForm({ ...guestForm, ...updates })}
            onClose={() => setShowPatientPopup(false)}
            onLogin={() => {
              setShowPatientPopup(false);
              navigate("/login");
            }}
            onSubmit={submitGuestBooking}
          />
        )}
        <Toast message={notice} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9f7ef_0,#f6f8fb_34%,#eef3f8_100%)] text-slate-900">
      <header className="border-b border-white/70 bg-white/85 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-teal-700">
              Hospital Appointment System
            </p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-slate-950">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
            </h1>
          </div>
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:flex-wrap md:justify-end md:overflow-visible md:pb-0">
            {["dashboard", "doctors", "appointments", "manage"].map((view) => (
              <button
                key={view}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize transition ${
                  activeView === view
                    ? "bg-teal-700 text-white shadow-lg shadow-teal-900/15"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:text-teal-700 hover:ring-teal-300"
                } ${view === "manage" && user.role === "patient" ? "hidden" : ""}`}
                onClick={() => setActiveView(view)}
              >
                {view}
              </button>
            ))}
            <button
              className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-teal-500 hover:text-teal-700"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
        {activeView === "dashboard" && (
          <Dashboard
            user={user}
            stats={stats}
            appointments={appointments}
            doctors={doctors}
            departments={departments}
          />
        )}

        {activeView === "doctors" && (
          <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:gap-6">
            <Panel title="Find doctors">
              <Select
                label="Department"
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                options={[
                  ["", "All departments"],
                  ...departments.map((department) => [
                    department.id,
                    department.department_name,
                  ]),
                ]}
              />
              <div className="mt-4 space-y-3">
                {visibleDoctors.map((doctor) => (
                  <button
                    key={doctor.id}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      String(selectedDoctor) === String(doctor.id)
                        ? "border-teal-600 bg-teal-50 shadow-sm"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                    }`}
                    onClick={() => setSelectedDoctor(doctor.id)}
                  >
                    <p className="font-semibold text-slate-950">
                      {doctor.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {doctor.specialization} • {doctor.department_name}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-teal-700">
                      Fee Rs. {doctor.consultation_fee}
                    </p>
                  </button>
                ))}
                {!visibleDoctors.length && (
                  <p className="rounded-2xl border border-dashed border-teal-200 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
                    No doctors are available in this department.
                  </p>
                )}
              </div>
            </Panel>

            <Panel
              title={
                user.role === "patient" ? "Book appointment" : "Doctor details"
              }
            >
              {currentDoctor ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-teal-900 p-5 text-white">
                    <h2 className="text-xl font-bold">{currentDoctor.name}</h2>
                    <p className="text-slate-200">
                      {currentDoctor.qualification} • {currentDoctor.experience}{" "}
                      years
                    </p>
                  </div>
                  {user.role === "patient" ? (
                    <>
                      <Input
                        label="Appointment date"
                        type="date"
                        value={bookingDate}
                        onChange={setBookingDate}
                        min={todayDate}
                        max={maxBookingDate}
                      />
                      <button
                        className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-800"
                        onClick={loadSlots}
                      >
                        Check slots
                      </button>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {slots.map((slot) => (
                          <button
                            key={slot}
                            className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                              selectedSlot === slot
                                ? "border-teal-700 bg-teal-700 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50"
                            }`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                      <TextArea
                        label="Problem description"
                        value={bookingProblem}
                        onChange={setBookingProblem}
                      />
                      <button
                        className="rounded-2xl bg-teal-700 px-5 py-4 font-black text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-800"
                        onClick={bookAppointment}
                      >
                        {loading
                          ? "Processing payment..."
                          : `Pay Rs. ${currentDoctor.consultation_fee} and confirm`}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-slate-600">
                        Patients can book from available schedules. Admins can
                        add schedules in Manage.
                      </p>
                      {user.role === "admin" && (
                        <button
                          className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-rose-700"
                          onClick={() => deleteDoctor(currentDoctor.id)}
                        >
                          Delete doctor
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-600">
                  {visibleDoctors.length
                    ? "Select a doctor to continue."
                    : "No doctors are available in the selected department."}
                </p>
              )}
            </Panel>
          </section>
        )}

        {activeView === "appointments" && (
          <AppointmentTable
            appointments={appointments}
            role={user.role}
            onStatus={updateStatus}
            onCancel={cancelAppointment}
          />
        )}

        {activeView === "manage" && user.role !== "patient" && (
          <Manage
            user={user}
            departments={departments}
            doctors={doctors}
            loggedInDoctor={loggedInDoctor}
            patients={patients}
            departmentForm={departmentForm}
            setDepartmentForm={setDepartmentForm}
            doctorForm={doctorForm}
            setDoctorForm={setDoctorForm}
            scheduleForm={scheduleForm}
            setScheduleForm={setScheduleForm}
            doctorSchedules={doctorSchedules}
            scheduleDoctorId={scheduleDoctorId}
            scheduleDurations={scheduleDurations}
            setScheduleDurations={setScheduleDurations}
            createDepartment={createDepartment}
            createDoctor={createDoctor}
            createSchedule={createSchedule}
            loadDoctorSchedules={loadDoctorSchedules}
            updateSlotDuration={updateSlotDuration}
          />
        )}
      </div>
      <Toast message={notice} />
    </main>
  );
}

function PublicLanding(props) {
  const {
    bookingDate,
    bookingProblem,
    bookAppointment,
    currentDoctor,
    departments,
    loadSlots,
    loading,
    navigate,
    selectedDepartment,
    selectedDoctor,
    selectedSlot,
    setBookingDate,
    setBookingProblem,
    setSelectedDepartment,
    setSelectedDoctor,
    setSelectedSlot,
    slots,
    visibleDoctors,
  } = props;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#d9f7ef_0,#f6f8fb_34%,#eef3f8_100%)]">
      <header className="border-b border-white/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">
              Hospital Appointment System
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Book an appointment online
            </h1>
          </div>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600 hover:text-teal-700"
            onClick={(event) => {
              event.preventDefault();
              navigate("/login");
            }}
          >
            Login
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-5 sm:py-8 lg:grid-cols-[0.9fr_1.35fr] lg:gap-7">
        <aside className="space-y-5">
          <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-950 p-6 text-white shadow-2xl sm:rounded-[2rem] sm:p-8">
            <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-teal-400/25 blur-2xl" />
            <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
            <p className="relative text-sm font-black uppercase tracking-[0.25em] text-teal-200">
              Fast patient booking
            </p>
            <h2 className="relative mt-5 max-w-xl text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl md:text-6xl">
              Find the right doctor in a few clicks.
            </h2>
            <p className="relative mt-5 max-w-lg text-lg leading-8 text-slate-300">
              Choose a department, select a doctor, check available time slots,
              and confirm your appointment without standing in a queue.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              ["Departments", departments.length, "Specialized care"],
              ["Doctors", visibleDoctors.length, "Ready to consult"],
              ["Booking", "24/7", "Online access"],
            ].map(([label, value, helper]) => (
              <div
                key={label}
                className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5"
              >
                <p className="text-sm font-bold text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                  {helper}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
            <h3 className="text-xl font-black text-slate-950">
              How booking works
            </h3>
            <div className="mt-5 space-y-4">
              {[
                ["01", "Select a department and doctor."],
                ["02", "Pick an appointment date and load free slots."],
                ["03", "Describe your problem and submit the booking."],
              ].map(([step, text]) => (
                <div key={step} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 text-sm font-black text-teal-800">
                    {step}
                  </span>
                  <p className="pt-2 text-sm font-semibold text-slate-700">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/70 sm:rounded-[1.75rem] sm:p-6 h-fit">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">
                  Step 1
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Choose doctor
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {visibleDoctors.length} available
              </span>
            </div>

            <Select
              label="Department"
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              options={[
                ["", "All departments"],
                ...departments.map((department) => [
                  department.id,
                  department.department_name,
                ]),
              ]}
            />

            <div className="mt-5 max-h-[590px] space-y-3 overflow-y-auto pr-2">
              {visibleDoctors.map((doctor) => {
                const isActive = String(selectedDoctor) === String(doctor.id);
                return (
                  <button
                    key={doctor.id}
                    className={`group w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-teal-600 bg-teal-50 shadow-sm"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                    }`}
                    onClick={() => setSelectedDoctor(doctor.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-950">
                          {doctor.name}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {doctor.specialization} - {doctor.department_name}
                        </p>
                      </div>
                      {isActive && (
                        <span className="rounded-full bg-teal-700 px-3 py-1 text-xs font-bold text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                        {doctor.experience || 0} yrs exp
                      </span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800">
                        Fee Rs. {doctor.consultation_fee}
                      </span>
                    </div>
                  </button>
                );
              })}
              {!visibleDoctors.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="font-black text-slate-950">
                    No doctors available in this department.
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Please select another department or check again later.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/70 sm:rounded-[1.75rem] sm:p-6 h-fit">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">
                Step 2
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Appointment details
              </h2>
            </div>

            {currentDoctor ? (
              <div className="space-y-5">
                <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-teal-900 p-5 text-white">
                  <p className="text-sm font-bold text-teal-100">
                    Selected doctor
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    {currentDoctor.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-200">
                    {currentDoctor.qualification} - {currentDoctor.experience}{" "}
                    years
                  </p>
                  <p className="mt-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
                    {currentDoctor.department_name}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Input
                    label="Appointment date"
                    type="date"
                    value={bookingDate}
                    onChange={setBookingDate}
                    min={todayDate}
                    max={maxBookingDate}
                  />
                  <button
                    className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-800"
                    onClick={loadSlots}
                  >
                    Check slots
                  </button>
                </div>

                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">
                    Available slots
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                          selectedSlot === slot
                            ? "border-teal-700 bg-teal-700 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50"
                        }`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                    {!slots.length && (
                      <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                        Select a date and click Check slots to see available
                        times.
                      </div>
                    )}
                  </div>
                </div>

                <TextArea
                  label="Problem description"
                  value={bookingProblem}
                  onChange={setBookingProblem}
                />
                <button
                  className="w-full rounded-2xl bg-teal-700 px-5 py-4 text-lg font-black text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-800"
                  onClick={bookAppointment}
                >
                  {loading
                    ? "Processing payment..."
                    : `Pay Rs. ${currentDoctor.consultation_fee} and submit`}
                </button>
              </div>
            ) : (
              <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div>
                  <p className="text-xl font-black text-slate-950">
                    {visibleDoctors.length
                      ? "Select a doctor to start booking."
                      : "No doctor is available for the selected department."}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Your appointment form will appear here after selecting a
                    doctor.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function LoginPage(props) {
  const {
    authMode,
    handleLogin,
    handleRegister,
    loading,
    loginForm,
    navigate,
    registerForm,
    setAuthMode,
    setLoginForm,
    setRegisterForm,
  } = props;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9f7ef_0,#f6f8fb_34%,#eef3f8_100%)]">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-6 px-4 py-6 sm:gap-8 sm:py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl sm:p-9">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-400/25 blur-3xl" />
          <div className="absolute -bottom-20 left-8 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
          <button
            className="relative rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
            onClick={() => navigate("/")}
          >
            Back to booking
          </button>
          <div className="relative mt-8">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-teal-200">
              Secure access
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl md:text-6xl">
              Login to Hospital Appointment System
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Admins and doctors can manage appointments, schedules,
              departments, and patient records from their dashboards.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white bg-white/95 p-4 shadow-2xl shadow-slate-200/80 sm:p-6">
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-teal-50 p-1">
            <button
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                authMode === "login"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600"
              }`}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                authMode === "register"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600"
              }`}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>
          {authMode === "login" ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <Input
                label="Email"
                type="email"
                value={loginForm.email}
                onChange={(value) =>
                  setLoginForm({ ...loginForm, email: value })
                }
              />
              <Input
                label="Password"
                type="password"
                value={loginForm.password}
                onChange={(value) =>
                  setLoginForm({ ...loginForm, password: value })
                }
              />
              <button className="w-full rounded-2xl bg-teal-700 px-5 py-4 text-lg font-black text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-800">
                {loading ? "Signing in..." : "Sign in"}
              </button>
              <p className="text-sm text-slate-500">
                Demo: admin@hospital.com / password123
              </p>
            </form>
          ) : (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={handleRegister}
            >
              <Input
                label="Name"
                value={registerForm.name}
                onChange={(value) =>
                  setRegisterForm({ ...registerForm, name: value })
                }
              />
              <Input
                label="Email"
                type="email"
                value={registerForm.email}
                onChange={(value) =>
                  setRegisterForm({ ...registerForm, email: value })
                }
              />
              <Input
                label="Password"
                type="password"
                value={registerForm.password}
                onChange={(value) =>
                  setRegisterForm({ ...registerForm, password: value })
                }
              />
              <Input
                label="Phone"
                value={registerForm.phone}
                onChange={(value) =>
                  setRegisterForm({ ...registerForm, phone: value })
                }
              />
              <Select
                label="Gender"
                value={registerForm.gender}
                onChange={(value) =>
                  setRegisterForm({ ...registerForm, gender: value })
                }
                options={[
                  ["female", "Female"],
                  ["male", "Male"],
                  ["other", "Other"],
                ]}
              />
              <Input
                label="Age"
                type="number"
                value={registerForm.age}
                onChange={(value) =>
                  setRegisterForm({ ...registerForm, age: value })
                }
              />
              <Input
                label="Blood group"
                value={registerForm.blood_group}
                onChange={(value) =>
                  setRegisterForm({ ...registerForm, blood_group: value })
                }
              />
              <Input
                label="Address"
                value={registerForm.address}
                onChange={(value) =>
                  setRegisterForm({ ...registerForm, address: value })
                }
              />
              <button className="rounded-2xl bg-teal-700 px-5 py-4 text-lg font-black text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-800 sm:col-span-2">
                Create patient account
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function ProjectReport({ navigate, user }) {
  const goBack = () => navigate(user ? "/" : "/");

  return (
    <div className="report-shell mx-auto max-w-6xl px-4 py-6">
      <div className="report-toolbar mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">
            PDF based project pages
          </p>
          <h1 className="text-2xl font-bold">
            Hospital Appointment Management System
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            onClick={goBack}
          >
            Back to app
          </button>
          <button
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            onClick={() => window.print()}
          >
            Print pages
          </button>
        </div>
      </div>

      <ReportPage title="Cover Page">
        <div className="flex min-h-[840px] flex-col items-center justify-between text-center">
          <div>
            <p className="text-lg font-semibold uppercase tracking-[0.18em]">
              Center for Distance and Online Education
            </p>
            <p className="mt-2 text-lg">Integral University, Lucknow</p>
          </div>
          <div className="space-y-8">
            <p className="text-xl font-semibold">A Project on</p>
            <h2 className="mx-auto max-w-2xl text-4xl font-black uppercase leading-tight">
              Hospital Appointment Management System
            </h2>
            <div className="text-lg leading-9">
              <p>Submitted by</p>
              <p className="font-bold">Name of Student</p>
              <p>Enrollment number: __________________</p>
              <p>Program: MCA</p>
              <p>Semester: __________________</p>
              <p>Session: January 2026</p>
            </div>
          </div>
          <div className="space-y-5 text-lg">
            <div>
              <p>Under the Supervision of</p>
              <p className="font-bold">Name of the Guide</p>
              <p>Designation and Department</p>
            </div>
            <p>
              Submitted in partial fulfillment of the requirement for the award
              of Degree
            </p>
          </div>
        </div>
      </ReportPage>

      <ReportPage title="Student Declaration">
        <div className="min-h-[840px] text-lg leading-9">
          <h2 className="mb-12 text-center text-3xl font-black uppercase">
            Declaration
          </h2>
          <p>
            I, ______________________________, hereby declare that the Project
            Report titled{" "}
            <strong>"Hospital Appointment Management System"</strong> submitted
            to Centre for Distance and Online Education, Integral University,
            Lucknow in partial fulfillment of the requirement for the award of
            the degree MCA is my original work.
          </p>
          <p className="mt-6">
            The findings and conclusions are based on data collected and
            analyzed by me and have not been submitted elsewhere for any degree
            or diploma. If anything is found wrong at a later stage, the
            university reserves the right to take appropriate action against me.
          </p>
          <div className="mt-28 grid gap-12 sm:grid-cols-2">
            <div>
              <p>Date: __________________</p>
              <p>Place: _________________</p>
            </div>
            <div className="text-right">
              <p>Signature</p>
              <p>Name of the Student</p>
              <p>Enrollment number</p>
            </div>
          </div>
        </div>
      </ReportPage>

      <ReportPage title="Supervisor Certificate">
        <div className="min-h-[840px] text-lg leading-9">
          <h2 className="mb-12 text-center text-3xl font-black uppercase">
            Certificate from Supervisor
          </h2>
          <p>
            This is to certify that the Project Report titled
            <strong> "Hospital Appointment Management System"</strong> submitted
            by ______________________________, Enrollment No.
            __________________, is an original work carried out under my direct
            supervision in partial fulfillment of the requirements for the
            degree MCA at Centre for Distance and Online Education, Integral
            University, Lucknow.
          </p>
          <p className="mt-6">
            To the best of my knowledge, this report has not been submitted for
            any other award. The student's performance during the project period
            has been satisfactory.
          </p>
          <div className="mt-28 grid gap-12 sm:grid-cols-2">
            <div>
              <p>Date: __________________</p>
            </div>
            <div>
              <p>Signature: __________________</p>
              <p>Name: _______________________</p>
              <p>Qualification: _______________</p>
              <p>Designation: ________________</p>
              <p>Institution: ________________</p>
            </div>
          </div>
        </div>
      </ReportPage>

      <ReportPage title="Content">
        <div className="min-h-[840px]">
          <h2 className="mb-8 text-center text-3xl font-black uppercase">
            Content
          </h2>
          <table className="w-full border-collapse text-left text-base">
            <thead>
              <tr className="border-y-2 border-slate-950">
                <th className="w-20 py-3">S.No.</th>
                <th className="py-3">Content</th>
                <th className="w-36 py-3 text-right">Page No.</th>
              </tr>
            </thead>
            <tbody>
              {reportContents.map(([number, label]) => (
                <tr key={number} className="border-b border-slate-300">
                  <td className="py-3 font-semibold">{number}</td>
                  <td className="py-3">{label}</td>
                  <td className="py-3 text-right">_____</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportPage>

      <ReportPage title="Arrangement of Contents">
        <div className="min-h-[840px]">
          <h2 className="mb-4 text-center text-3xl font-black uppercase">
            Arrangement of Contents of Project Report
          </h2>
          <p className="mb-6 text-center text-slate-600">
            Report length should be 50-80 pages, excluding appendices and
            annexures. Use A4 paper, Times New Roman 12, 1.5 line spacing, and
            uniform formatting.
          </p>
          <div className="space-y-4">
            {reportChapters.map((chapter, index) => (
              <div
                key={chapter.title}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="text-sm font-black text-teal-700">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="text-xl font-bold">{chapter.title}</h3>
                <p className="mt-2 text-slate-700">{chapter.text}</p>
              </div>
            ))}
          </div>
        </div>
      </ReportPage>
    </div>
  );
}

function ReportPage({ title, children }) {
  return (
    <section className="report-page mb-8 rounded-sm bg-white p-10 shadow-xl ring-1 ring-slate-200">
      <p className="mb-6 border-b border-slate-200 pb-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
        {title}
      </p>
      {children}
    </section>
  );
}

function PatientPopup({ form, loading, onChange, onClose, onLogin, onSubmit }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/65 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
      <section className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/30 sm:rounded-[2rem]">
        <div className="grid lg:grid-cols-[0.9fr_1.5fr]">
          <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-teal-950 to-teal-700 p-7 text-white lg:block">
            <div className="absolute -left-14 -top-14 h-36 w-36 rounded-full bg-teal-300/25 blur-2xl" />
            <div className="absolute -bottom-20 right-4 h-52 w-52 rounded-full bg-cyan-200/20 blur-3xl" />
            <div className="relative">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl font-black ring-1 ring-white/20">
                P
              </span>
              <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-teal-200">
                Final step
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight">
                Complete your patient profile.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                These details create your patient record. After this, you will
                continue to secure payment and confirm the appointment.
              </p>
            </div>

            <div className="relative mt-8 space-y-3">
              {[
                "Patient record",
                "Secure payment",
                "Appointment confirmation",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-black text-teal-800">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold">{item}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="max-h-[94vh] overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Patient details
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Fill the form once. Existing users can login directly and
                  continue booking from their account.
                </p>
              </div>
              <button
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-teal-500 hover:text-teal-700"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            </div>

            <button
              className="mb-5 flex w-full flex-col gap-1 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-left text-sm font-bold text-teal-800 transition hover:border-teal-500 hover:bg-teal-100 sm:mb-6 sm:flex-row sm:items-center sm:justify-between"
              onClick={onLogin}
              type="button"
            >
              <span>Already have an account?</span>
              <span>Go to login page</span>
            </button>

            <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
              <Input
                label="Full name"
                value={form.name}
                onChange={(value) => onChange({ name: value })}
              />
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={(value) => onChange({ email: value })}
              />
              <Input
                label="Create password"
                type="password"
                value={form.password}
                onChange={(value) => onChange({ password: value })}
              />
              <Input
                label="Phone number"
                value={form.phone}
                onChange={(value) => onChange({ phone: value })}
              />
              <Select
                label="Gender"
                value={form.gender}
                onChange={(value) => onChange({ gender: value })}
                options={[
                  ["female", "Female"],
                  ["male", "Male"],
                  ["other", "Other"],
                ]}
              />
              <Input
                label="Age"
                type="number"
                value={form.age}
                onChange={(value) => onChange({ age: value })}
              />
              <Input
                label="Blood group"
                value={form.blood_group}
                onChange={(value) => onChange({ blood_group: value })}
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(value) => onChange({ address: value })}
              />
              <button className="mt-2 rounded-2xl bg-teal-700 px-5 py-4 text-lg font-black text-white shadow-lg shadow-teal-900/20 transition hover:-translate-y-0.5 hover:bg-teal-800 sm:col-span-2">
                {loading ? "Processing payment..." : "Continue to payment"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function Dashboard({ user, stats, appointments, doctors, departments }) {
  const pending = appointments.filter(
    (item) => item.status === "pending",
  ).length;
  const formatMoney = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;
  const cards =
    user.role === "admin"
      ? [
          ["Doctors", stats?.totalDoctors ?? doctors.length],
          ["Patients", stats?.totalPatients ?? 0],
          ["Appointments", stats?.totalAppointments ?? appointments.length],
          ["Pending", stats?.pendingAppointments ?? pending],
          ["Revenue", formatMoney(stats?.totalRevenue)],
        ]
      : user.role === "doctor"
        ? [
            ["Today", stats?.today ?? 0],
            ["Pending", stats?.pending ?? pending],
            ["Completed", stats?.completed ?? 0],
            ["History", appointments.length],
            ["Revenue", formatMoney(stats?.totalRevenue)],
          ]
        : [
            ["My bookings", appointments.length],
            ["Pending", pending],
            ["Doctors", doctors.length],
            ["Departments", departments.length],
          ];

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-[1.5rem] border border-white bg-white/95 p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70"
          >
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      <AppointmentTable
        appointments={appointments.slice(0, 6)}
        role={user.role}
        compact
      />
    </section>
  );
}

function Manage(props) {
  const {
    user,
    departments,
    doctors,
    loggedInDoctor,
    patients,
    departmentForm,
    setDepartmentForm,
    doctorForm,
    setDoctorForm,
    scheduleForm,
    setScheduleForm,
    doctorSchedules,
    scheduleDoctorId,
    scheduleDurations,
    setScheduleDurations,
    createDepartment,
    createDoctor,
    createSchedule,
    loadDoctorSchedules,
    updateSlotDuration,
  } = props;

  return (
    <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {user.role === "admin" && (
        <>
          <Panel title="Add department">
            <form className="space-y-4" onSubmit={createDepartment}>
              <Input
                label="Department name"
                value={departmentForm.department_name}
                onChange={(value) =>
                  setDepartmentForm({
                    ...departmentForm,
                    department_name: value,
                  })
                }
              />
              <TextArea
                label="Description"
                value={departmentForm.description}
                onChange={(value) =>
                  setDepartmentForm({ ...departmentForm, description: value })
                }
              />
              <button className="rounded-xl bg-teal-700 px-4 py-3 font-bold text-white shadow-sm hover:bg-teal-800">
                Save department
              </button>
            </form>
          </Panel>
          <Panel title="Add doctor">
            <form className="space-y-3" onSubmit={createDoctor}>
              <Input
                label="Name"
                value={doctorForm.name}
                onChange={(value) =>
                  setDoctorForm({ ...doctorForm, name: value })
                }
              />
              <Input
                label="Email"
                type="email"
                value={doctorForm.email}
                onChange={(value) =>
                  setDoctorForm({ ...doctorForm, email: value })
                }
              />
              <Input
                label="Password"
                type="password"
                value={doctorForm.password}
                onChange={(value) =>
                  setDoctorForm({ ...doctorForm, password: value })
                }
              />
              <Select
                label="Department"
                value={doctorForm.department_id}
                onChange={(value) =>
                  setDoctorForm({ ...doctorForm, department_id: value })
                }
                options={[
                  ["", "Select"],
                  ...departments.map((department) => [
                    department.id,
                    department.department_name,
                  ]),
                ]}
              />
              <Input
                label="Specialization"
                value={doctorForm.specialization}
                onChange={(value) =>
                  setDoctorForm({ ...doctorForm, specialization: value })
                }
              />
              <Input
                label="Qualification"
                value={doctorForm.qualification}
                onChange={(value) =>
                  setDoctorForm({ ...doctorForm, qualification: value })
                }
              />
              <Input
                label="Phone"
                value={doctorForm.phone}
                onChange={(value) =>
                  setDoctorForm({ ...doctorForm, phone: value })
                }
              />
              <Input
                label="Experience"
                type="number"
                value={doctorForm.experience}
                onChange={(value) =>
                  setDoctorForm({ ...doctorForm, experience: value })
                }
              />
              <Input
                label="Fee"
                type="number"
                value={doctorForm.consultation_fee}
                onChange={(value) =>
                  setDoctorForm({ ...doctorForm, consultation_fee: value })
                }
              />
              <button className="rounded-xl bg-teal-700 px-4 py-3 font-bold text-white shadow-sm hover:bg-teal-800">
                Save doctor
              </button>
            </form>
          </Panel>
        </>
      )}
      <Panel title="Add schedule">
        <form className="space-y-4" onSubmit={createSchedule}>
          {user.role === "admin" ? (
            <Select
              label="Doctor"
              value={scheduleForm.doctor_id}
              onChange={(value) =>
                setScheduleForm({ ...scheduleForm, doctor_id: value })
              }
              options={[
                ["", "Select"],
                ...doctors.map((doctor) => [doctor.id, doctor.name]),
              ]}
            />
          ) : (
            <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
              <p className="text-sm font-bold text-slate-500">Doctor</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {loggedInDoctor?.name || user.name}
              </p>
              <p className="mt-1 text-sm text-teal-800">
                You can create schedules only for your own profile.
              </p>
            </div>
          )}
          <Input
            label="Date"
            type="date"
            value={scheduleForm.available_date}
            onChange={(value) =>
              setScheduleForm({ ...scheduleForm, available_date: value })
            }
            min={todayDate}
            max={maxBookingDate}
          />
          <Input
            label="Start time"
            type="time"
            value={scheduleForm.start_time}
            onChange={(value) =>
              setScheduleForm({ ...scheduleForm, start_time: value })
            }
          />
          <Input
            label="End time"
            type="time"
            value={scheduleForm.end_time}
            onChange={(value) =>
              setScheduleForm({ ...scheduleForm, end_time: value })
            }
          />
          <Input
            label="Slot duration"
            type="number"
            value={scheduleForm.slot_duration}
            onChange={(value) =>
              setScheduleForm({ ...scheduleForm, slot_duration: value })
            }
          />
          <button className="rounded-xl bg-teal-700 px-4 py-3 font-bold text-white shadow-sm hover:bg-teal-800">
            Save schedule
          </button>
        </form>
      </Panel>
      <Panel
        title={
          user.role === "doctor" ? "My slot durations" : "Update slot duration"
        }
      >
        <div className="space-y-4">
          {user.role === "admin" ? (
            <Select
              label="Doctor"
              value={scheduleDoctorId}
              onChange={loadDoctorSchedules}
              options={[
                ["", "Select"],
                ...doctors.map((doctor) => [doctor.id, doctor.name]),
              ]}
            />
          ) : (
            <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
              <p className="text-sm font-bold text-slate-500">Doctor</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {loggedInDoctor?.name || user.name}
              </p>
            </div>
          )}
          <div className="space-y-3">
            {doctorSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <p className="font-semibold text-slate-950">
                  {String(schedule.available_date).slice(0, 10)}
                </p>
                <p className="text-sm text-slate-600">
                  {schedule.start_time} to {schedule.end_time}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    label="Slot duration minutes"
                    type="number"
                    value={scheduleDurations[schedule.id] || ""}
                    onChange={(value) =>
                      setScheduleDurations({
                        ...scheduleDurations,
                        [schedule.id]: value,
                      })
                    }
                  />
                  <button
                    className="self-end rounded-xl bg-teal-700 px-4 py-3 font-bold text-white shadow-sm hover:bg-teal-800"
                    onClick={() => updateSlotDuration(schedule)}
                    type="button"
                  >
                    Update
                  </button>
                </div>
              </div>
            ))}
            {scheduleDoctorId && !doctorSchedules.length && (
              <p className="text-sm text-slate-500">
                No custom schedules found for this doctor.
              </p>
            )}
          </div>
        </div>
      </Panel>
      {user.role === "admin" && (
        <Panel title="Registered patients">
          <div className="space-y-3">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <p className="font-semibold">{patient.name}</p>
                <p className="text-sm text-slate-600">
                  {patient.email} • {patient.phone}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </section>
  );
}

function AppointmentTable({
  appointments,
  role,
  onStatus,
  onCancel,
  compact = false,
}) {
  return (
    <Panel title={compact ? "Recent appointments" : "Appointments"}>
      <div className="-mx-2 overflow-x-auto px-2">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="py-3 pr-4">No.</th>
              <th className="py-3 pr-4">Doctor</th>
              <th className="py-3 pr-4">Patient</th>
              <th className="py-3 pr-4">Department</th>
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Amount</th>
              <th className="py-3 pr-4">Status</th>
              {!compact && <th className="py-3 pr-4">Action</th>}
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr
                key={appointment.id}
                className="bg-white transition hover:bg-teal-50/50"
              >
                <td className="py-3 pr-4 font-semibold">
                  {appointment.appointment_no}
                </td>
                <td className="py-3 pr-4">{appointment.doctor_name || "-"}</td>
                <td className="py-3 pr-4">
                  {appointment.patient_name || "Me"}
                </td>
                <td className="py-3 pr-4">{appointment.department_name}</td>
                <td className="py-3 pr-4">
                  {appointment.appointment_date?.slice(0, 10)}{" "}
                  {appointment.appointment_time}
                </td>
                <td className="py-3 pr-4">
                  <div className="font-semibold">
                    Rs. {Number(appointment.payment_amount || 0).toFixed(2)}
                  </div>
                  <div className="text-xs capitalize text-slate-500">
                    {appointment.payment_status || "pending"}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <Status status={appointment.status} />
                </td>
                {!compact && (
                  <td className="py-3 pr-4">
                    {role === "patient" ? (
                      <button
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 font-bold hover:border-teal-500 hover:text-teal-700"
                        onClick={() => onCancel?.(appointment.id)}
                      >
                        Cancel
                      </button>
                    ) : (
                      <Select
                        value={appointment.status}
                        onChange={(value) => onStatus?.(appointment.id, value)}
                        options={[
                          ["pending", "pending"],
                          ["approved", "approved"],
                          ["rejected", "rejected"],
                          ["cancelled", "cancelled"],
                          ["completed", "completed"],
                        ]}
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!appointments.length && (
              <tr>
                <td className="py-6 text-slate-500" colSpan={8}>
                  No appointments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-[1.5rem] border border-white bg-white/95 p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 sm:p-5">
      <h2 className="mb-4 text-xl font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, type = "text", min, max }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      <input
        required
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      <textarea
        className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selected = options.find(
    ([optionValue]) => String(optionValue) === String(value),
  );
  const selectedText = selected?.[1] || "Select";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chooseOption = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div className="relative block" ref={wrapperRef}>
      {label && (
        <span className="mb-2 block text-sm font-bold text-slate-700">
          {label}
        </span>
      )}
      <button
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left text-base outline-none transition ${
          open
            ? "border-teal-500 ring-4 ring-teal-100"
            : "border-slate-300 hover:border-teal-400"
        }`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        type="button"
      >
        <span
          className={`truncate capitalize ${
            value === "" ? "text-slate-500" : "text-slate-950"
          }`}
        >
          {selectedText}
        </span>
        <span className="text-slate-500">
          {open ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-teal-100 bg-white p-2 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-200">
          {options.map(([optionValue, text]) => {
            const isActive = String(optionValue) === String(value);
            return (
              <button
                key={`${optionValue}-${text}`}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-base font-semibold capitalize transition ${
                  isActive
                    ? "bg-teal-700 text-white"
                    : "text-slate-800 hover:bg-teal-50 hover:text-teal-800"
                }`}
                onClick={() => chooseOption(optionValue)}
                type="button"
              >
                <span>{text}</span>
                {isActive && <span>Selected</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Status({ status }) {
  const styles = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-teal-100 text-teal-800",
    rejected: "bg-rose-100 text-rose-800",
    cancelled: "bg-slate-200 text-slate-700",
    completed: "bg-indigo-100 text-indigo-800",
  };
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white shadow-2xl shadow-slate-950/30">
      {message}
    </div>
  );
}

export default App;
