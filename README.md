# Refugee-Management-System (RMS)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![Flask](https://img.shields.io/badge/Flask-2.0%2B-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-blueviolet)
A full-stack web application designed to streamline operations for humanitarian aid camps. Features role-based access control for Camp Managers and Refugees, automated inventory tracking via SQL triggers, and real-time analytics dashboards. Built with Flask, MySQL, and Tailwind CSS.

## 📖 Overview
The **Refugee Management System** is a full-stack centralized platform designed to streamline humanitarian aid operations. It replaces manual record-keeping with a secure, digital ecosystem that connects Camp Managers, Volunteers, Refugees, and Donors.

The system ensures transparency in aid distribution, automates occupancy tracking, and empowers refugees with a self-service portal to track their integration journey.

---

##  System Walkthrough

### 1. Unified Access Control
A central hub allowing secure, role-based login for all stakeholders, from Administrators to Refugees.

### 2. Admin Command Center
Top-level view of the entire operation. Administrators can track system health, audit recent activities, view donation streams, and forecast resource needs (Food, Medicine, etc.).

### 3. Camp Manager Console
Dedicated tools for on-ground operations. Managers can register new refugees, oversee camp occupancy in real-time, and trigger aid distribution protocols.

### 4. Volunteer Field Hub
A mobile-responsive interface for volunteers to track their assignments, view schedules, and log field activities efficiently.

### 5. Refugee Self-Service Portal
Empowering refugees with data. Features an **"Integration Journey"** progress bar (tracking Registration → Health Checks → Skills Training) and a personal history of aid received.

### 6. Donor Transparency Portal
Building trust through data. Donors can track their financial and in-kind contributions, view global impact stats, and download audit reports.


---

## ✨ Key Features

### 👨‍💼 Operations & Administration
- **Real-Time Analytics:** View total refugees, volunteer availability, and camp occupancy rates at a glance.
- **Smart Assignment:** Automatically allocates refugees to camps with available capacity using SQL Stored Procedures.
- **Resource Forecasting:** Predictive view of resource consumption (Medicine, Food, Hygiene Kits).

### 👤 User Empowerment
- **Integration Journey:** Visual milestone tracking for refugees.
- **Personal History:** Digital records of aid distribution and health checks.
- **Volunteer Management:** Dynamic scheduling and domain-specific assignment (Medical vs. Logistics).

---

## 🛠️ Tech Stack

- **Backend:** Python (Flask), RESTful API design.
- **Database:** MySQL (Raw SQL with `pymysql` for performance).
  - *Highlights:* Uses **Stored Procedures** for complex logic and **Triggers** for automated inventory updates.
- **Frontend:** HTML5, JavaScript (ES6), Tailwind CSS for responsive modern UI.
- **Authentication:** Role-Based Access Control (RBAC) with secure session management.

---

## 🗄️ Database Architecture
The project utilizes a normalized relational database schema including:
- **Core Entities:** `Users`, `Camps`, `Refugees`, `Volunteers`, `Inventory`, `Donors`.
- **Automation:** - `after_aid_distribution` trigger: Auto-deducts inventory upon distribution.
    - `AddNewRefugee` procedure: Auto-assigns refugees to the least crowded camp.

---

## 🚀 Installation & Setup

1. **Clone the repo**
   ```bash
   git clone [https://github.com/yourusername/refugee-management-system.git](https://github.com/yourusername/refugee-management-system.git)
   cd refugee-management-system
