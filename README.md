<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Online Examination System
A comprehensive full-stack application for managing and taking online tests, featuring student and administrator panels.

## Features
- **Student Portal**: Take assigned tests, view history, and results.
- **Admin Portal**: Create, edit, and manage tests; view all student submissions; and manage student accounts.
- **Authentication**: Secure JWT-based authentication with password hashing.
- **SQLite Database**: Lightweight, simple setup for saving users, tests, and results.

## Requirements
- **Node.js** (v18 or newer recommended)
- **npm** (comes with Node.js)

## Setup Instructions

Follow these steps to run the application on any computer:

### 1. Clone or Copy the Repository
Download the project files to the new computer and navigate into the project directory.

### 2. Install Dependencies
Install all required Node.js packages by running:
```bash
npm install
```

### 3. Setup Environment Variables
If the project requires environment variables (e.g., for JWT secrets or API keys), copy the example file:
```bash
cp .env.example .env
```
*(Optionally, open `.env` and fill in any required values like `GEMINI_API_KEY` if applicable).*

### 4. Setup the Database
This application uses SQLite. The initial schemas are automatically created when the server starts. However, it is a good practice to run the migration scripts to ensure all columns (like `duration_minutes`, `name`, `surname`, `group_number`) are present:
```bash
npx tsx migrate_db.ts
npx tsx migrate_duration.ts
```

### 5. Start the Application
Run the development server. This command will start both the frontend and backend:
```bash
npm run dev
```

### 6. Access the Application
Open your web browser and navigate to:
```
http://localhost:3000
```

---

### Default Login
A default admin account is created automatically when the server first runs.
- **Username**: `admin`
- **Password**: `admin123`
