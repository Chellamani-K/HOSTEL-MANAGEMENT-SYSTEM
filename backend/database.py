"""
Database initialization and helper functions for the Hostel Management System.
Uses SQLite for persistent storage.
"""
import sqlite3
import os
from datetime import date, datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'hostel.db')


def get_db():
    """Get a database connection with Row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize all database tables and seed default data."""
    conn = get_db()
    cursor = conn.cursor()

    # ====== CREATE TABLES ======

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            dept TEXT,
            year INTEGER,
            hostel TEXT,
            room TEXT,
            phone TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_menu (
            menu_date TEXT PRIMARY KEY,
            breakfast TEXT,
            lunch TEXT,
            dinner TEXT,
            staff TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS meal_attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            att_date TEXT NOT NULL,
            breakfast INTEGER DEFAULT 0,
            lunch INTEGER DEFAULT 0,
            dinner INTEGER DEFAULT 0,
            present INTEGER DEFAULT 1,
            FOREIGN KEY (student_id) REFERENCES students(id),
            UNIQUE(student_id, att_date)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            complaint_date TEXT,
            category TEXT,
            comment TEXT,
            status TEXT DEFAULT 'Pending',
            timestamp TEXT,
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock (
            item TEXT PRIMARY KEY,
            quantity INTEGER DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message TEXT,
            posted_by TEXT,
            notice_date TEXT,
            priority TEXT DEFAULT 'normal'
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leave_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            student_name TEXT,
            from_date TEXT,
            to_date TEXT,
            reason TEXT,
            status TEXT DEFAULT 'Pending',
            applied_on TEXT,
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS meal_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            meal_type TEXT,
            rating INTEGER CHECK(rating >= 1 AND rating <= 5),
            comment TEXT,
            rating_date TEXT,
            timestamp TEXT,
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    ''')

    # ====== CREATE INDEXES ======
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_attendance_date ON meal_attendance(att_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_complaints_date ON complaints(complaint_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_ratings_date ON meal_ratings(rating_date)')

    # ====== SEED DEFAULT DATA (only if tables are empty) ======

    # Students
    cursor.execute('SELECT COUNT(*) FROM students')
    if cursor.fetchone()[0] == 0:
        students = [
            ('S001', 'John Doe', 'CS', 2, 'H1', '101', '9876543210'),
            ('S002', 'Jane Smith', 'EE', 3, 'H1', '102', '9876543211'),
            ('S003', 'Rajesh Kumar', 'ME', 1, 'H2', '201', '9876543212'),
            ('S004', 'Priya Devi', 'CS', 2, 'H1', '103', '9876543213'),
            ('S005', 'Arun Kumar', 'ECE', 4, 'H2', '202', '9876543214'),
        ]
        cursor.executemany('INSERT INTO students VALUES (?,?,?,?,?,?,?)', students)

    # Menu
    today = date.today().isoformat()
    cursor.execute('SELECT COUNT(*) FROM daily_menu')
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            'INSERT INTO daily_menu VALUES (?,?,?,?,?)',
            (today, 'Idli, Sambar, Chutney', 'Rice, Dal, Curd, Veg Curry',
             'Chapati, Paneer Butter Masala', 'Chef Ram, Chef Kumar')
        )

    # Stock
    cursor.execute('SELECT COUNT(*) FROM stock')
    if cursor.fetchone()[0] == 0:
        stock_items = [
            ('rice', 100), ('wheat', 50), ('oil', 20), ('gas', 5),
            ('masala', 10), ('eggs', 200), ('potato', 10), ('beans', 5),
            ('tomato', 8), ('onion', 12), ('radish', 4), ('other_veg', 5)
        ]
        cursor.executemany('INSERT INTO stock VALUES (?,?)', stock_items)

    # Complaints
    cursor.execute('SELECT COUNT(*) FROM complaints')
    if cursor.fetchone()[0] == 0:
        now_iso = datetime.now().isoformat()
        complaints = [
            ('S001', today, 'Food Quality', 'Sambar was too watery today.', 'Pending', now_iso),
            ('S002', today, 'Infrastructure', 'Room 102 fan not working properly.', 'In Progress', now_iso),
            ('S003', today, 'Hygiene / Cleanliness', 'Washroom needs cleaning.', 'Resolved', now_iso),
        ]
        cursor.executemany(
            'INSERT INTO complaints (student_id, complaint_date, category, comment, status, timestamp) VALUES (?,?,?,?,?,?)',
            complaints
        )

    # Notices
    cursor.execute('SELECT COUNT(*) FROM notices')
    if cursor.fetchone()[0] == 0:
        notices = [
            ('Welcome to New Semester',
             'All students are welcome back. Please update your meal preferences.',
             'Admin', today, 'normal'),
            ('Water Supply Maintenance',
             'Water supply will be interrupted on Sunday 9 AM - 12 PM for maintenance work.',
             'Warden', today, 'important'),
            ('Annual Sports Day',
             'Annual sports day will be held on March 15th. All hostelers must participate.',
             'Admin', today, 'normal'),
        ]
        cursor.executemany(
            'INSERT INTO notices (title, message, posted_by, notice_date, priority) VALUES (?,?,?,?,?)',
            notices
        )

    # Leave Requests
    cursor.execute('SELECT COUNT(*) FROM leave_requests')
    if cursor.fetchone()[0] == 0:
        leave_requests = [
            ('S001', 'John Doe', '2026-03-05', '2026-03-07', 'Family function', 'Pending', today),
            ('S003', 'Rajesh Kumar', '2026-03-04', '2026-03-04', 'Medical checkup', 'Approved', today),
        ]
        cursor.executemany(
            'INSERT INTO leave_requests (student_id, student_name, from_date, to_date, reason, status, applied_on) VALUES (?,?,?,?,?,?,?)',
            leave_requests
        )

    conn.commit()
    conn.close()
    print(f"[✓] Database initialized at: {DB_PATH}")
