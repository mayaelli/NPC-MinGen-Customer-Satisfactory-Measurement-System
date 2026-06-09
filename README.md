# MinGen NAPOCOR — Digital Customer Satisfaction Measurement System

A full-stack web application that digitizes the Customer Satisfaction Measurement (CSM) process for the **National Power Corporation — Mindanao Generation Group**. Built to replace manual paper forms and spreadsheet-based reporting in compliance with ARTA (Anti-Red Tape Authority) and Civil Service Commission requirements.

---

## Overview

The system provides two interfaces:

- **Public Survey Form** — a digital replica of the official ARTA CSM form where clients rate NPC services after their transaction
- **Admin Portal** — a role-based management panel for NPC staff to monitor submissions, manage offices and services, and generate official compliance reports

---

## Features

| Feature | Description |
|---|---|
| Digital CSM Survey | Citizen-facing form with CC questions, 9-dimension SQD rating scale, and digital signature capture |
| Dashboard | Live KPI tiles, monthly trendline chart, and recent submission feed |
| Office Directory | Register and manage NPC offices with auto-generated login accounts |
| ARTA Service Manifest | Add, edit, archive, and restore INTERNAL/EXTERNAL services per office |
| Feedback Stream | Paginated survey results with period/office filters and PDF export per record |
| Compliance Reports | Auto-generated CC, SQD, CSM Tabulation, and Score Per Service reports |
| Bulk Export | Export filtered surveys as individual PDFs packaged in a single ZIP with progress bar |
| Excel Export | All four compliance reports in a single multi-sheet Excel workbook |
| Identity Provisioning | Granular RBAC for NPC employees with per-permission access control |
| Session Security | 8-hour idle timeout, rate-limited login (5 attempts / 5 min lockout) |
| Archive Pattern | Services are soft-deleted to preserve historical report data integrity |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | ReactJS 19 + Vite |
| Styling | Tailwind CSS 4 |
| Backend | PHP 8 (REST API) |
| Database | MySQL |
| Local Server | XAMPP (Apache + MySQL) |
| PDF Generation | html2pdf.js |
| ZIP Packaging | JSZip + FileSaver.js |
| Charts | Recharts |
| Excel Export | SheetJS (xlsx) |
| Icons | Lucide React |

---

## Project Structure

```
MinGen CSM/
├── minGen-api/                  ← PHP REST API (served by Apache)
│   ├── auth/                    ← login, refresh_session, change_password
│   ├── config/                  ← db.php (PDO connection + logAction)
│   └── survey/                  ← all data endpoints (CRUD)
│
├── minGen-csm/                  ← React frontend (Vite)
│   └── src/
│       ├── App.jsx              ← root router
│       ├── pages/
│       │   ├── admin-pages/     ← all admin modules
│       │   ├── reports/         ← 4 printable report components
│       │   ├── DashboardPage.jsx
│       │   └── SurveyForm.jsx
│       └── utils/
│           └── permissions.js   ← client-side RBAC helpers
│
├── uploads/signatures/          ← citizen signature image storage
├── mingen_csm db.sql            ← full database export
├── schema_migration.sql         ← incremental migration reference
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js LTS](https://nodejs.org/)
- [XAMPP](https://www.apachefriends.org/) with PHP 8+ and MySQL
- [VSCode](https://code.visualstudio.com/) *(recommended)*

### 1. Clone the Repository

```bash
git clone https://github.com/mayaelli/NPC-MinGen-Customer-Satisfactory-Measurement-System.git "MinGen CSM"
```

Move the cloned folder into your XAMPP web root:
```
C:\xampp\htdocs\MinGen CSM\
```

> The folder must be named exactly `MinGen CSM`. The PHP API uses URL-encoded paths (`MinGen%20CSM`) that depend on this name.

### 2. Start XAMPP

Open the XAMPP Control Panel and start both **Apache** and **MySQL**.

### 3. Set Up the Database

1. Go to `http://localhost/phpmyadmin/`
2. Create a new database named `mingen_csm`
3. Import `mingen_csm db.sql` from the project root via the Import tab

### 4. Install Frontend Dependencies

```bash
cd minGen-csm
npm install
```

### 5. Start the Development Server

```bash
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## Role Overview

| Role | Access Level |
|---|---|
| `super_admin` | Full system access |
| `admin` | Full data access, cannot manage provisioned users |
| `manager` | Plant-level data (all offices within their plant) |
| `office` | Single office data only |
| `provisioned` | Granular per-permission access set by super admin |
| `auditor` *(flag)* | Cross-plant read access granted per office |

---

## Compliance Report Document Codes

| Report | Code |
|---|---|
| CC Evaluation Table | MGG-IMS-006.F03 |
| SQD Evaluation Table | MGG-IMS-006.F04 |
| CSM Tabulation | MGG-IMS-006.F02 |
| Score Per Service | MGG-IMS-006.F05 |

---

## License

This system was developed as an OJT capstone project for the **National Power Corporation — Mindanao Generation Group**.

---

*Developed by Marhamah S. Ali*
