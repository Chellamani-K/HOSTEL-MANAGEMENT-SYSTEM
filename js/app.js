import { StudentDashboard } from './components/StudentDashboard.js';
import { WardenDashboard } from './components/WardenDashboard.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { db } from './api_client.js';

export class App {
    constructor() {
        this.state = {
            currentUser: null,
            role: null
        };
    }

    _showPage(pageId) {
        document.querySelectorAll('.page-container').forEach(el => {
            if (el.id === pageId) {
                el.classList.remove('hidden');
                el.classList.add('active');
            } else {
                el.classList.add('hidden');
                el.classList.remove('active');
            }
        });
        window.scrollTo(0, 0);
    }

    async login(role) {
        this._showPage('login-form-page');
        document.getElementById('login-role').value = role;
        
        let roleTitle = 'Student';
        if (role === 'admin') roleTitle = 'Admin';
        if (role === 'warden') roleTitle = 'Warden';
        
        document.getElementById('login-page-title').innerText = `${roleTitle} Login`;
        document.getElementById('login-card-title').innerText = `${roleTitle} Portal - Enter Credentials`;
        
        // Clear previous input/errors
        document.getElementById('login-userid').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error').style.display = 'none';

        const registerLink = document.getElementById('register-link-container');
        if (registerLink) {
            registerLink.style.display = role === 'student' ? 'block' : 'none';
        }

        window.scrollTo(0, 0);
    }

    async handleAuthSubmit(event) {
        event.preventDefault();
        const userid = document.getElementById('login-userid').value;
        const password = document.getElementById('login-password').value;
        const role = document.getElementById('login-role').value;
        
        try {
            if (role === 'student') {
                const res = await db.loginStudent(userid, password);
                this.state.currentUser = res.student.id;
                this.state.studentInfo = res.student;
                document.getElementById('login-error').style.display = 'none';
                await this.performLogin(role);
            } else {
                let valid = false;
                if (role === 'admin' && userid === 'hosteladmin#00' && password === 'AqKa6m#n') valid = true;
                if (role === 'warden' && userid === 'hostellogin#00' && password === 'AqKa6m#n') valid = true;
                
                if (valid) {
                    document.getElementById('login-error').style.display = 'none';
                    await this.performLogin(role);
                } else {
                    document.getElementById('login-error').style.display = 'block';
                }
            }
        } catch (err) {
            document.getElementById('login-error').textContent = err.message || 'Invalid user id or password.';
            document.getElementById('login-error').style.display = 'block';
        }
    }

    async performLogin(role) {
        this.state.role = role;

        if (role === 'admin') {
            this._showPage('admin-dashboard');
            this.currentDashboard = new AdminDashboard('admin-dashboard');
            try { await this.currentDashboard.render(); } catch (err) {
                console.error("Admin Dashboard Error:", err);
                document.getElementById('admin-dashboard').innerHTML = this._renderErrorPage('Admin', err);
            }
        } else if (role === 'warden') {
            this._showPage('warden-dashboard');
            this.currentDashboard = new WardenDashboard('warden-dashboard');
            try { await this.currentDashboard.render(); } catch (err) {
                console.error("Warden Dashboard Error:", err);
                document.getElementById('warden-dashboard').innerHTML = this._renderErrorPage('Warden', err);
            }
        } else if (role === 'student') {
            const studentId = this.state.currentUser || '1';
            this.state.currentUser = studentId;
            this._showPage('student-dashboard');
            this.currentDashboard = new StudentDashboard('student-dashboard', studentId);
            try { await this.currentDashboard.render(); } catch (err) {
                console.error("Student Dashboard Error:", err);
                document.getElementById('student-dashboard').innerHTML = this._renderErrorPage('Student', err);
            }
        }
    }

    _renderErrorPage(role, err) {
        return `
            <div class="dashboard-header">
                <div>
                    <h2>⚠️ ${role} Dashboard</h2>
                    <p>There was a problem loading the dashboard</p>
                </div>
                <button class="btn btn-secondary" onclick="app.logout()">← Back to Home</button>
            </div>
            <div class="card" style="margin-top:16px;">
                <h3 style="background:linear-gradient(135deg,#c62828,#e53935);">Error Details</h3>
                <div class="card-inner" style="text-align:center; padding:30px;">
                    <p style="font-size:2.5rem; margin-bottom:12px;">😔</p>
                    <p style="color:#c62828; font-size:1.1rem; font-weight:600;">Failed to load dashboard data</p>
                    <p style="color:#666; margin-top:8px; font-size:0.88rem;">Error: ${err.message}</p>
                    <div style="margin-top:20px; display:flex; gap:10px; justify-content:center;">
                        <button class="btn btn-primary" onclick="app.login('${role.toLowerCase()}')">🔄 Try Again</button>
                        <button class="btn btn-secondary" onclick="app.logout()">🏠 Go Home</button>
                    </div>
                </div>
            </div>
        `;
    }

    logout() {
        this.state = { currentUser: null, role: null };
        this._showPage('login-container');
    }

    goHome() {
        if (this.state.role === 'admin') {
            this._showPage('admin-dashboard');
        } else if (this.state.role === 'warden') {
            this._showPage('warden-dashboard');
        } else if (this.state.role === 'student') {
            this._showPage('student-dashboard');
        } else {
            this._showPage('login-container');
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    toggleLanguage() {
        const btn = document.getElementById('langToggleBtn');
        if (btn.innerText === 'தமிழ்') {
            btn.innerText = 'English';
            // Optionally, we could translate parts of the page here
            document.querySelector('.header-title-en').innerText = 'விடுதி மேலாண்மை அமைப்பு';
        } else {
            btn.innerText = 'தமிழ்';
            document.querySelector('.header-title-en').innerText = 'HOSTEL MANAGEMENT SYSTEM';
        }
    }

    showRules() {
        this._showPage('rules-container');
    }

    showMenu() {
        this._showPage('menu-container');
    }

    showComplaints() {
        this._showPage('complaints-container');
    }

    async showNoticeBoard() {
        this._showPage('notice-container');
        await this.renderNoticeBoard();
    }

    showContacts() {
        this._showPage('contacts-container');
    }

    showSitemap() {
        this._showPage('sitemap-container');
    }

    async showComplaintTracker() {
        this._showPage('complaint-tracker-container');
        await this.renderComplaintTracker();
    }

    showRegistration() {
        this._showPage('registration-container');
        const form = document.querySelector('#registration-container form');
        if (form) form.reset();
    }

    async handleRegistrationSubmit(event) {
        event.preventDefault();
        const studentData = {
            name: document.getElementById('reg-name').value,
            registerNo: document.getElementById('reg-regno').value,
            department: document.getElementById('reg-dept').value,
            program: document.getElementById('reg-program').value,
            year: document.getElementById('reg-year').value,
            mobile: document.getElementById('reg-mobile').value,
            email: document.getElementById('reg-email').value,
            userId: document.getElementById('reg-userid').value,
            password: document.getElementById('reg-password').value
        };

        try {
            await db.registerStudent(studentData);
            this.showToast('Registration Successful! You can now login.');
            setTimeout(() => {
                this.login('student');
            }, 1500);
        } catch (err) {
            alert(err.message);
        }
    }

    // --- Notice Board ---
    async renderNoticeBoard() {
        const container = document.getElementById('notice-list');
        const notices = await db.getNotices();

        if (notices.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">No notices posted yet.</p>';
            return;
        }

        container.innerHTML = notices.map(n => `
            <div class="notice-item ${n.priority === 'important' ? 'notice-important' : ''}">
                <div class="notice-header">
                    <span class="notice-badge ${n.priority}">${n.priority === 'important' ? '🔴 Important' : '🔵 General'}</span>
                    <span class="notice-date">📅 ${n.date}</span>
                </div>
                <h4 class="notice-title">${n.title}</h4>
                <p class="notice-message">${n.message}</p>
                <span class="notice-by">— Posted by ${n.postedBy}</span>
            </div>
        `).join('');
    }

    // --- Complaint Tracker ---
    async renderComplaintTracker() {
        const container = document.getElementById('tracker-list');
        const complaints = await db.getComplaints();

        if (complaints.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">No complaints submitted yet.</p>';
            return;
        }

        container.innerHTML = `
            <table class="tracker-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${complaints.map((c, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${c.studentId}</td>
                            <td>${c.category}</td>
                            <td>${c.comment.length > 50 ? c.comment.substring(0, 50) + '...' : c.comment}</td>
                            <td>${c.date}</td>
                            <td>
                                <span class="complaint-status status-${c.status.toLowerCase().replace(' ', '-')}">
                                    ${c.status === 'Pending' ? '⏳' : c.status === 'In Progress' ? '🔄' : '✅'} ${c.status}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async handleComplaintSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const fd = new FormData(form);
        const studentId = this.state.currentUser || 'Anonymous';

        try {
            await db.submitComplaint(
                studentId,
                fd.get('category'),
                fd.get('comment')
            );
            form.reset();
            this.showToast('Complaint/Query Submitted Successfully!');
        } catch (err) {
            alert(err.message);
        }
    }
}
