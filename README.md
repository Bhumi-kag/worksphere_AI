# WorkSphere AI – AI-Powered Workplace Resource Management System

An intelligent, full-stack enterprise workplace resource scheduling and facility management platform powered by **FastAPI**, **React.js**, **MySQL**, and **Scikit-learn** machine learning models.

---

## 1. Project Overview

**WorkSphere AI** solves the complex logistical challenges of modern corporate resource allocation. By unifying conference room scheduling, fitness facility slots, cafeteria reservations, and parking stalls under an intelligent system, WorkSphere AI eliminates double-booking conflicts, minimizes wasted space, and provides data-driven workplace utilization forecasts for operations teams.

Key differentiators:
- **Smart Slot Recommendation**: Uses a trained **Scikit-learn Random Forest** model to rank available time slots based on expected demand, optimal capacity match, and low congestion.
- **WorkSphere AI Copilot**: A natural language workplace assistant that parses user intent, queries live resource availability, and prepares verified booking cards with one-click confirmation.
- **AI-Based Complaint Categorization**: An NLP classification engine that automatically categorizes employee workplace complaints (Maintenance, Cleanliness, Facility Issue, Booking Issue, Parking Issue, Other) with transparent confidence scoring.
- **Admin AI Insights**: Generates data-driven resource utilization intelligence, peak-demand schedules, and actionable resource allocation suggestions directly from real MySQL records.
- **Enterprise SaaS Admin Dashboard**: Modern executive command center with navy/slate futuristic theme, real-time metrics, audit logs, employee management, and operational policies.

---

## 2. Features

### Employee Portal
- **Secure Authentication**: JWT-based session security, bcrypt password hashing, and role-based permissions.
- **Workplace Overview**: Real-time summary of upcoming reservations, recent activity, and facility availability.
- **Live Facility Booking**: Interactive booking interface with start/end time validation, past-date protection, and capacity constraints.
- **Smart Slot Recommendations**: Find optimal booking slots by date, time window, duration, and attendee count, complete with match score percentages and congestion explanations.
- **WorkSphere AI Copilot**: Ask natural-language requests like *"Find a meeting room tomorrow at 11 AM for 8 people"* or *"Show my upcoming bookings"*.
- **Complaint Submission & AI Auto-Categorization**: Automatic category suggestion as employees describe their workplace issues.
- **My Bookings Management**: Real-time status tracking and self-service cancellation.

### Admin Console
- **Executive Dashboard Overview**: Live counts for total employees, facilities, available resources, total bookings, active bookings, and pending complaints.
- **AI Workplace Intelligence**: Real-time analysis of peak booking days, peak hours, most/least requested resources, and prioritized recommendations.
- **Employee Management**: Search, register authorized staff with 10-digit phone and password complexity validation, edit details, or safely deactivate accounts.
- **Facility Management**: Add, modify, toggle availability, set capacity, and filter across Meeting Rooms, Gyms, Cafeterias, and Parking slots.
- **Booking Management**: Search by employee or facility, filter by date and status, and cancel bookings with administrative override.
- **Complaint Management**: Filter by category and status, assign resolution remarks, and highlight urgent unresolved tickets.
- **Visual Statistics**: Visual distributions of bookings by facility type, weekly demand patterns, and complaint categories.
- **Security & Preferences**: Real-time administrator password change endpoint and live workplace policy toggles.

---

## 3. Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 19, Vite, React Router DOM 7 | Modern reactive single-page enterprise dashboard |
| **Styling** | Vanilla CSS3 (Custom Design System) | Modern enterprise SaaS layout with dark navy AI sidebar & clean typography |
| **Backend** | Python 3.14+, FastAPI, Starlette | High-performance asynchronous REST API with Swagger documentation |
| **ORM & DB** | SQLAlchemy 2.0, PyMySQL | Object-relational mapping, connection pooling, and transactional integrity |
| **Database** | MySQL Server 8.0+ | Relational data store for users, facilities, bookings, and complaints |
| **Authentication** | JWT (python-jose), bcrypt | Stateless bearer token authentication with role-based access control (RBAC) |
| **Machine Learning** | Scikit-learn, Joblib, NumPy, SciPy | Random Forest slot demand regression & TF-IDF text classification |

---

## 4. Project Architecture

```
                                  +---------------------------------------+
                                  |         WorkSphere AI Web Client      |
                                  |   (React 19 + Vite SPA on Port 5173)   |
                                  +-------------------+-------------------+
                                                      |
                                           REST API / JWT Bearer
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |         FastAPI REST Backend          |
                                  |   (Uvicorn ASGI Server on Port 8000)  |
                                  +---------+-------------------+---------+
                                            |                   |
                        SQLAlchemy Sessions |                   | Joblib Pipeline
                                            v                   v
+---------------------------------------+   |   +---------------------------------------+
|             MySQL Database            |   |   |        AI / Machine Learning Engine   |
|            (worksphere_db)            |<--+   |         (worksphere-ml Package)       |
|---------------------------------------|       |---------------------------------------|
| - users (Auth, Roles: EMP, ADMIN)     |       | - Random Forest Slot Demand Regressor |
| - facilities (Capacities, Status)     |       | - TF-IDF Complaint Text Classifier    |
| - bookings (Date, Timeslot, Status)   |       | - Constraint-Satisfaction Ranking     |
| - complaints (Category, Status, Notes)|       | - Data-Driven Insights Generator      |
+---------------------------------------+       +---------------------------------------+
```

---

## 5. Folder Structure

```
WorkSphere-AI/
├── .env.example                       # Root environment variables template
├── .gitignore                         # Git exclusion rules
├── requirements.txt                   # Complete Python backend and ML dependencies
├── test_full_system.py                # Automated end-to-end integration test runner
├── README.md                          # Project documentation
│
├── worksphere-backend-python/         # FastAPI REST Backend
│   ├── .env.example                   # Backend environment configuration template
│   ├── requirements.txt               # Backend Python dependencies
│   ├── main.py                        # FastAPI application & route controllers (30 endpoints)
│   ├── database.py                    # SQLAlchemy engine, session maker, get_db dependency
│   ├── auth.py                        # JWT creation, decoding, and expiration logic
│   ├── models.py                      # Facility SQLAlchemy model
│   ├── user_model.py                  # User SQLAlchemy model (employees & admins)
│   ├── booking_model.py               # Booking SQLAlchemy model
│   ├── complaint_model.py             # Complaint SQLAlchemy model
│   ├── facility_schema.py             # Pydantic schemas for facilities
│   ├── user_schema.py                 # Pydantic schemas for users & password changes
│   ├── booking_schema.py              # Pydantic schemas for bookings & slot recommendations
│   ├── complaint_schema.py            # Pydantic schemas for complaints & AI categorization
│   ├── login_schema.py                # Pydantic schemas for authentication
│   ├── seed_data.py                   # Initial facility seed script
│   ├── ml_service.py                  # Interface bridging FastAPI to ML models
│   └── insights_service.py            # MySQL data analytics & insight generation engine
│
├── worksphere-ml/                     # Machine Learning & AI Module
│   ├── dataset_generator.py           # Historical workplace utilization data synthesis
│   ├── train_slot_model.py            # Random Forest slot demand model training & evaluation
│   ├── train_complaint_classifier.py  # TF-IDF + Logistic Regression complaint classifier
│   ├── recommendation_engine.py       # Core smart slot recommendation & constraint engine
│   ├── complaint_categorizer.py       # Hybrid NLP complaint classification with fallback
│   └── models/                        # Serialized ML model binaries (.joblib)
│       ├── slot_demand_model.joblib
│       └── complaint_classifier.joblib
│
└── worksphere-frontend/               # React + Vite Frontend
    ├── package.json                   # Dependencies (React 19, React Router 7)
    ├── vite.config.js                 # Vite development & build configuration
    ├── index.html                     # HTML root template
    └── src/
        ├── main.jsx                   # React entry point
        ├── App.jsx                    # Routing table & public landing page
        ├── App.css                    # Global design system & landing page styles
        ├── index.css                  # Base reset & typography
        ├── pages/
        │   ├── Login.jsx              # Employee & Admin authentication page
        │   ├── EmployeeDashboard.jsx  # Employee portal (Bookings, AI Rec, Complaints)
        │   ├── EmployeeDashboard.css  # Futuristic employee dashboard design system
        │   ├── AdminDashboard.jsx     # Modern enterprise SaaS Admin console
        │   ├── AdminDashboard.css     # Unified admin styling with dark navy sidebar
        │   └── EmployeeManagement.jsx # Admin employee management table & modal
        └── components/
            ├── FacilityManagement.jsx # Admin facility management
            ├── BookingManagement.jsx  # Admin booking audits & cancellation
            ├── ComplaintManagement.jsx# Admin complaint resolution & remarks
            ├── AdminStatistics.jsx    # Real data utilization charts & distributions
            ├── AdminSettings.jsx      # Admin profile, password change & policies
            ├── WorkSphereCopilot.jsx  # AI conversational booking assistant
            └── WorkSphereCopilot.css  # Copilot chat styling
```

---

## 6. Database Setup

### 1. Ensure MySQL Server is Running
Ensure your local or cloud MySQL server is active (default port `3306`).

### 2. Create the Database
Open MySQL CLI or Workbench and execute:
```sql
CREATE DATABASE IF NOT EXISTS worksphere_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Verify Database Tables
FastAPI automatically initializes the tables on startup via SQLAlchemy `Base.metadata.create_all(bind=engine)`:
- `users`: ID, name, email (unique), phone (unique), password (bcrypt), role (`ADMIN` or `EMPLOYEE`).
- `facilities`: ID, name, type, capacity, available (boolean).
- `bookings`: ID, user_id, user_name, facility_id, booking_date, start_time, end_time, status.
- `complaints`: ID, user_id, user_name, category, subject, description, status, admin_remark, created_at.

---

## 7. Environment Variable Setup

Copy `.env.example` to `.env` in `worksphere-backend-python/` (and optionally in root):

```bash
cp worksphere-backend-python/.env.example worksphere-backend-python/.env
```

Configuration variables:
```ini
# MySQL Connection URL (format: mysql+pymysql://<user>:<password>@<host>:<port>/<database>)
DATABASE_URL=mysql+pymysql://root:WorkSphere%40123@localhost:3306/worksphere_db

# JWT Secret Key for token signing (use a high-entropy string in production)
SECRET_KEY=worksphere-secret-key-2026

# JWT Algorithm
ALGORITHM=HS256

# Token expiration in minutes
ACCESS_TOKEN_EXPIRE_MINUTES=120

# Allowed CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> **Security Note:** `.env` is ignored by Git in `.gitignore` to prevent secret exposure.

---

## 8. Backend Installation & Setup

1. **Activate Python Virtual Environment**:
   ```powershell
   # Windows PowerShell
   .\venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Train / Verify AI & ML Models**:
   ```bash
   python worksphere-ml/train_slot_model.py
   python worksphere-ml/train_complaint_classifier.py
   ```

4. **Run FastAPI Backend**:
   ```bash
   cd worksphere-backend-python
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

FastAPI interactive documentation will be accessible at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 9. Frontend Installation & Setup

1. **Navigate to the Frontend Directory**:
   ```bash
   cd worksphere-frontend
   ```

2. **Install Node Packages**:
   ```bash
   npm install
   ```

3. **Start Vite Development Server**:
   ```bash
   npm run dev
   ```

The application will be live at:
- **Frontend URL**: [http://localhost:5173](http://localhost:5173)

---

## 10. Default User Credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Administrator** | `admin@worksphere.com` | `Admin@123` | Full admin console, metrics, facility/staff/ticket management |
| **Employee** | `employee@worksphere.com` | `Employee@123` | Employee dashboard, bookings, ML recommendations, Copilot |
| **Employee** | `bhumi@gmail.com` | `Bhumi@123` | Authorized employee account |

---

## 11. Machine Learning Implementation Details

### Smart Slot Demand Model
- **Algorithm**: `RandomForestRegressor(n_estimators=100, max_depth=10, min_samples_split=4, random_state=42)`
- **Target**: Continuous workplace resource utilization / demand rate (`0.05` to `0.98`).
- **Feature Set**:
  1. `facility_type_code` (Categorical encoded: 0=Meeting Room, 1=Gym, 2=Cafeteria, 3=Parking)
  2. `day_of_week` (0=Monday to 6=Sunday)
  3. `is_weekday` (Binary indicator)
  4. `hour_of_day` (8 to 20)
  5. `duration_minutes` (30, 60, 90, 120)
  6. `capacity` (Facility capacity)
  7. `attendees` (Requested party size)
  8. `attendee_capacity_ratio` (Occupancy fitness metric: `attendees / capacity`)
- **Evaluation on Unseen Test Split (80/20 train/test split)**:
  - Mean Absolute Error (MAE): `0.0370`
  - Root Mean Squared Error (RMSE): `0.0465`
  - R² Score: `0.9701`
- **Output Scoring**: Blends capacity fitness (50%) and demand congestion forecast (50%) into an explainable **Recommendation Score (0-100%)** with clear tags:
  - `< 35%`: *Low Demand (Quiet & Highly Available)*
  - `35% – 70%`: *Moderate Demand (Optimal Balance)*
  - `> 70%`: *High Demand (Popular Peak Time)*
- **Constraint Handling**: Evaluates hard constraints strictly before running regression: eliminates overlapping bookings, inactive facilities, and under-capacity rooms.

### Complaint NLP Categorizer
- **Pipeline**: `TfidfVectorizer(ngram_range=(1, 2))` + `LogisticRegression(C=5.0)`
- **Categories**: `Facility Issue`, `Booking Issue`, `Cleanliness`, `Maintenance`, `Parking Issue`, `Other`
- **Hybrid Heuristic Fallback**: Transparently pairs ML classification with keyword domain patterns; reports classification method and confidence score to the user.

---

## 12. API Documentation Summary

### Authentication & Account
- `POST /login` – Authenticate user and issue JWT token.
- `POST /auth/change-password` – Secure password update with current password verification.

### Facilities
- `GET /facilities` – List all registered workplace facilities.
- `GET /admin/facilities` – Admin list with availability statuses.
- `POST /admin/facilities` – Create new facility (Admin only).
- `PUT /admin/facilities/{id}` – Update facility name, capacity, and availability (Admin only).
- `DELETE /admin/facilities/{id}` – Delete facility if no active reservations exist (Admin only).

### Bookings & Smart Recommendations
- `POST /bookings` – Reserve a facility (validates past date, inverted time, capacity, and overlap).
- `GET /bookings` – Retrieve current employee's bookings with facility details.
- `DELETE /bookings/{id}` – Cancel an existing booking.
- `POST /recommendations/smart-slots` – Run ML smart slot recommendation engine.
- `GET /admin/bookings` – Audit all employee bookings across the organization.
- `PATCH /admin/bookings/{id}/cancel` – Administrative booking cancellation.

### Complaints & AI Routing
- `POST /complaints` – Submit an issue ticket.
- `GET /complaints` – View current employee's submitted tickets.
- `POST /ai/categorize-complaint` – AI NLP category suggestion for complaint text.
- `GET /admin/complaints` – Review all company complaints.
- `PATCH /admin/complaints/{id}` – Update status (`Pending`, `In Progress`, `Resolved`) and add admin remarks.

### Admin Intelligence & Operations
- `GET /admin/dashboard-stats` – Live overview metrics from database records.
- `GET /admin/ai-insights` – Data-driven workplace intelligence, peak patterns, and recommendations.
- `GET /admin/employees` – List all authorized employees.
- `POST /admin/employees` – Onboard new employee account with phone & password validation.
- `PUT /admin/employees/{id}` – Update employee profile.
- `DELETE /admin/employees/{id}` – Remove employee account safely.

---

## 13. Testing Instructions

To run the full automated system integration suite:

```powershell
# From project root
& ".\venv\Scripts\python.exe" test_full_system.py
```

Expected output:
```
======================================================================
         WORKSPHERE AI - SYSTEM INTEGRATION & VERIFICATION TEST
======================================================================

--- 1. Database & User Records Verification ---
[PASS] Admin user exists in database (Admin: admin@worksphere.com)
[PASS] Employee user exists in database (Employee: bhumi@gmail.com)
[PASS] All standard workplace facility types present (Count: 4)

--- 2. Authentication & Access Control Tests ---
[PASS] Invalid password rejected with HTTP 401 
[PASS] Employee blocked from admin route with HTTP 403 
[PASS] Admin passed admin role check 

--- 3. Booking Reliability & Validation Tests ---
[PASS] Inverted time window rejected with HTTP 400 
[PASS] Past date rejected with HTTP 400 
[PASS] Capacity violation rejected with HTTP 400 
[PASS] Booking created successfully (Booking #7)
[PASS] Overlapping reservation blocked with HTTP 409 Conflict 
[PASS] Employee cancelled booking successfully 

--- 4. AI/ML Smart Slot Recommendation Tests ---
[PASS] Smart recommendations generated (Found 5 slots)
[PASS] Slot includes ML recommendation score (Score: 87.0%)
[PASS] Slot includes explainable reasoning (Explanation: Recommended Meeting Room 1...)
[PASS] Ranked using trained Random Forest ML model 

--- 5. AI NLP Complaint Categorization Tests ---
[PASS] Identified Maintenance issue (Category: Maintenance)
[PASS] Identified Cleanliness issue (Category: Cleanliness)

--- 6. Admin AI Insights & Data-Driven Metrics Tests ---
[PASS] Real employee count computed (5 employees)
[PASS] Real facility count computed (4 facilities)
[PASS] Peak booking day identified (Peak: Friday)
[PASS] Actionable workplace suggestions generated (4 recommendations)

======================================================================
TEST RESULTS: 22 PASSED, 0 FAILED.
======================================================================
```

---

## 14. Production Deployment Guidelines

### 1. Frontend Production Build
To generate an optimized, static client build:
```bash
cd worksphere-frontend
npm run build
```
Deploy the resulting `dist/` directory to **Vercel**, **Netlify**, or an **AWS S3 + CloudFront** distribution.
Ensure your frontend environment or API base URL points to your deployed backend domain instead of `http://127.0.0.1:8000`.

### 2. FastAPI Backend Deployment
Deploy the backend using a production ASGI server like **Gunicorn** with **Uvicorn** workers behind a reverse proxy (**Nginx** or **Traefik**):

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 3. Managed MySQL Hosting
Host the database using **AWS RDS for MySQL**, **Google Cloud SQL**, or a secure self-hosted MySQL 8.0 instance.
- Enable automatic daily snapshots and binary logging.
- Set `max_connections` according to your worker pool.
- Use TLS/SSL connections: `mysql+pymysql://user:pass@host:3306/db?ssl_ca=/path/to/ca.pem`.

### 4. Production Security Checklist
- Set a strong, randomly generated `SECRET_KEY` (e.g. `openssl rand -hex 32`).
- Set `CORS_ORIGINS` to strictly match your production frontend domain (e.g. `https://worksphere.yourcompany.com`).
- Enable HTTPS via SSL/TLS certificates (e.g. Let's Encrypt / Certbot).
- Store all sensitive environment variables in secure secret managers (e.g. AWS Secrets Manager, GitHub Secrets, or Docker Secrets).

---

## 15. License & Project Attribution

Developed as a minor/final-year project for **WorkSphere AI – Intelligent Workplace Resource Management System**.

© 2026 WorkSphere AI. Built with React, FastAPI, MySQL, and Scikit-learn.
