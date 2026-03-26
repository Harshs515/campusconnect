# CampusConnect

A full-stack campus placement platform built with React, TypeScript, Express, and PostgreSQL.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up PostgreSQL database
```bash
# Create the database (run in terminal)
psql -U postgres -c "CREATE DATABASE campusconnect;"

# Create all tables
psql -U postgres -d campusconnect -f 01_schema.sql

# Load demo data
psql -U postgres -d campusconnect -f 02_seed_data.sql
```

### 3. Configure environment
Edit `.env.local` and set your PostgreSQL password:
```
VITE_DB_PASSWORD=your_actual_postgres_password
```

### 4. Start the app
```bash
npm run dev:all
```

Then open http://localhost:5173 in your browser.

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | student@demo.com | password |
| Recruiter | recruiter@demo.com | password |
| Admin | admin@demo.com | password |

## Project Structure

```
campusconnect/
├── src/
│   ├── components/       All UI components
│   │   ├── Admin/        Admin pages (Alumni, Analytics, UserManagement)
│   │   ├── Auth/         Login, Signup, ForgotPassword
│   │   ├── Dashboard/    Role-based dashboards
│   │   ├── Events/       Campus events & RSVP
│   │   ├── Jobs/         Job search, post, apply
│   │   ├── Layout/       Navbar, Sidebar, DashboardLayout
│   │   ├── Messages/     Real-time messaging
│   │   ├── Profile/      User profile editor
│   │   └── Social/       Feed & Connections
│   ├── contexts/         React Context (Auth, Data, Social, Notifications)
│   ├── hooks/            Custom hooks (useAlumni)
│   ├── lib/              Supabase client
│   └── utils/            Helpers, constants
├── server.js             Express API server
├── 01_schema.sql         Database schema
├── 02_seed_data.sql      Demo data
└── .env.local            Environment config
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start React frontend only |
| `npm run dev:server` | Start Express API only |
| `npm run dev:all` | Start both together |
| `npm run build` | Build for production |
