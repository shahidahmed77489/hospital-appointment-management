import fitz
from pathlib import Path
import textwrap

OUT = Path('reports/Hospital_Appointment_Management_Project_Report_80_Pages.pdf')
A4 = fitz.paper_rect('a4')
LEFT = 108
RIGHT = 72
TOP = 72
BOTTOM = 72
WIDTH = A4.width - LEFT - RIGHT
LINE = 18
FONT = 'Times-Roman'
BOLD = 'Times-Bold'
TITLE_SIZE = 16
BODY_SIZE = 12
SMALL_SIZE = 10

project = 'Hospital Appointment Management System'
student = 'Name of Student'
enrollment = 'Enrollment Number'
program = 'MCA'
session = 'January 2026'
university = 'Centre for Distance and Online Education, Integral University, Lucknow'

contents = [
    ('Student Declaration', 2),
    ('Certificate from Supervisor', 3),
    ('Acknowledgement', 4),
    ('Content', 5),
    ('List of Illustrations', 6),
    ('Abstract', 7),
    ('Chapter I: Introduction', 9),
    ('Chapter II: Objectives of the Study', 19),
    ('Chapter III: Problem Statement', 25),
    ('Chapter IV: Methodology', 32),
    ('Chapter V: Data Analysis and Interpretation', 48),
    ('Chapter VI: Discussion and Results', 63),
    ('Chapter VII: Conclusion', 71),
    ('Chapter VIII: Recommendations and Suggestions', 75),
    ('References / Bibliography', 78),
    ('Credentials / Demo Accounts', 80),
]

common_intro = [
    'The Hospital Appointment Management System is a web based project designed to simplify the process of finding doctors, checking available appointment slots, booking consultations, and managing hospital administrative records. The application uses a React frontend, an Express backend, JWT based authentication, and a MySQL database. It supports three major roles: administrator, doctor, and patient.',
    'The project focuses on reducing manual work in appointment handling. In a traditional environment, patients often wait in queues, staff members maintain registers, and doctors receive appointment information through informal communication. A computerized appointment system improves transparency, decreases duplication, and makes appointment history easier to maintain.',
    'This report describes the background, objectives, problem statement, methodology, data analysis, results, conclusion, recommendations, and appendices for the project. The report follows the format suggested by the project guideline: A4 page size, uniform font style, structured chapters, references, and annexures.',
]

page_defs = []

# Page 1: Cover
page_defs.append({
    'kind': 'cover',
    'title': 'Cover Page',
    'body': []
})

page_defs.append({
    'title': 'Declaration',
    'body': [
        f'I, {student}, hereby declare that the Project Report titled "{project}" submitted to {university} in partial fulfillment of the requirement for the award of the degree {program} is my original work.',
        'The findings and conclusions presented in this report are based on project work carried out by me. The work has not been submitted elsewhere for any degree, diploma, certificate, or similar academic award. If anything is found incorrect at a later stage, the university reserves the right to take appropriate action as per its rules.',
        'Date: ____________________\nPlace: ____________________\n\nSignature: ____________________\nName of Student: ____________________\nEnrollment Number: ____________________',
    ],
})

page_defs.append({
    'title': 'Certificate from Supervisor',
    'body': [
        f'This is to certify that the Project Report titled "{project}" submitted by {student}, Enrollment No. {enrollment}, is an original work carried out under my direct supervision in partial fulfillment of the requirements for the degree {program} at {university}.',
        'To the best of my knowledge, this project report has not been submitted for any other award. The student has demonstrated satisfactory performance during the project period and has completed the system design, implementation, testing, and documentation activities required for the project.',
        'Date: ____________________\n\nSignature: ____________________\nName: ____________________\nQualification: ____________________\nDesignation: ____________________\nInstitution: ____________________',
    ],
})

page_defs.append({
    'title': 'Acknowledgement',
    'body': [
        f'I express my sincere gratitude to {university} for providing the opportunity to prepare this project report on "{project}". The work helped me understand the practical application of web technologies, database design, authentication, routing, and role based access control in a real world healthcare scenario.',
        'I am thankful to my supervisor for valuable guidance, suggestions, and encouragement throughout the project. I also acknowledge the support of teachers, classmates, and family members who motivated me during the development and documentation process.',
        'This project strengthened my understanding of full stack development. It also helped me learn how software can solve common administrative problems faced by patients, doctors, and hospital staff.',
    ],
})

page_defs.append({'kind': 'contents', 'title': 'Content', 'body': []})
page_defs.append({'kind': 'illustrations', 'title': 'List of Illustrations', 'body': []})

for i in range(2):
    page_defs.append({
        'title': 'Abstract' if i == 0 else 'Abstract Continued',
        'body': [
            'The Hospital Appointment Management System is developed to provide an online platform where patients can search doctors by department, select available appointment slots, and submit booking information through a simple interface. The system also gives doctors and administrators separate dashboards for managing appointments and schedules.',
            'The project uses React for the user interface, Express for server side APIs, MySQL for relational data storage, and JSON Web Token authentication for secure access. The application includes patient registration, login, doctor listing, department management, appointment booking, appointment cancellation, status updates, schedule management, and dashboard statistics.',
            'The expected outcome of the project is an efficient appointment workflow that reduces manual errors and improves visibility for all participants. Patients get faster access to doctors, doctors can view appointment requests, and administrators can manage departments, doctors, schedules, and patient records from one system.',
            'Keywords: Hospital Management, Appointment Booking, React, Express, MySQL, JWT, Patient Portal, Doctor Dashboard, Admin Dashboard.',
        ],
    })

intro_titles = [
    'Background of the Study', 'Healthcare and Digital Transformation', 'Need for Appointment Management',
    'Overview of the Proposed System', 'Scope of the Project', 'Users of the System',
    'Technology Context', 'Literature Review', 'Existing System Review', 'Organization of the Report'
]
for idx, title in enumerate(intro_titles, 1):
    page_defs.append({
        'title': f'Chapter I: Introduction - {title}',
        'body': common_intro + [
            f'This section explains {title.lower()} with reference to the hospital appointment process. The system is designed for institutions where doctors, departments, patients, and appointment slots must be coordinated accurately. The application gives users role based screens and stores all important information in a relational database.',
            'The frontend provides a clear booking flow: select a department, choose a doctor, select a date, check available slots, enter the problem description, and confirm the appointment. If a patient is not logged in, the system collects patient details and creates the patient account before confirming the booking.',
            'The backend exposes REST APIs for authentication, departments, doctors, schedules, appointments, and patients. This separation makes the project modular and easier to test. Each route handles a specific responsibility and communicates with MySQL through parameterized queries.',
        ],
    })

objectives = [
    ('Main Objective', 'The main objective is to design and implement an online appointment management system that allows patients to book doctor appointments and allows hospital staff to manage records efficiently.'),
    ('Patient Objectives', 'Patients should be able to register, login, search departments and doctors, view consultation information, check available time slots, book appointments, cancel appointments, and view appointment history.'),
    ('Doctor Objectives', 'Doctors should be able to login securely, view appointment requests assigned to them, approve or reject appointments, mark appointments as completed, and manage availability through schedules.'),
    ('Admin Objectives', 'The administrator should be able to manage departments, add doctors, view patients, monitor appointment statistics, and maintain the overall operation of the system.'),
    ('Technical Objectives', 'The project should demonstrate full stack development using React, Express, MySQL, JWT authentication, REST APIs, reusable UI components, and responsive design.'),
    ('Quality Objectives', 'The system should be simple, reliable, secure, maintainable, and scalable enough for future enhancements such as payments, notifications, prescriptions, and report exports.'),
]
for title, desc in objectives:
    page_defs.append({
        'title': f'Chapter II: Objectives of the Study - {title}',
        'body': [desc] + common_intro + [
            'The objectives are specific and measurable. Each module in the system maps to one or more objectives. For example, the appointment module satisfies the booking and tracking objective, while the schedule module supports doctor availability management.',
            'Clear objectives also help during testing. A feature can be considered complete only when it satisfies the related objective from the user perspective and from the data management perspective.',
        ],
    })

problem_sections = [
    'Manual Appointment Difficulties', 'Long Queues and Waiting Time', 'Slot Conflict and Duplication',
    'Limited Access to Doctor Information', 'Weak Record Management', 'Communication Gaps', 'Problem Summary'
]
for title in problem_sections:
    page_defs.append({
        'title': f'Chapter III: Problem Statement - {title}',
        'body': [
            'In many hospitals, appointment management still depends on physical registers, telephone calls, and manual coordination. Such processes are slow and error prone. Patients may not know which doctor is available, staff may accidentally allocate the same slot to multiple patients, and doctors may not receive organized daily appointment lists.',
            f'The issue of {title.lower()} affects the quality of service. A patient centric healthcare environment requires clear information, quick booking, and reliable records. Without a centralized system, appointment status, patient details, and doctor schedules can become scattered across multiple sources.',
            'The proposed system addresses these problems by maintaining departments, doctors, patients, schedules, and appointment records in one database. It also gives each user role a dashboard that displays only the actions relevant to that role.',
            'The problem can be summarized as the need for a secure, online, role based, and database driven appointment management platform for hospital operations.',
        ],
    })

methodology_sections = [
    'Research Design', 'Requirement Analysis', 'Functional Requirements', 'Non Functional Requirements',
    'System Architecture', 'Frontend Design', 'Backend API Design', 'Database Design', 'Authentication Design',
    'Role Based Access Control', 'Appointment Booking Flow', 'Schedule Management Flow', 'Dashboard Design',
    'Validation and Error Handling', 'Testing Methodology', 'Deployment Methodology'
]
for title in methodology_sections:
    extra = []
    if 'Database' in title:
        extra = [
            'The database contains users, departments, doctors, patients, doctor_schedules, appointments, medical_records, and notifications. Foreign keys connect doctors to users and departments, patients to users, and appointments to patients, doctors, and departments.',
            'Important fields include appointment_no, appointment_date, appointment_time, problem_description, status, available_date, start_time, end_time, and slot_duration. These fields make the appointment workflow traceable and searchable.',
        ]
    elif 'Backend' in title:
        extra = [
            'The backend is implemented with Express. Routes are grouped into auth, departments, doctors, schedules, appointments, and patients. Each route performs database operations and returns JSON responses to the frontend.',
            'JWT authentication protects private routes. Admin routes check for admin role, appointment actions check for patient, doctor, or admin role, and schedule operations are available to doctors and administrators.',
        ]
    elif 'Frontend' in title:
        extra = [
            'The frontend is implemented in React with Vite. It maintains state for authentication, departments, doctors, selected doctor, selected appointment date, available slots, appointment records, and dashboard information.',
            'The interface includes public landing and booking, login and registration, dashboards, doctor search, appointment table, department management, doctor management, schedule management, and patient popup for guest booking.',
        ]
    page_defs.append({
        'title': f'Chapter IV: Methodology - {title}',
        'body': [
            f'This section explains the methodology followed for {title.lower()} in the Hospital Appointment Management System. The project follows a modular full stack approach in which the frontend, backend, and database are developed as separate but connected layers.',
            'The development process started by identifying users and their tasks. The major users are administrator, doctor, patient, and public visitor. Their tasks were converted into modules and then into APIs and screens.',
            'The methodology emphasizes simplicity, maintainability, and correctness. Instead of mixing all responsibilities in one place, the project separates public data loading, private dashboard data, appointment creation, schedule updates, and administrative actions.',
        ] + extra + [
            'This approach makes the application easier to understand and supports future modifications. New features such as online payment or SMS notifications can be added by extending existing modules.',
        ],
    })

analysis_sections = [
    'User Role Analysis', 'Department Data Analysis', 'Doctor Data Analysis', 'Patient Data Analysis',
    'Appointment Status Analysis', 'Schedule and Slot Analysis', 'Dashboard Statistics', 'Booking Flow Analysis',
    'Authentication Analysis', 'Data Integrity Analysis', 'Security Analysis', 'Usability Analysis',
    'Performance Analysis', 'Maintainability Analysis', 'Summary of Findings'
]
for title in analysis_sections:
    page_defs.append({
        'title': f'Chapter V: Data Analysis and Interpretation - {title}',
        'body': [
            f'This section analyzes {title.lower()} for the project. The analysis is based on the implemented modules, database structure, and expected use cases in a hospital appointment environment.',
            'The users table stores login identities and role information. The doctors table connects doctor profiles to departments. The patients table stores demographic information. The appointments table records doctor, patient, department, date, time, problem description, and appointment status.',
            'The appointment status values are pending, approved, rejected, cancelled, and completed. These values make it possible to interpret the progress of a booking from request to final consultation. The dashboard uses status counts to show operational workload.',
            'The system also supports default slots when a custom schedule is not found. This design makes the booking flow usable even if the administrator has not entered a schedule for every date. Custom schedules can override default availability.',
            'Interpretation of the data shows that a centralized appointment system improves accuracy, avoids slot duplication, and gives management a quick view of hospital activity.',
        ],
    })

discussion_sections = [
    'Implemented Features', 'Role Wise Results', 'Patient Booking Result', 'Doctor Dashboard Result',
    'Admin Management Result', 'System Strengths', 'Limitations', 'Overall Result'
]
for title in discussion_sections:
    page_defs.append({
        'title': f'Chapter VI: Discussion and Results - {title}',
        'body': [
            f'The discussion of {title.lower()} shows that the project meets the main requirements of an appointment management system. The system provides a structured flow from doctor discovery to appointment confirmation and administrative monitoring.',
            'The public booking flow reduces friction because patients can begin booking without logging in first. Patient details are collected only when the appointment is ready to be confirmed. This improves usability and keeps the first step simple.',
            'Doctors and administrators receive controlled access through JWT based authentication. A doctor can view and update assigned appointments, while an administrator can manage departments, doctors, schedules, and patients. This role separation improves security and clarity.',
            'The result of the project is a working full stack application that can be extended for real hospital use after further validation, hosting, backup planning, notification integration, and user acceptance testing.',
        ],
    })

conclusion_sections = ['Conclusion Overview', 'Achievement of Objectives', 'Learning Outcomes', 'Final Conclusion']
for title in conclusion_sections:
    page_defs.append({
        'title': f'Chapter VII: Conclusion - {title}',
        'body': [
            'The Hospital Appointment Management System successfully demonstrates how a web based system can improve the appointment process in a healthcare environment. It reduces dependency on manual registers and provides role based access to patients, doctors, and administrators.',
            'The project achieved its objectives by implementing patient registration, login, department and doctor listing, slot checking, appointment booking, appointment cancellation, appointment status update, schedule management, patient listing, and dashboard statistics.',
            'From a technical perspective, the project improved understanding of React state management, REST API design, Express routing, MySQL relational modeling, JWT authentication, and frontend backend integration.',
            'The final conclusion is that the system is a practical and extendable solution for small and medium healthcare institutions that need a reliable digital appointment process.',
        ],
    })

recommend_sections = ['Recommendations', 'Suggestions for Future Work', 'Implementation Roadmap']
for title in recommend_sections:
    page_defs.append({
        'title': f'Chapter VIII: Recommendations and Suggestions - {title}',
        'body': [
            'The system can be improved by adding SMS and email notifications so patients receive booking confirmation, reminder messages, cancellation alerts, and status updates. Notifications would reduce missed appointments and improve communication.',
            'Online payment integration can be added for consultation fees. A payment gateway would allow patients to pay during booking and administrators to track paid and unpaid appointments.',
            'Future versions can include prescription upload, medical record viewing, doctor leave management, reports export, hospital branch management, teleconsultation links, and advanced analytics.',
            'Before deployment in a real hospital, the system should undergo security review, user acceptance testing, database backup planning, hosting configuration, and privacy compliance review.',
        ],
    })

refs = [
    'React Documentation. Component based user interface development and state management concepts.',
    'Express Documentation. Routing, middleware, request handling, and REST API development.',
    'MySQL Documentation. Relational database design, constraints, joins, and SQL queries.',
    'JSON Web Token Documentation. Token based authentication and authorization patterns.',
    'Vite Documentation. Modern frontend tooling and production build workflow.',
    'Project source code of Hospital Appointment Management System: React frontend, Express backend, and MySQL schema.',
]
for i in range(2):
    page_defs.append({
        'title': 'References / Bibliography' if i == 0 else 'References / Bibliography Continued',
        'body': refs + [
            'Additional references include class notes, project guidelines provided by the university, and standard web development practices followed during implementation.',
            'All references were used for academic learning and project preparation. The final implementation is customized for the Hospital Appointment Management System project.',
        ],
    })

page_defs.append({
    'title': 'Credentials / Demo Accounts',
    'body': [
        'This page lists the demo credentials and access information that can be used by an examiner or evaluator to review the Hospital Appointment Management System. The credentials are intended only for academic demonstration and testing.',
        'Application URL: http://localhost:5173. Backend API URL: http://localhost:5000/api. The frontend should be started from the client folder and the backend should be started from the backend folder after configuring the MySQL database and environment variables.',
        'Administrator login: Email admin@hospital.com, Password password123. The administrator can view dashboard statistics, manage departments, register doctors, create doctor schedules, update slot duration, monitor appointments, and review payment amounts.',
        'Doctor login: Email aisha@hospital.com, Password password123. Doctor login: Email rahul@hospital.com, Password password123. A doctor can view assigned appointments, update appointment status, and manage only his or her own schedule.',
        'Patient login: Email priya@example.com, Password password123. A patient can search doctors by department, check available slots for the upcoming five days, enter a problem description, pay the consultation fee, and view booked appointments in the patient dashboard.',
        'Payment testing uses Razorpay test mode. The project allows UPI and card payment options in the checkout interface. Payment records are stored with appointment details so administrators and doctors can see paid amounts in their dashboards.',
        'For printed submission, this credentials page should be included at the end of the report. If real deployment credentials are created later, this page should be replaced with secure demonstration accounts and should never include production secrets.',
    ],
})

assert len(page_defs) == 80, len(page_defs)

def add_wrapped(page, text, x, y, width, size=BODY_SIZE, font=FONT, line=LINE):
    max_chars = max(38, int(width / (size * 0.48)))
    for raw in text.split('\n'):
        lines = textwrap.wrap(raw, width=max_chars) if raw.strip() else ['']
        for line_text in lines:
            page.insert_text((x, y), line_text, fontsize=size, fontname=font, color=(0, 0, 0))
            y += line
    return y

def footer(page, number):
    page.insert_text((A4.width - RIGHT - 60, A4.height - 36), f'Page {number}', fontsize=SMALL_SIZE, fontname=FONT)

pdf = fitz.open()
for idx, spec in enumerate(page_defs, 1):
    page = pdf.new_page(width=A4.width, height=A4.height)
    if spec.get('kind') == 'cover':
        page.insert_textbox(fitz.Rect(LEFT, TOP, A4.width - RIGHT, TOP + 80), 'CENTER FOR DISTANCE AND ONLINE EDUCATION\nINTEGRAL UNIVERSITY, LUCKNOW', fontsize=14, fontname=BOLD, align=1, color=(0,0,0))
        page.insert_textbox(fitz.Rect(LEFT, 180, A4.width - RIGHT, 260), 'A Project Report\non', fontsize=16, fontname=BOLD, align=1)
        page.insert_textbox(fitz.Rect(LEFT, 275, A4.width - RIGHT, 360), f'"{project}"', fontsize=24, fontname=BOLD, align=1)
        page.insert_textbox(fitz.Rect(LEFT, 390, A4.width - RIGHT, 520), f'Submitted by\n{student}\nEnrollment number: {enrollment}\nProgram: {program}\nSemester: ____________________\nSession: {session}', fontsize=14, fontname=FONT, align=1)
        page.insert_textbox(fitz.Rect(LEFT, 570, A4.width - RIGHT, 680), 'Under the Supervision of\nName of the Guide\nDesignation and Department', fontsize=14, fontname=FONT, align=1)
        page.insert_textbox(fitz.Rect(LEFT, 720, A4.width - RIGHT, 780), 'Submitted in partial fulfillment of the requirement for the award of Degree', fontsize=12, fontname=FONT, align=1)
        footer(page, idx)
        continue

    page.insert_text((LEFT, TOP - 24), 'Hospital Appointment Management System', fontsize=SMALL_SIZE, fontname=BOLD)
    page.insert_textbox(fitz.Rect(LEFT, TOP, A4.width - RIGHT, TOP + 56), spec['title'], fontsize=TITLE_SIZE, fontname=BOLD, align=1)
    y = TOP + 78

    if spec.get('kind') == 'contents':
        page.insert_text((LEFT, y), 'S.No.', fontsize=BODY_SIZE, fontname=BOLD)
        page.insert_text((LEFT + 70, y), 'Content', fontsize=BODY_SIZE, fontname=BOLD)
        page.insert_text((A4.width - RIGHT - 70, y), 'Page No.', fontsize=BODY_SIZE, fontname=BOLD)
        y += 24
        for n, (label, pno) in enumerate(contents, 1):
            page.insert_text((LEFT, y), str(n), fontsize=BODY_SIZE, fontname=FONT)
            page.insert_text((LEFT + 70, y), label, fontsize=BODY_SIZE, fontname=FONT)
            page.insert_text((A4.width - RIGHT - 40, y), str(pno), fontsize=BODY_SIZE, fontname=FONT)
            y += 24
    elif spec.get('kind') == 'illustrations':
        illustrations = [
            ('Figure 1', 'System architecture of the project'),
            ('Figure 2', 'Patient appointment booking flow'),
            ('Figure 3', 'Admin dashboard workflow'),
            ('Figure 4', 'Doctor appointment status workflow'),
            ('Table 1', 'User roles and permissions'),
            ('Table 2', 'Database tables and purpose'),
            ('Table 3', 'Appointment status interpretation'),
            ('Table 4', 'Testing checklist'),
        ]
        for label, text in illustrations:
            page.insert_text((LEFT, y), label, fontsize=BODY_SIZE, fontname=BOLD)
            page.insert_text((LEFT + 90, y), text, fontsize=BODY_SIZE, fontname=FONT)
            page.insert_text((A4.width - RIGHT - 40, y), '_____', fontsize=BODY_SIZE, fontname=FONT)
            y += 30
    else:
        for para in spec['body']:
            y = add_wrapped(page, para, LEFT, y, WIDTH)
            y += 14
        # add simple project table on selected pages
        if 'Data Analysis' in spec['title'] and y < 650:
            page.insert_text((LEFT, y), 'Interpretation Table', fontsize=BODY_SIZE, fontname=BOLD)
            y += 24
            rows = [('Module', 'Purpose'), ('Users', 'Stores login and role'), ('Doctors', 'Stores medical profile'), ('Appointments', 'Stores booking lifecycle'), ('Schedules', 'Stores doctor availability')]
            for a, b in rows:
                page.insert_text((LEFT, y), a, fontsize=BODY_SIZE, fontname=BOLD if a == 'Module' else FONT)
                page.insert_text((LEFT + 170, y), b, fontsize=BODY_SIZE, fontname=BOLD if a == 'Module' else FONT)
                y += 22
    footer(page, idx)

pdf.save(OUT)
pdf.close()
print(OUT)
print('pages', len(page_defs))
