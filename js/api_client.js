/**
 * API Client with Automatic Fallback
 * Tries the Python Flask Backend first. If unreachable, falls back to
 * the SimulatedDB (localStorage) so dashboards always load.
 */

import { db as localDb, TOTAL_STRENGTH as LOCAL_TOTAL_STRENGTH } from './backend_logic.js';

const API_BASE = 'http://localhost:5000/api';

class ApiClient {
    constructor() {
        this._backendAvailable = null; // null = unknown, true/false after first check
        this._checkPromise = null;
    }

    // ───── Backend Health Check ─────
    async _isBackendAvailable() {
        if (this._backendAvailable !== null) return this._backendAvailable;

        // Avoid multiple simultaneous checks
        if (this._checkPromise) return this._checkPromise;

        this._checkPromise = (async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout
                const res = await fetch(`${API_BASE}/students`, { signal: controller.signal });
                clearTimeout(timeout);
                this._backendAvailable = res.ok;
            } catch {
                this._backendAvailable = false;
            }
            return this._backendAvailable;
        })();

        return this._checkPromise;
    }

    // Allow re-checking (e.g. if user starts the server later)
    resetBackendCheck() {
        this._backendAvailable = null;
        this._checkPromise = null;
    }

    // ───── HTTP Helpers ─────
    async _get(url) {
        const res = await fetch(`${API_BASE}${url}`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Request failed');
        }
        return res.json();
    }

    async _post(url, data) {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Request failed');
        }
        return res.json();
    }

    async _put(url, data) {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Request failed');
        }
        return res.json();
    }

    async _delete(url) {
        const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Request failed');
        }
        return res.json();
    }

    // ───── Date Helper ─────
    getTodayStr() {
        return new Date().toISOString().split('T')[0];
    }

    // ───── Smart Methods (Backend → Fallback) ─────

    // Stock
    async getStock() {
        if (await this._isBackendAvailable()) return this._get('/stock');
        return localDb.getStock();
    }

    async updateStock(stockData) {
        if (await this._isBackendAvailable()) return this._put('/stock', stockData);
        localDb.updateStock(stockData);
        return { success: true };
    }

    async getStockAlerts() {
        if (await this._isBackendAvailable()) return this._get('/stock/alerts');
        return localDb.getStockAlerts();
    }

    // Students
    async registerStudent(studentData) {
        if (await this._isBackendAvailable()) return this._post('/register', studentData);
        return localDb.registerStudent(studentData);
    }

    async loginStudent(userId, password) {
        if (await this._isBackendAvailable()) return this._post('/login', { userId, password });
        return localDb.loginStudent(userId, password);
    }

    async getStudentAttendanceStatus(studentId, date) {
        let url = `/student/attendance?studentId=${studentId}`;
        if (date) url += `&date=${date}`;
        if (await this._isBackendAvailable()) return this._get(url);
        return localDb.getStudentAttendanceStatus(studentId, date);
    }

    async markStudentAttendance(studentId, status, date) {
        if (await this._isBackendAvailable()) return this._post('/student/attendance', { studentId, status, date });
        return localDb.markStudentAttendance(studentId, status, date);
    }

    async getStudent(id) {
        if (await this._isBackendAvailable()) return this._get(`/students/${id}`);
        return localDb.getStudent(id);
    }

    async getAttendance(studentId) {
        if (await this._isBackendAvailable()) return this._get(`/attendance/${studentId}`);
        return localDb.getAttendance(studentId);
    }

    async togglePresence(studentId) {
        if (await this._isBackendAvailable()) return this._post(`/attendance/${studentId}/toggle-presence`, {});
        return localDb.togglePresence(studentId);
    }

    async toggleMeal(studentId, mealType) {
        if (await this._isBackendAvailable()) return this._post(`/attendance/${studentId}/toggle-meal`, { mealType });
        return localDb.toggleMeal(studentId, mealType);
    }

    // Complaints
    async submitComplaint(studentId, category, comment) {
        if (await this._isBackendAvailable()) return this._post('/complaints', { studentId, category, comment });
        localDb.submitComplaint(studentId, category, comment);
        return { success: true };
    }

    async getComplaints() {
        if (await this._isBackendAvailable()) return this._get('/complaints');
        return localDb.getComplaints();
    }

    async updateComplaintStatus(index, newStatus) {
        if (await this._isBackendAvailable()) return this._put(`/complaints/${index}/status`, { status: newStatus });
        localDb.updateComplaintStatus(index, newStatus);
        return { success: true };
    }

    // Notices
    async getNotices() {
        if (await this._isBackendAvailable()) return this._get('/notices');
        return localDb.getNotices();
    }

    async addNotice(title, message, postedBy, priority = 'normal') {
        if (await this._isBackendAvailable()) return this._post('/notices', { title, message, postedBy, priority });
        return localDb.addNotice(title, message, postedBy, priority);
    }

    async deleteNotice(id) {
        if (await this._isBackendAvailable()) return this._delete(`/notices/${id}`);
        localDb.deleteNotice(id);
        return { success: true };
    }

    // Leave Requests
    async getLeaveRequests() {
        if (await this._isBackendAvailable()) return this._get('/leave-requests');
        return localDb.getLeaveRequests();
    }

    async getStudentLeaveRequests(studentId) {
        if (await this._isBackendAvailable()) return this._get(`/leave-requests?studentId=${studentId}`);
        return localDb.getStudentLeaveRequests(studentId);
    }

    async submitLeaveRequest(studentId, studentName, fromDate, toDate, reason) {
        if (await this._isBackendAvailable()) return this._post('/leave-requests', { studentId, studentName, fromDate, toDate, reason });
        localDb.submitLeaveRequest(studentId, studentName, fromDate, toDate, reason);
        return { success: true };
    }

    async updateLeaveStatus(id, newStatus) {
        if (await this._isBackendAvailable()) return this._put(`/leave-requests/${id}/status`, { status: newStatus });
        localDb.updateLeaveStatus(id, newStatus);
        return { success: true };
    }

    // Meal Ratings
    async getMealRatings() {
        if (await this._isBackendAvailable()) return this._get('/meal-ratings');
        return localDb.getMealRatings();
    }

    async submitMealRating(studentId, mealType, rating, comment) {
        if (await this._isBackendAvailable()) return this._post('/meal-ratings', { studentId, mealType, rating, comment });
        localDb.submitMealRating(studentId, mealType, rating, comment);
        return { success: true };
    }

    async getTodayAverageRatings() {
        if (await this._isBackendAvailable()) return this._get('/meal-ratings/today-average');
        return localDb.getTodayAverageRatings();
    }

    // Analytics
    async getAnalytics() {
        if (await this._isBackendAvailable()) return this._get('/analytics');
        return localDb.getAnalytics();
    }

    async getDailyAttendanceDetails() {
        if (await this._isBackendAvailable()) return this._get('/attendance/daily-details');
        return localDb.getDailyAttendanceDetails();
    }

    async updateMenu(menuData) {
        if (await this._isBackendAvailable()) return this._put('/menu', menuData);
        localDb.updateMenu(menuData);
        return { success: true };
    }

    async getMenu() {
        if (await this._isBackendAvailable()) return this._get('/menu');
        return localDb.getMenu();
    }

    // Admin: Students
    async addStudent(student) {
        if (await this._isBackendAvailable()) return this._post('/students', student);
        localDb.addStudent(student);
        return { success: true };
    }

    async removeStudent(studentId) {
        if (await this._isBackendAvailable()) return this._delete(`/students/${studentId}`);
        localDb.removeStudent(studentId);
        return { success: true };
    }

    async getAllStudents() {
        if (await this._isBackendAvailable()) return this._get('/students');
        return localDb.getAllStudents();
    }

    async searchStudents(query) {
        if (await this._isBackendAvailable()) return this._get(`/students?q=${encodeURIComponent(query)}`);
        return localDb.searchStudents(query);
    }

    // Daily Report
    async generateDailyReport() {
        if (await this._isBackendAvailable()) return this._get('/daily-report');
        return localDb.generateDailyReport();
    }

    // Cutoff check
    isCutoffPassed(mealType) {
        return localDb.isCutoffPassed(mealType);
    }
}

export const TOTAL_STRENGTH = LOCAL_TOTAL_STRENGTH;
export const db = new ApiClient();
