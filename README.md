# CloudDrive - Secure Cloud Storage Service

CloudDrive is a comprehensive cloud-based media file storage application designed to mimic the functionality of enterprise storage solutions like Google Drive or Dropbox. Built with **React**, **TypeScript**, and **Tailwind CSS**, it features a robust mocked backend architecture simulating Supabase services for a seamless, offline-capable demonstration.

## 🚀 Features

### 🔐 Authentication & Security
- **Secure Login/Registration**: Email/Password authentication with strict validation rules (email format, password complexity).
- **Password Reset**: Secure, in-app password reset flow with email verification simulation.
- **Role-Based Access Control (RBAC)**: Distinct interfaces and permissions for standard **Users** and **Administrators**.

### 📂 File & Folder Management
- **File Browser**: Switch between **Grid** and **List** views. Sort by Name, Date, Size, or Color.
- **Folder Organization**: Create nested folder structures and **color-code** folders for better visual organization.
- **Drag & Drop**: Intuitive drag-and-drop file upload anywhere on the screen.
- **Context Menus**: Right-click style menus for quick actions (Share, Rename, Delete, Color, History).
- **Trash Management**: Soft delete system allowing file restoration (simulates 30-day retention).
- **Starred Items**: Quick access to important files.

### 🤝 Sharing & Collaboration
- **Granular Permissions**: Share files or folders with specific users as 'Viewer' or 'Editor'.
- **Public Links**: Generate shareable links accessible to anyone.
- **Advanced Security**:
    - **Password Protection**: Secure public links with a custom password.
    - **Expiration Dates**: Set temporary access for shared links, auto-expiring after a set time.

### 📜 Version Control
- **File Versioning**: Track file changes, view version history, and revert to previous versions.
- **Folder Snapshots**: Unique feature to rollback folder states (item counts/names) to specific points in time.

### 👁️ Preview & Media
- **File Previews**: Integrated viewer for Images, PDFs, and Text/Code files.
- **Metadata**: Detailed file information sidebars showing size, type, and modification dates.

### 🛡️ Admin Panel
- **Dashboard**: Visual statistics on total storage usage, user count, and file metrics.
- **User Management**: List registered users, view details, roles, and manage account status.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks & Context patterns
- **Backend Simulation**: Custom `supabaseService.ts` mimicking a real-time Supabase database with `localStorage` persistence.

## 📦 Installation & Setup

This project is a standard React application.

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn

### Steps to Run

1.  **Clone or Download** the project source code.
2.  **Open a terminal** in the project root directory.
3.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```
4.  **Start the development server**:
    ```bash
    npm start
    # or
    yarn dev
    ```
5.  **Open your browser**:
    Navigate to `http://localhost:3000` (or the port shown in your terminal, e.g., 5173 for Vite).

## 🧪 Demo Credentials

To explore the **Admin** features immediately without manual database setup:

- **Email**: `mohanrajit05@gmail.com`
- **Password**: `Mohan@05`

To explore **User** features, simply click "Create Account" on the login screen and register a new user.

## 📁 Project Structure

- `src/App.tsx`: Main application controller, routing logic, and global state orchestration.
- `src/components/`:
    - `Layout.tsx`: Sidebar, Header, and Drag-drop overlay.
    - `FileBrowser.tsx`: Main grid/list view for content.
    - `AdminPanel.tsx`: Dashboard for admin analytics.
    - `*Modal.tsx`: Various modals for Sharing, Previews, History, etc.
- `src/services/supabaseService.ts`: The core logic engine. It mocks database operations, authentication, and file storage using browser `localStorage` to ensure data persists across reloads.
- `src/types.ts`: TypeScript definitions for robust type safety across the app.

## 📝 Notes

This application uses a sophisticated local storage simulation (`cloud_drive_mock_db_v4_restart`). This ensures the demo is functional immediately upon launch without requiring a connection to a live Supabase instance or backend server.
