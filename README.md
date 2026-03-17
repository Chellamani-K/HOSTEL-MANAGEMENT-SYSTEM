# HOSTEL MANAGEMENT SYSTEM (HFM)

A web-based system to manage hostel mess operations, reduce food wastage, and handle student feedback.

## Features
- **Admin Panel**: Manage student database.
- **Warden Dashboard**: View real-time meal consumption analytics and update menus.
- **Student Dashboard**: Opt-in/out of meals (with strict cutoff times) and provide feedback.
- **Backend Logic**: Auto-enforces cutoff times (Breakfast: 7:00 AM, Lunch: 12:00 PM, Dinner: 7:00 PM).

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS (Premium Design), JavaScript (ES Modules).
- **Backend (Simulated)**: `js/backend_logic.js` simulates a database using Browser LocalStorage.
- **Database Schema**: See `database_schema.sql` for the SQL structure designed for a production environment.

## How to Run
Due to the use of modern JavaScript ES Modules, you cannot simply double-click `index.html`. You must serve it over HTTP.

### Option 1: VS Code (Recommended)
1. Install "Live Server" extension.
2. Right-click `index.html` and select "Open with Live Server".

### Option 2: Python
Open a terminal in this folder and run:
```bash
python -m http.server
```
Then open `http://localhost:8000` in your browser.

### Option 3: Node.js (If installed)
```bash
npx serve .
```

## Cutoff Times Test
To test the "Cutoff" logic, you can manually modify the `CUTOFFS` object in `js/backend_logic.js` or change your system time.
LUNCH CUTOFF is 12:00 PM. If you view the app after 12:00 PM, the Lunch toggle will be disabled.
