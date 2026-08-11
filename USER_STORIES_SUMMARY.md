# System Capabilities & Architecture Summary Report

## Overview
To prevent conflating distinct engineering domains, the system analysis has been strictly partitioned into three specialized, non-overlapping governed documents:

---

## Document Taxonomy Matrix

| Document | Domain Scope | Target Audience | Primary Focus |
|---|---|---|---|
| 📄 **[userstories.md](file:///home/gringo2/gringo2/Level-Up-Game-Zone/userstories.md)** | End-User Business Capabilities | Product Owners, End Users | Functional user requirements (*"As a <Role>, I can <Action>..."*) |
| 🎨 **[UI_UX_BEHAVIORS.md](file:///home/gringo2/gringo2/Level-Up-Game-Zone/UI_UX_BEHAVIORS.md)** | UI & UX Interactivity | UX Designers, Frontend Engineers | Visual feedback, modal overlays, layout rules, and tooltips |
| ⚙️ **[SYSTEM_MECHANISMS.md](file:///home/gringo2/gringo2/Level-Up-Game-Zone/SYSTEM_MECHANISMS.md)** | System & Infrastructure | Backend & Lead Architects | Atomic transactions, timezone boundaries, OAuth fallbacks, test hooks |
| 🛡️ **[STABILITY_GAP_ANALYSIS.md](file:///home/gringo2/gringo2/Level-Up-Game-Zone/STABILITY_GAP_ANALYSIS.md)** | Codebase Stability & Resilience | QA & Engineering Leads | Input validation, crash boundaries, error middleware, transport protocols |


---

## Executive Summary

### 1. End-User Business Capabilities ([userstories.md](file:///home/gringo2/gringo2/Level-Up-Game-Zone/userstories.md))
- **26 Verified User Stories** across 8 operational modules:
  - Authentication & Security (3 stories)
  - Shift Management & Blind Count Closing (5 stories)
  - Game Sales Management & Audit Trail (4 stories)
  - Keno Management & Verification (3 stories)
  - Expense Tracking & Verification (3 stories)
  - Credit & IOU Management (3 stories)
  - Reports, Analytics & Salary Deductions (3 stories)
  - Admin Settings, Rate Management & User Roles (5 stories)

### 2. UI & UX Interactivity Specifications ([UI_UX_BEHAVIORS.md](file:///home/gringo2/gringo2/Level-Up-Game-Zone/UI_UX_BEHAVIORS.md))
- Frosted backdrop shift opening modal lockout (`backdrop-blur-sm z-50`).
- Dynamic sidebar role-permission menu item filtering (`staff`, `manager`, `admin`).
- Surplus vs shortage dynamic cash variance color feedback (`text-emerald-400` vs `text-red-400`).
- Thermal slip print view template with signature lines (`print:block`).
- Activity log raw JSON payload snapshot tooltips (`title` attribute hover).
- Inline rate editing transition with pre-filled inputs.
- Real-time reactive form field calculations (Game Sales totals and Keno Net profit).
- Universal Sonner toast notification feedback system (`top-center` richColors).

### 3. System & Infrastructure Mechanisms ([SYSTEM_MECHANISMS.md](file:///home/gringo2/gringo2/Level-Up-Game-Zone/SYSTEM_MECHANISMS.md))
- OAuth popup-blocked fallback mechanism (`signInWithPopup` → `signInWithRedirect`).
- Profile auto-registration and admin bootstrap mechanism (`GET /api/users/me` 404 handler).
- Atomic multi-collection Firestore audit transaction guarantees (`db.runTransaction()`).
- Timezone-anchored operating day boundaries (`Africa/Addis_Ababa`, UTC+3).
- Shift-framed financial metric isolation.
- Deterministic 0ms E2E session injection hook (`window.__E2E_USER__`).
