/**
 * Simulated Backend Logic and Database
 * Handles data persistence (LocalStorage) and Business Logic (Cutoffs, Analytics)
 */

const CUTOFFS = {
    Breakfast: { start: "07:30", cutoff: "07:00" },
    Lunch: { start: "12:30", cutoff: "12:00" },
    Dinner: { start: "19:30", cutoff: "19:00" }
};

export const TOTAL_STRENGTH = 200;

class SimulatedDB {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem('hfm_students')) {
            localStorage.setItem('hfm_students', JSON.stringify([
                { id: 'S001', name: 'John Doe', dept: 'CS', year: 2, hostel: 'H1', room: '101', phone: '9876543210' },
                { id: 'S002', name: 'Jane Smith', dept: 'EE', year: 3, hostel: 'H1', room: '102', phone: '9876543211' },
                { id: 'S003', name: 'Rajesh Kumar', dept: 'ME', year: 1, hostel: 'H2', room: '201', phone: '9876543212' },
                { id: 'S004', name: 'Priya Devi', dept: 'CS', year: 2, hostel: 'H1', room: '103', phone: '9876543213' },
                { id: 'S005', name: 'Arun Kumar', dept: 'ECE', year: 4, hostel: 'H2', room: '202', phone: '9876543214' }
            ]));
        }
        if (!localStorage.getItem('hfm_menu')) {
            localStorage.setItem('hfm_menu', JSON.stringify({
                date: new Date().toISOString().split('T')[0],
                breakfast: 'Idli, Sambar, Chutney',
                lunch: 'Rice, Dal, Curd, Veg Curry',
                dinner: 'Chapati, Paneer Butter Masala',
                staff: 'Chef Ram, Chef Kumar'
            }));
        }
        if (!localStorage.getItem('hfm_attendance')) {
            localStorage.setItem('hfm_attendance', JSON.stringify({}));
        }
        if (!localStorage.getItem('hfm_complaints')) {
            localStorage.setItem('hfm_complaints', JSON.stringify([
                { studentId: 'S001', date: this.getTodayStr(), category: 'Food Quality', comment: 'Sambar was too watery today.', status: 'Pending', timestamp: new Date().toISOString() },
                { studentId: 'S002', date: this.getTodayStr(), category: 'Infrastructure', comment: 'Room 102 fan not working properly.', status: 'In Progress', timestamp: new Date().toISOString() },
                { studentId: 'S003', date: this.getTodayStr(), category: 'Hygiene / Cleanliness', comment: 'Washroom needs cleaning.', status: 'Resolved', timestamp: new Date().toISOString() }
            ]));
        }
        if (!localStorage.getItem('hfm_stock')) {
            localStorage.setItem('hfm_stock', JSON.stringify({
                rice: 100, wheat: 50, oil: 20, gas: 5, masala: 10, eggs: 200,
                potato: 10, beans: 5, tomato: 8, onion: 12, radish: 4, other_veg: 5
            }));
        }
        // New: Notices
        if (!localStorage.getItem('hfm_notices')) {
            localStorage.setItem('hfm_notices', JSON.stringify([
                { id: 1, title: 'Welcome to New Semester', message: 'All students are welcome back. Please update your meal preferences.', postedBy: 'Admin', date: this.getTodayStr(), priority: 'normal' },
                { id: 2, title: 'Water Supply Maintenance', message: 'Water supply will be interrupted on Sunday 9 AM - 12 PM for maintenance work.', postedBy: 'Warden', date: this.getTodayStr(), priority: 'important' },
                { id: 3, title: 'Annual Sports Day', message: 'Annual sports day will be held on March 15th. All hostelers must participate.', postedBy: 'Admin', date: this.getTodayStr(), priority: 'normal' }
            ]));
        }
        // New: Leave Requests
        if (!localStorage.getItem('hfm_leave_requests')) {
            localStorage.setItem('hfm_leave_requests', JSON.stringify([
                { id: 1, studentId: 'S001', studentName: 'John Doe', fromDate: '2026-03-05', toDate: '2026-03-07', reason: 'Family function', status: 'Pending', appliedOn: this.getTodayStr() },
                { id: 2, studentId: 'S003', studentName: 'Rajesh Kumar', fromDate: '2026-03-04', toDate: '2026-03-04', reason: 'Medical checkup', status: 'Approved', appliedOn: this.getTodayStr() }
            ]));
        }
        // New: Meal Ratings
        if (!localStorage.getItem('hfm_meal_ratings')) {
            localStorage.setItem('hfm_meal_ratings', JSON.stringify([]));
        }
    }

    // --- Helpers ---
    getTodayStr() {
        return new Date().toISOString().split('T')[0];
    }

    isCutoffPassed(mealType) {
        const now = new Date();
        const [h, m] = CUTOFFS[mealType].cutoff.split(':').map(Number);
        const cutoffTime = new Date();
        cutoffTime.setHours(h, m, 0, 0);
        return now > cutoffTime;
    }

    // --- Stock Management ---
    getStock() {
        return JSON.parse(localStorage.getItem('hfm_stock'));
    }

    updateStock(stockData) {
        const stock = {
            rice: parseInt(stockData.rice) || 0,
            wheat: parseInt(stockData.wheat) || 0,
            oil: parseInt(stockData.oil) || 0,
            gas: parseInt(stockData.gas) || 0,
            masala: parseInt(stockData.masala) || 0,
            eggs: parseInt(stockData.eggs) || 0,
            potato: parseInt(stockData.potato) || 0,
            beans: parseInt(stockData.beans) || 0,
            tomato: parseInt(stockData.tomato) || 0,
            onion: parseInt(stockData.onion) || 0,
            radish: parseInt(stockData.radish) || 0,
            other_veg: parseInt(stockData.other_veg) || 0
        };
        localStorage.setItem('hfm_stock', JSON.stringify(stock));
    }

    getStockAlerts() {
        const stock = this.getStock();
        const thresholds = {
            rice: 20, wheat: 10, oil: 5, gas: 2, masala: 3, eggs: 50,
            potato: 3, beans: 2, tomato: 3, onion: 3, radish: 2, other_veg: 2
        };
        const alerts = [];
        for (const [item, qty] of Object.entries(stock)) {
            if (qty <= thresholds[item]) {
                alerts.push({
                    item: item.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    qty,
                    threshold: thresholds[item],
                    level: qty === 0 ? 'critical' : 'warning'
                });
            }
        }
        return alerts;
    }

    // --- Student Actions ---
    getStudent(id) {
        const students = JSON.parse(localStorage.getItem('hfm_students'));
        return students.find(s => s.id === id);
    }

    getAttendance(studentId) {
        const today = this.getTodayStr();
        const key = `${today}_${studentId}`;
        const allAttendance = JSON.parse(localStorage.getItem('hfm_attendance'));
        const defaultAtt = { breakfast: false, lunch: false, dinner: false, present: true };
        return allAttendance[key] || defaultAtt;
    }

    togglePresence(studentId) {
        const today = this.getTodayStr();
        const key = `${today}_${studentId}`;
        const allAttendance = JSON.parse(localStorage.getItem('hfm_attendance'));

        if (!allAttendance[key]) {
            allAttendance[key] = { breakfast: false, lunch: false, dinner: false, present: true };
        }

        allAttendance[key].present = !allAttendance[key].present;

        if (!allAttendance[key].present) {
            allAttendance[key].breakfast = false;
            allAttendance[key].lunch = false;
            allAttendance[key].dinner = false;
        }

        localStorage.setItem('hfm_attendance', JSON.stringify(allAttendance));
        return allAttendance[key];
    }

    toggleMeal(studentId, mealType) {
        if (this.isCutoffPassed(mealType)) {
            throw new Error(`Cutoff time for ${mealType} has passed.`);
        }
        const today = this.getTodayStr();
        const key = `${today}_${studentId}`;
        const allAttendance = JSON.parse(localStorage.getItem('hfm_attendance'));

        if (!allAttendance[key]) {
            allAttendance[key] = { breakfast: false, lunch: false, dinner: false, present: true };
        }

        if (!allAttendance[key].present) {
            throw new Error("You are marked Absent. Please mark Present first.");
        }

        allAttendance[key][mealType.toLowerCase()] = !allAttendance[key][mealType.toLowerCase()];
        localStorage.setItem('hfm_attendance', JSON.stringify(allAttendance));
        return allAttendance[key];
    }

    // --- Complaints ---
    submitComplaint(studentId, category, comment) {
        let complaints = JSON.parse(localStorage.getItem('hfm_complaints'));
        if (!complaints) {
            complaints = [];
        }
        complaints.push({
            studentId,
            date: this.getTodayStr(),
            category,
            comment,
            status: 'Pending',
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('hfm_complaints', JSON.stringify(complaints));
    }

    getComplaints() {
        return JSON.parse(localStorage.getItem('hfm_complaints')) || [];
    }

    updateComplaintStatus(index, newStatus) {
        const complaints = this.getComplaints();
        if (complaints[index]) {
            complaints[index].status = newStatus;
            localStorage.setItem('hfm_complaints', JSON.stringify(complaints));
        }
    }

    // --- Notices ---
    getNotices() {
        return JSON.parse(localStorage.getItem('hfm_notices')) || [];
    }

    addNotice(title, message, postedBy, priority = 'normal') {
        const notices = this.getNotices();
        const newNotice = {
            id: Date.now(),
            title,
            message,
            postedBy,
            date: this.getTodayStr(),
            priority
        };
        notices.unshift(newNotice);
        localStorage.setItem('hfm_notices', JSON.stringify(notices));
        return newNotice;
    }

    deleteNotice(id) {
        let notices = this.getNotices();
        notices = notices.filter(n => n.id !== id);
        localStorage.setItem('hfm_notices', JSON.stringify(notices));
    }

    // --- Leave Requests ---
    getLeaveRequests() {
        return JSON.parse(localStorage.getItem('hfm_leave_requests')) || [];
    }

    getStudentLeaveRequests(studentId) {
        return this.getLeaveRequests().filter(lr => lr.studentId === studentId);
    }

    submitLeaveRequest(studentId, studentName, fromDate, toDate, reason) {
        const requests = this.getLeaveRequests();
        requests.push({
            id: Date.now(),
            studentId,
            studentName,
            fromDate,
            toDate,
            reason,
            status: 'Pending',
            appliedOn: this.getTodayStr()
        });
        localStorage.setItem('hfm_leave_requests', JSON.stringify(requests));
    }

    updateLeaveStatus(id, newStatus) {
        const requests = this.getLeaveRequests();
        const req = requests.find(r => r.id === id);
        if (req) {
            req.status = newStatus;
            localStorage.setItem('hfm_leave_requests', JSON.stringify(requests));
        }
    }

    // --- Meal Ratings ---
    getMealRatings() {
        return JSON.parse(localStorage.getItem('hfm_meal_ratings')) || [];
    }

    submitMealRating(studentId, mealType, rating, comment) {
        const ratings = this.getMealRatings();
        ratings.push({
            studentId,
            mealType,
            rating,
            comment,
            date: this.getTodayStr(),
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('hfm_meal_ratings', JSON.stringify(ratings));
    }

    getTodayAverageRatings() {
        const today = this.getTodayStr();
        const ratings = this.getMealRatings().filter(r => r.date === today);
        const meals = ['Breakfast', 'Lunch', 'Dinner'];
        const result = {};
        meals.forEach(meal => {
            const mealRatings = ratings.filter(r => r.mealType === meal);
            result[meal] = {
                avg: mealRatings.length > 0 ? (mealRatings.reduce((s, r) => s + r.rating, 0) / mealRatings.length).toFixed(1) : 'N/A',
                count: mealRatings.length
            };
        });
        return result;
    }

    // --- Warden Actions ---
    getAnalytics() {
        const today = this.getTodayStr();
        const allAttendance = JSON.parse(localStorage.getItem('hfm_attendance'));
        const students = JSON.parse(localStorage.getItem('hfm_students'));

        let stats = {
            breakfast: { optIn: 0, total: TOTAL_STRENGTH },
            lunch: { optIn: 0, total: TOTAL_STRENGTH },
            dinner: { optIn: 0, total: TOTAL_STRENGTH },
            presentToday: 0
        };

        students.forEach(s => {
            const key = `${today}_${s.id}`;
            const record = allAttendance[key];
            const isPresent = record ? record.present : true;

            if (isPresent) {
                stats.presentToday++;
                if (record) {
                    if (record.breakfast) stats.breakfast.optIn++;
                    if (record.lunch) stats.lunch.optIn++;
                    if (record.dinner) stats.dinner.optIn++;
                }
            }
        });

        return stats;
    }

    getDailyAttendanceDetails() {
        const today = this.getTodayStr();
        const allAttendance = JSON.parse(localStorage.getItem('hfm_attendance'));
        const students = JSON.parse(localStorage.getItem('hfm_students'));

        return students.map(student => {
            const key = `${today}_${student.id}`;
            const att = allAttendance[key] || { breakfast: false, lunch: false, dinner: false };
            return {
                ...student,
                attendance: att
            };
        });
    }

    updateMenu(menuData) {
        const menu = {
            date: this.getTodayStr(),
            ...menuData
        };
        localStorage.setItem('hfm_menu', JSON.stringify(menu));
    }

    getMenu() {
        return JSON.parse(localStorage.getItem('hfm_menu'));
    }

    // --- Admin Actions ---
    addStudent(student) {
        const students = JSON.parse(localStorage.getItem('hfm_students'));
        students.push(student);
        localStorage.setItem('hfm_students', JSON.stringify(students));
    }

    removeStudent(studentId) {
        let students = JSON.parse(localStorage.getItem('hfm_students'));
        students = students.filter(s => s.id !== studentId);
        localStorage.setItem('hfm_students', JSON.stringify(students));
    }

    getAllStudents() {
        return JSON.parse(localStorage.getItem('hfm_students'));
    }

    searchStudents(query) {
        const students = this.getAllStudents();
        const q = query.toLowerCase();
        return students.filter(s =>
            s.id.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.dept.toLowerCase().includes(q) ||
            (s.room && s.room.toLowerCase().includes(q)) ||
            s.hostel.toLowerCase().includes(q)
        );
    }

    // --- Daily Report ---
    generateDailyReport() {
        const stats = this.getAnalytics();
        const menu = this.getMenu();
        const stock = this.getStock();
        const complaints = this.getComplaints().filter(c => c.date === this.getTodayStr());
        const leaves = this.getLeaveRequests().filter(l => l.status === 'Pending');
        const ratings = this.getTodayAverageRatings();
        const alerts = this.getStockAlerts();

        return {
            date: this.getTodayStr(),
            stats,
            menu,
            stock,
            complaints: {
                total: complaints.length,
                pending: complaints.filter(c => c.status === 'Pending').length,
                resolved: complaints.filter(c => c.status === 'Resolved').length
            },
            pendingLeaves: leaves.length,
            ratings,
            stockAlerts: alerts
        };
    }
}

export const db = new SimulatedDB();
