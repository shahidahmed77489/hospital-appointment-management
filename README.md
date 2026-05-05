# Hospital Appointment Management

MCA final year project built with React, Express, JWT authentication, and MySQL.

## Features

- Patient registration and login
- Admin, doctor, and patient dashboards
- Department and doctor management
- Doctor schedule management
- Available slot lookup
- Appointment booking, cancellation, approval, rejection, and completion
- Appointment history and dashboard statistics

## Setup

1. Create the MySQL database and seed demo data:

```sql
SOURCE backend/database/schema.sql;
```

If you are running the command from MySQL CLI, use the full local path to `schema.sql`.

2. Configure backend environment:

```bash
cd backend
copy .env.example .env
```

Update `.env` if your MySQL username or password is different.

3. Start the backend:

```bash
cd backend
npm install
npm run dev
```

4. Start the React client:

```bash
cd client
npm install
npm run dev
```

## Demo Accounts

All seeded users use this password:

```txt
password123
```

- Admin: `admin@hospital.com`
- Doctor: `aisha@hospital.com`
- Doctor: `rahul@hospital.com`
- Patient: `priya@example.com`

## API Base URL

The frontend uses `http://localhost:3000/api` by default. To change it, create `client/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```
