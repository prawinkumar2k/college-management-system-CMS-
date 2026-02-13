# 🎓 Enterprise College Management System (CMS)

![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)
![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)
![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?style=for-the-badge&logo=react)
![Backend: Node.js + Express](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green?style=for-the-badge&logo=nodedotjs)
![Database: MySQL](https://img.shields.io/badge/Database-MySQL%208.0-orange?style=for-the-badge&logo=mysql)
![DevOps: Docker + K8s](https://img.shields.io/badge/DevOps-Docker%20%2B%20Kubernetes-blueviolet?style=for-the-badge&logo=kubernetes)

> **A scalable, full-stack ERP solution designed for modern educational institutions.**

---

## 📖 **Project Overview**

The **College Management System (CMS)** is an enterprise-grade SaaS application engineered to digitize administrative workflows. It streamlines complex processes including **academic management, staff payroll, student attendance, and financial reporting** into a unified, secure platform.

Built with a **Microservices-ready architecture**, this system emphasizes scalability, security, and maintainability. It leverages **Docker containerization** for consistent deployments and **Kubernetes manifests** for orchestration, making it cloud-native ready.

---

## 🏗️ **System Architecture**

The system follows a layered architecture pattern ensuring separation of concerns:

```mermaid
graph TD
    Client[React Frontend (Vite)] -->|Status/Data| LB[Nginx Load Balancer]
    LB -->|API Requests| API[Node.js Backend API]
    API -->|Auth/Logic| Service[Business Logic Layer]
    Service -->|Query| DB[(MySQL Database)]
    Service -->|Cache| Redis[(Redis Cache)]
    
    subgraph DevOps Infrastructure
    Docker[Docker Containers]
    K8s[Kubernetes Cluster]
    end
```

### **Core Modules**
*   **👨‍🎓 Student Management:** Admissions, academic records, attendance tracking.
*   **👩‍🏫 Staff & IP Payroll:** Comprehensive salary processing, leave management, automated payslip generation.
*   **💰 Finance & Fees:** Fee collection, due tracking, day-book reporting.
*   **📊 Analytics Dashboard:** Real-time insights, graphical reports, actionable KPIs.
*   **🔐 Admin Control:** Role-Based Access Control (RBAC), audit logs, system configuration.

---

## 🛠️ **Technology Stack**

### **Frontend**
*   **Framework:** React 18 (Vite)
*   **State Management:** Context API / Hooks
*   **Styling:** Bootstrap 5 + Custom CSS (Responsive Design)
*   **Icons:** Iconify

### **Backend**
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MySQL 8.0 (Relational Data Modeling)
*   **Authentication:** JWT (JSON Web Tokens) + BCrypt Application Security
*   **Validation:** Joi / Validator

### **DevOps & Infrastructure**
*   **Containerization:** Docker & Docker Compose
*   **Orchestration:** Kubernetes (K8s) Manifests
*   **Reverse Proxy:** Nginx
*   **CI/CD:** GitHub Actions
*   **Version Control:** Git

---

## 🚀 **Quick Start (Local Deployment)**

Get the system running locally in under 5 minutes using Docker.

### **Prerequisites**
*   Docker & Docker Compose installed.

### **Installation**

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/cms-erp.git
    cd cms-erp
    ```

2.  **Start Services**
    ```bash
    # Run in detached mode with build
    docker compose -f docker-compose.dev.yml up -d --build
    ```

3.  **Access the Application**
    *   **Frontend:** `http://localhost:3000` (or configured port)
    *   **Backend API:** `http://localhost:5000`
    *   **Database:** Port `3306` (Internal)

---

## 📦 **Production Deployment**

For deploying to a live VPS (Ubuntu/CentOS), please refer to the detailed guide:

👉 [**Enterprise VPS Deployment Guide**](./docs/DEPLOYMENT_GUIDE_VPS.md)

This guide covers:
*   VPS Security Hardening
*   Nginx Reverse Proxy Setup
*   SSL Certificate Installation (Let's Encrypt)
*   Automated CI/CD Pipeline Setup

---

## 🛡️ **Security Features**

*   **JWT Authentication:** Stateless, secure token-based auth for scalable verification.
*   **Password Hashing:** Industry-standard BCrypt hashing for storing user credentials.
*   **HTTP Security Headers:** Helmet.js integration for XSS protection.
*   **Input Validation:** Strict server-side validation to prevent SQL injection and malformed data.
*   **Environment Isolation:** Sensitive keys managed via `.env` files (not committed).

---

## 📂 **Documentation**

Comprehensive documentation is available in the `docs/` directory:

*   [**📂 Project File Structure**](./docs/01_System_Overview.md)
*   [**🔧 Architecture & Tech Stack**](./docs/02_Architecture_and_Tech_Stack.md)
*   [**⚙️ Installation & Setup**](./docs/03_Installation_and_Setup.md)
*   [**📡 API Reference**](./docs/08_API_Reference.md)
*   [**🔒 Security & Scalability Audit**](./docs/SECURITY_AND_SCALABILITY_AUDIT.md)
*   [**📄 Resume/Project Summary**](./docs/PROJECT_SUMMARY_RESUME.md)

---

## 👨‍💻 **Author**

**Lead Full-Stack Engineer & Architect**

This project demonstrates proficiency in building **scalable, production-ready enterprise applications**. It showcases skills in:
*   Full-Stack Development (MERN)
*   Database Design & Optimization
*   DevOps (Docker, Kubernetes, CI/CD)
*   System Architecture & Security

---

Use this project to streamline your institution's operations today! 🚀
