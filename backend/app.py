"""
Flask Backend Server for the Hostel Management System (HM PRO).
Provides REST API endpoints that replace the browser localStorage simulation.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import date, datetime
from database import get_db, init_db

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the frontend

TOTAL_STRENGTH = 200

CUTOFFS = {
    "Breakfast": {"start": "07:30", "cutoff": "07:00"},
    "Lunch":     {"start": "12:30", "cutoff": "12:00"},
    "Dinner":    {"start": "19:30", "cutoff": "19:00"},
}

STOCK_THRESHOLDS = {
    "rice": 20, "wheat": 10, "oil": 5, "gas": 2, "masala": 3, "eggs": 50,
    "potato": 3, "beans": 2, "tomato": 3, "onion": 3, "radish": 2, "other_veg": 2
}


# ───────────────────── HELPERS ─────────────────────

def today_str():
    return date.today().isoformat()


def is_cutoff_passed(meal_type):
    now = datetime.now()
    parts = CUTOFFS[meal_type]["cutoff"].split(":")
    h, m = int(parts[0]), int(parts[1])
    cutoff_time = now.replace(hour=h, minute=m, second=0, microsecond=0)
    return now > cutoff_time


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    return [dict(r) for r in rows]


# ───────────────────── STUDENT ENDPOINTS ─────────────────────

@app.route('/api/students', methods=['GET'])
def get_all_students():
    """Get all students or search with ?q=query"""
    conn = get_db()
    q = request.args.get('q', '').strip().lower()
    if q:
        rows = conn.execute(
            "SELECT * FROM students WHERE LOWER(id) LIKE ? OR LOWER(name) LIKE ? OR LOWER(dept) LIKE ? OR LOWER(room) LIKE ? OR LOWER(hostel) LIKE ?",
            (f'%{q}%', f'%{q}%', f'%{q}%', f'%{q}%', f'%{q}%')
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM students").fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))


@app.route('/api/students/<student_id>', methods=['GET'])
def get_student(student_id):
    """Get a single student by ID"""
    conn = get_db()
    row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(row_to_dict(row))


@app.route('/api/students', methods=['POST'])
def add_student():
    """Add a new student"""
    data = request.json
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO students (id, name, dept, year, hostel, room, phone) VALUES (?,?,?,?,?,?,?)",
            (data['id'], data['name'], data.get('dept', ''), data.get('year', 1),
             data.get('hostel', ''), data.get('room', ''), data.get('phone', ''))
        )
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400
    conn.close()
    return jsonify({"message": "Student added successfully"}), 201


@app.route('/api/students/<student_id>', methods=['DELETE'])
def remove_student(student_id):
    """Remove a student by ID"""
    conn = get_db()
    conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Student removed"})


# ───────────────────── ATTENDANCE ENDPOINTS ─────────────────────

@app.route('/api/attendance/<student_id>', methods=['GET'])
def get_attendance(student_id):
    """Get today's attendance for a student"""
    conn = get_db()
    today = today_str()
    row = conn.execute(
        "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
        (student_id, today)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify({"breakfast": False, "lunch": False, "dinner": False, "present": True})
    return jsonify({
        "breakfast": bool(row['breakfast']),
        "lunch": bool(row['lunch']),
        "dinner": bool(row['dinner']),
        "present": bool(row['present'])
    })


@app.route('/api/attendance/<student_id>/toggle-presence', methods=['POST'])
def toggle_presence(student_id):
    """Toggle a student's present/absent status"""
    conn = get_db()
    today = today_str()
    row = conn.execute(
        "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
        (student_id, today)
    ).fetchone()

    if not row:
        # Create with present = True (first toggle makes them absent, so set present=1 then toggle)
        conn.execute(
            "INSERT INTO meal_attendance (student_id, att_date, breakfast, lunch, dinner, present) VALUES (?,?,0,0,0,1)",
            (student_id, today)
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
            (student_id, today)
        ).fetchone()

    new_present = 0 if row['present'] else 1
    if new_present == 0:
        conn.execute(
            "UPDATE meal_attendance SET present = 0, breakfast = 0, lunch = 0, dinner = 0 WHERE student_id = ? AND att_date = ?",
            (student_id, today)
        )
    else:
        conn.execute(
            "UPDATE meal_attendance SET present = 1 WHERE student_id = ? AND att_date = ?",
            (student_id, today)
        )
    conn.commit()

    updated = conn.execute(
        "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
        (student_id, today)
    ).fetchone()
    conn.close()
    return jsonify({
        "breakfast": bool(updated['breakfast']),
        "lunch": bool(updated['lunch']),
        "dinner": bool(updated['dinner']),
        "present": bool(updated['present'])
    })


@app.route('/api/attendance/<student_id>/toggle-meal', methods=['POST'])
def toggle_meal(student_id):
    """Toggle a specific meal opt-in/out"""
    data = request.json
    meal_type = data.get('mealType', '')

    if meal_type not in ['Breakfast', 'Lunch', 'Dinner']:
        return jsonify({"error": "Invalid meal type"}), 400

    if is_cutoff_passed(meal_type):
        return jsonify({"error": f"Cutoff time for {meal_type} has passed."}), 400

    conn = get_db()
    today = today_str()
    row = conn.execute(
        "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
        (student_id, today)
    ).fetchone()

    if not row:
        conn.execute(
            "INSERT INTO meal_attendance (student_id, att_date, breakfast, lunch, dinner, present) VALUES (?,?,0,0,0,1)",
            (student_id, today)
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
            (student_id, today)
        ).fetchone()

    if not row['present']:
        conn.close()
        return jsonify({"error": "You are marked Absent. Please mark Present first."}), 400

    col = meal_type.lower()
    new_val = 0 if row[col] else 1
    conn.execute(
        f"UPDATE meal_attendance SET {col} = ? WHERE student_id = ? AND att_date = ?",
        (new_val, student_id, today)
    )
    conn.commit()

    updated = conn.execute(
        "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
        (student_id, today)
    ).fetchone()
    conn.close()
    return jsonify({
        "breakfast": bool(updated['breakfast']),
        "lunch": bool(updated['lunch']),
        "dinner": bool(updated['dinner']),
        "present": bool(updated['present'])
    })


@app.route('/api/attendance/daily-details', methods=['GET'])
def get_daily_attendance_details():
    """Get attendance details for all students today"""
    conn = get_db()
    today = today_str()
    students = conn.execute("SELECT * FROM students").fetchall()
    result = []
    for s in students:
        att = conn.execute(
            "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
            (s['id'], today)
        ).fetchone()
        student_dict = dict(s)
        if att:
            student_dict['attendance'] = {
                "breakfast": bool(att['breakfast']),
                "lunch": bool(att['lunch']),
                "dinner": bool(att['dinner']),
                "present": bool(att['present'])
            }
        else:
            student_dict['attendance'] = {
                "breakfast": False, "lunch": False, "dinner": False, "present": True
            }
        result.append(student_dict)
    conn.close()
    return jsonify(result)


# ───────────────────── MENU ENDPOINTS ─────────────────────

@app.route('/api/menu', methods=['GET'])
def get_menu():
    """Get today's menu"""
    conn = get_db()
    today = today_str()
    row = conn.execute("SELECT * FROM daily_menu WHERE menu_date = ?", (today,)).fetchone()
    conn.close()
    if not row:
        return jsonify({
            "date": today,
            "breakfast": "Not set",
            "lunch": "Not set",
            "dinner": "Not set",
            "staff": "Not assigned"
        })
    return jsonify({
        "date": row['menu_date'],
        "breakfast": row['breakfast'],
        "lunch": row['lunch'],
        "dinner": row['dinner'],
        "staff": row['staff']
    })


@app.route('/api/menu', methods=['PUT'])
def update_menu():
    """Update today's menu"""
    data = request.json
    conn = get_db()
    today = today_str()
    existing = conn.execute("SELECT * FROM daily_menu WHERE menu_date = ?", (today,)).fetchone()
    if existing:
        conn.execute(
            "UPDATE daily_menu SET breakfast = ?, lunch = ?, dinner = ?, staff = ? WHERE menu_date = ?",
            (data.get('breakfast', ''), data.get('lunch', ''), data.get('dinner', ''), data.get('staff', ''), today)
        )
    else:
        conn.execute(
            "INSERT INTO daily_menu VALUES (?,?,?,?,?)",
            (today, data.get('breakfast', ''), data.get('lunch', ''), data.get('dinner', ''), data.get('staff', ''))
        )
    conn.commit()
    conn.close()
    return jsonify({"message": "Menu updated successfully"})


# ───────────────────── COMPLAINTS ENDPOINTS ─────────────────────

@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    """Get all complaints"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM complaints ORDER BY id DESC").fetchall()
    conn.close()
    result = []
    for r in rows:
        result.append({
            "studentId": r['student_id'],
            "date": r['complaint_date'],
            "category": r['category'],
            "comment": r['comment'],
            "status": r['status'],
            "timestamp": r['timestamp']
        })
    return jsonify(result)


@app.route('/api/complaints', methods=['POST'])
def submit_complaint():
    """Submit a new complaint"""
    data = request.json
    conn = get_db()
    conn.execute(
        "INSERT INTO complaints (student_id, complaint_date, category, comment, status, timestamp) VALUES (?,?,?,?,?,?)",
        (data.get('studentId', 'Anonymous'), today_str(),
         data['category'], data['comment'], 'Pending', datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Complaint submitted"}), 201


@app.route('/api/complaints/<int:index>/status', methods=['PUT'])
def update_complaint_status(index):
    """Update complaint status by row index (0-based)"""
    data = request.json
    new_status = data.get('status', 'Pending')
    conn = get_db()
    rows = conn.execute("SELECT id FROM complaints ORDER BY id ASC").fetchall()
    if index < len(rows):
        complaint_id = rows[index]['id']
        conn.execute("UPDATE complaints SET status = ? WHERE id = ?", (new_status, complaint_id))
        conn.commit()
    conn.close()
    return jsonify({"message": "Status updated"})


# ───────────────────── STOCK ENDPOINTS ─────────────────────

@app.route('/api/stock', methods=['GET'])
def get_stock():
    """Get current stock levels"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM stock").fetchall()
    conn.close()
    stock = {}
    for r in rows:
        stock[r['item']] = r['quantity']
    return jsonify(stock)


@app.route('/api/stock', methods=['PUT'])
def update_stock():
    """Update stock levels"""
    data = request.json
    conn = get_db()
    for item, qty in data.items():
        conn.execute(
            "INSERT OR REPLACE INTO stock (item, quantity) VALUES (?, ?)",
            (item, int(qty))
        )
    conn.commit()
    conn.close()
    return jsonify({"message": "Stock updated"})


@app.route('/api/stock/alerts', methods=['GET'])
def get_stock_alerts():
    """Get stock items that are below threshold"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM stock").fetchall()
    conn.close()
    alerts = []
    for r in rows:
        item = r['item']
        qty = r['quantity']
        threshold = STOCK_THRESHOLDS.get(item, 5)
        if qty <= threshold:
            alerts.append({
                "item": item.replace('_', ' ').title(),
                "qty": qty,
                "threshold": threshold,
                "level": "critical" if qty == 0 else "warning"
            })
    return jsonify(alerts)


# ───────────────────── NOTICES ENDPOINTS ─────────────────────

@app.route('/api/notices', methods=['GET'])
def get_notices():
    """Get all notices"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM notices ORDER BY id DESC").fetchall()
    conn.close()
    result = []
    for r in rows:
        result.append({
            "id": r['id'],
            "title": r['title'],
            "message": r['message'],
            "postedBy": r['posted_by'],
            "date": r['notice_date'],
            "priority": r['priority']
        })
    return jsonify(result)


@app.route('/api/notices', methods=['POST'])
def add_notice():
    """Add a new notice"""
    data = request.json
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO notices (title, message, posted_by, notice_date, priority) VALUES (?,?,?,?,?)",
        (data['title'], data['message'], data.get('postedBy', 'Admin'),
         today_str(), data.get('priority', 'normal'))
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({
        "id": new_id,
        "title": data['title'],
        "message": data['message'],
        "postedBy": data.get('postedBy', 'Admin'),
        "date": today_str(),
        "priority": data.get('priority', 'normal')
    }), 201


@app.route('/api/notices/<int:notice_id>', methods=['DELETE'])
def delete_notice(notice_id):
    """Delete a notice by ID"""
    conn = get_db()
    conn.execute("DELETE FROM notices WHERE id = ?", (notice_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Notice deleted"})


# ───────────────────── LEAVE REQUEST ENDPOINTS ─────────────────────

@app.route('/api/leave-requests', methods=['GET'])
def get_leave_requests():
    """Get all leave requests, or filter by ?studentId="""
    conn = get_db()
    student_id = request.args.get('studentId', '').strip()
    if student_id:
        rows = conn.execute(
            "SELECT * FROM leave_requests WHERE student_id = ? ORDER BY id DESC",
            (student_id,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM leave_requests ORDER BY id DESC").fetchall()
    conn.close()
    result = []
    for r in rows:
        result.append({
            "id": r['id'],
            "studentId": r['student_id'],
            "studentName": r['student_name'],
            "fromDate": r['from_date'],
            "toDate": r['to_date'],
            "reason": r['reason'],
            "status": r['status'],
            "appliedOn": r['applied_on']
        })
    return jsonify(result)


@app.route('/api/leave-requests', methods=['POST'])
def submit_leave_request():
    """Submit a new leave request"""
    data = request.json
    conn = get_db()
    conn.execute(
        "INSERT INTO leave_requests (student_id, student_name, from_date, to_date, reason, status, applied_on) VALUES (?,?,?,?,?,?,?)",
        (data['studentId'], data['studentName'], data['fromDate'], data['toDate'],
         data['reason'], 'Pending', today_str())
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Leave request submitted"}), 201


@app.route('/api/leave-requests/<int:leave_id>/status', methods=['PUT'])
def update_leave_status(leave_id):
    """Update leave request status"""
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE leave_requests SET status = ? WHERE id = ?",
        (data['status'], leave_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Leave status updated"})


# ───────────────────── MEAL RATINGS ENDPOINTS ─────────────────────

@app.route('/api/meal-ratings', methods=['GET'])
def get_meal_ratings():
    """Get all meal ratings"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM meal_ratings ORDER BY id DESC").fetchall()
    conn.close()
    result = []
    for r in rows:
        result.append({
            "studentId": r['student_id'],
            "mealType": r['meal_type'],
            "rating": r['rating'],
            "comment": r['comment'],
            "date": r['rating_date'],
            "timestamp": r['timestamp']
        })
    return jsonify(result)


@app.route('/api/meal-ratings', methods=['POST'])
def submit_meal_rating():
    """Submit a new meal rating"""
    data = request.json
    conn = get_db()
    conn.execute(
        "INSERT INTO meal_ratings (student_id, meal_type, rating, comment, rating_date, timestamp) VALUES (?,?,?,?,?,?)",
        (data['studentId'], data['mealType'], int(data['rating']),
         data.get('comment', ''), today_str(), datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Rating submitted"}), 201


@app.route('/api/meal-ratings/today-average', methods=['GET'])
def get_today_average_ratings():
    """Get average ratings for today's meals"""
    conn = get_db()
    today = today_str()
    meals = ['Breakfast', 'Lunch', 'Dinner']
    result = {}
    for meal in meals:
        rows = conn.execute(
            "SELECT rating FROM meal_ratings WHERE rating_date = ? AND meal_type = ?",
            (today, meal)
        ).fetchall()
        if rows:
            avg = sum(r['rating'] for r in rows) / len(rows)
            result[meal] = {"avg": f"{avg:.1f}", "count": len(rows)}
        else:
            result[meal] = {"avg": "N/A", "count": 0}
    conn.close()
    return jsonify(result)


# ───────────────────── ANALYTICS ENDPOINTS ─────────────────────

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get today's meal analytics for warden dashboard"""
    conn = get_db()
    today = today_str()
    students = conn.execute("SELECT * FROM students").fetchall()

    stats = {
        "breakfast": {"optIn": 0, "total": TOTAL_STRENGTH},
        "lunch": {"optIn": 0, "total": TOTAL_STRENGTH},
        "dinner": {"optIn": 0, "total": TOTAL_STRENGTH},
        "presentToday": 0
    }

    for s in students:
        att = conn.execute(
            "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
            (s['id'], today)
        ).fetchone()
        is_present = att['present'] if att else True
        if is_present:
            stats["presentToday"] += 1
            if att:
                if att['breakfast']:
                    stats["breakfast"]["optIn"] += 1
                if att['lunch']:
                    stats["lunch"]["optIn"] += 1
                if att['dinner']:
                    stats["dinner"]["optIn"] += 1

    conn.close()
    return jsonify(stats)


@app.route('/api/daily-report', methods=['GET'])
def get_daily_report():
    """Get the comprehensive daily report"""
    conn = get_db()
    today = today_str()

    # Analytics
    students = conn.execute("SELECT * FROM students").fetchall()
    stats = {
        "breakfast": {"optIn": 0, "total": TOTAL_STRENGTH},
        "lunch": {"optIn": 0, "total": TOTAL_STRENGTH},
        "dinner": {"optIn": 0, "total": TOTAL_STRENGTH},
        "presentToday": 0
    }
    for s in students:
        att = conn.execute(
            "SELECT * FROM meal_attendance WHERE student_id = ? AND att_date = ?",
            (s['id'], today)
        ).fetchone()
        is_present = att['present'] if att else True
        if is_present:
            stats["presentToday"] += 1
            if att:
                if att['breakfast']:
                    stats["breakfast"]["optIn"] += 1
                if att['lunch']:
                    stats["lunch"]["optIn"] += 1
                if att['dinner']:
                    stats["dinner"]["optIn"] += 1

    # Menu
    menu_row = conn.execute("SELECT * FROM daily_menu WHERE menu_date = ?", (today,)).fetchone()
    menu = dict(menu_row) if menu_row else {"menu_date": today, "breakfast": "N/A", "lunch": "N/A", "dinner": "N/A", "staff": "N/A"}

    # Stock
    stock_rows = conn.execute("SELECT * FROM stock").fetchall()
    stock = {r['item']: r['quantity'] for r in stock_rows}

    # Complaints
    complaints_today = conn.execute(
        "SELECT * FROM complaints WHERE complaint_date = ?", (today,)
    ).fetchall()
    complaints_data = {
        "total": len(complaints_today),
        "pending": sum(1 for c in complaints_today if c['status'] == 'Pending'),
        "resolved": sum(1 for c in complaints_today if c['status'] == 'Resolved')
    }

    # Pending Leaves
    pending_leaves = conn.execute(
        "SELECT COUNT(*) as cnt FROM leave_requests WHERE status = 'Pending'"
    ).fetchone()['cnt']

    # Ratings
    meals = ['Breakfast', 'Lunch', 'Dinner']
    ratings = {}
    for meal in meals:
        rows = conn.execute(
            "SELECT rating FROM meal_ratings WHERE rating_date = ? AND meal_type = ?",
            (today, meal)
        ).fetchall()
        if rows:
            avg = sum(r['rating'] for r in rows) / len(rows)
            ratings[meal] = {"avg": f"{avg:.1f}", "count": len(rows)}
        else:
            ratings[meal] = {"avg": "N/A", "count": 0}

    # Stock alerts
    alerts = []
    for r in stock_rows:
        item = r['item']
        qty = r['quantity']
        threshold = STOCK_THRESHOLDS.get(item, 5)
        if qty <= threshold:
            alerts.append({
                "item": item.replace('_', ' ').title(),
                "qty": qty,
                "threshold": threshold,
                "level": "critical" if qty == 0 else "warning"
            })

    conn.close()

    return jsonify({
        "date": today,
        "stats": stats,
        "menu": menu,
        "stock": stock,
        "complaints": complaints_data,
        "pendingLeaves": pending_leaves,
        "ratings": ratings,
        "stockAlerts": alerts
    })


# ───────────────────── CONFIG / CUTOFF ENDPOINTS ─────────────────────

@app.route('/api/config/cutoffs', methods=['GET'])
def get_cutoffs():
    """Return cutoff time configuration"""
    return jsonify(CUTOFFS)


@app.route('/api/config/total-strength', methods=['GET'])
def get_total_strength():
    """Return total hostel strength"""
    return jsonify({"totalStrength": TOTAL_STRENGTH})


# ───────────────────── HEALTH CHECK ─────────────────────

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Hostel Management System Backend is running"})


# ───────────────────── MAIN ─────────────────────

if __name__ == '__main__':
    init_db()
    print("\n╔════════════════════════════════════════════════════╗")
    print("║   Hostel Management System - Python Backend        ║")
    print("║   Running on http://localhost:5000                  ║")
    print("║   API Base: http://localhost:5000/api               ║")
    print("╚════════════════════════════════════════════════════╝\n")
    app.run(debug=True, port=5000)
