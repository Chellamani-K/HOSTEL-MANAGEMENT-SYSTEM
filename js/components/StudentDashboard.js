import { db } from '../api_client.js';

export class StudentDashboard {
    constructor(containerId, studentId) {
        this.container = document.getElementById(containerId);
        this.studentId = studentId;
        this.student = null;
    }

    async render() {
        try {
            const today = new Date().toISOString().split('T')[0];
            // Fetch all data in parallel, with individual fallbacks
            const [student, menu, attendanceData, mealAttendance, leaveRequests, notices] = await Promise.all([
                db.getStudent(this.studentId).catch(() => null),
                db.getMenu().catch(() => ({ date: today, breakfast: 'Not Available', lunch: 'Not Available', dinner: 'Not Available', staff: '-' })),
                db.getStudentAttendanceStatus(this.studentId, today).catch(() => ({ status: 'Absent' })),
                db.getAttendance(this.studentId).catch(() => ({ breakfast: false, lunch: false, dinner: false, present: true })),
                db.getStudentLeaveRequests(this.studentId).catch(() => []),
                db.getNotices().catch(() => [])
            ]);

            // If student data not found, show a fallback
            if (!student) {
                this.student = { id: this.studentId, name: 'Student', department: 'N/A', year: '-' };
            } else {
                this.student = student;
            }

            const recentNotices = (notices || []).slice(0, 3);
            const safeLeaveRequests = leaveRequests || [];
            const safeMenu = menu || { date: today, breakfast: 'Not Available', lunch: 'Not Available', dinner: 'Not Available', staff: '-' };
            const safeMealAttendance = mealAttendance || { breakfast: false, lunch: false, dinner: false, present: true };
            const safeAttendanceStatus = attendanceData?.status || 'Absent';

            this.container.innerHTML = `
                <div class="dashboard-header">
                    <div>
                        <h2>🎓 Hello, ${this.student.name}</h2>
                        <p>Department: ${this.student.department || this.student.dept || 'N/A'} | Date: ${today}</p>
                    </div>
                    <button class="btn btn-secondary" onclick="app.logout()">← Logout</button>
                </div>

                <!-- Recent Notices -->
                ${recentNotices.length > 0 ? `
                <div class="card" style="margin-bottom:16px;">
                    <h3 style="background:linear-gradient(135deg,#e65100,#f57c00);">📢 Latest Notices</h3>
                    <div class="card-inner">
                        ${recentNotices.map(n => `
                            <div style="padding:8px 0; border-bottom:1px solid #f0f0f0;">
                                <strong style="color:var(--primary-navy);">${n.priority === 'important' ? '🔴' : '🔵'} ${n.title}</strong>
                                <small style="color:#999; margin-left:8px;">— ${n.date}</small>
                                <p style="color:#666; font-size:0.84rem; margin-top:4px;">${n.message}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="card-grid">
                    <!-- Daily Attendance Card -->
                    <div class="card">
                        <h3>📅 Daily Attendance</h3>
                        <div class="card-inner">
                            <p style="color: #666; margin-bottom: 14px;">Mark your presence in the hostel for today.</p>
                            <div style="display:flex; justify-content:space-between; align-items:center; background: #f5f8fb; padding: 14px; border-radius: 6px;">
                                <div>
                                    <strong>Status:</strong> 
                                    <span class="status-badge ${safeAttendanceStatus === 'Present' ? 'active' : 'inactive'}">
                                        ${safeAttendanceStatus === 'Present' ? '✔ Present' : '✘ Absent'}
                                    </span>
                                </div>
                                <div style="display:flex; gap:10px;">
                                    <button class="btn btn-primary" data-action="mark-attendance" data-status="Present" ${safeAttendanceStatus === 'Present' ? 'disabled style="opacity:0.5"' : ''}>
                                        Present
                                    </button>
                                    <button class="btn btn-danger" data-action="mark-attendance" data-status="Absent" ${safeAttendanceStatus === 'Absent' ? 'disabled style="opacity:0.5"' : ''}>
                                        Absent
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Meal Opt-in Card -->
                    <div class="card">
                        <h3>🍽️ Meal Opt-in (Today: ${safeMenu.date})</h3>
                        <div class="card-inner">
                            <p style="color: #666; margin-bottom: 14px;">Toggle your availability before cutoff times.</p>
                            ${this.renderMealToggle('Breakfast', safeMenu.breakfast, safeMealAttendance.breakfast, safeMealAttendance.present)}
                            ${this.renderMealToggle('Lunch', safeMenu.lunch, safeMealAttendance.lunch, safeMealAttendance.present)}
                            ${this.renderMealToggle('Dinner', safeMenu.dinner, safeMealAttendance.dinner, safeMealAttendance.present)}
                        </div>
                    </div>

                    <!-- Meal Rating Card -->
                    <div class="card">
                        <h3 style="background:linear-gradient(135deg,#4a148c,#6a1b9a);">⭐ Rate Your Meal</h3>
                        <div class="card-inner">
                            <p style="color: #666; margin-bottom: 14px;">Help us improve! Rate today's meals.</p>
                            ${this.renderRatingForm('Breakfast', safeMenu.breakfast)}
                            ${this.renderRatingForm('Lunch', safeMenu.lunch)}
                            ${this.renderRatingForm('Dinner', safeMenu.dinner)}
                        </div>
                    </div>

                    <!-- Leave Request Card -->
                    <div class="card">
                        <h3 style="background:linear-gradient(135deg,#00695c,#00897b);">🏠 Leave Request</h3>
                        <div class="card-inner">
                            <form id="leave-form">
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                                    <div><label>From Date</label><input type="date" name="fromDate" required></div>
                                    <div><label>To Date</label><input type="date" name="toDate" required></div>
                                </div>
                                <label>Reason</label>
                                <textarea name="reason" placeholder="Reason for leave..." rows="2" required></textarea>
                                <button type="submit" class="btn btn-primary" style="width:100%;">Submit Leave Request</button>
                            </form>

                            ${safeLeaveRequests.length > 0 ? `
                            <div style="margin-top:16px; border-top:2px solid #e0e0e0; padding-top:12px;">
                                <h4 style="font-size:0.88rem; color:var(--primary-navy); margin-bottom:10px;">📋 My Leave History</h4>
                                ${safeLeaveRequests.map(lr => `
                                    <div style="padding:8px 0; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            <small style="color:#666;">📅 ${lr.fromDate} → ${lr.toDate}</small><br>
                                            <small style="color:#888;">${lr.reason}</small>
                                        </div>
                                        <span class="complaint-status status-${(lr.status || 'pending').toLowerCase()}">
                                            ${lr.status === 'Approved' ? '✅' : lr.status === 'Rejected' ? '❌' : '⏳'} ${lr.status || 'Pending'}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            this.attachEvents();
        } catch (err) {
            console.error('StudentDashboard render error:', err);
            this.container.innerHTML = `
                <div class="dashboard-header">
                    <div>
                        <h2>🎓 Student Dashboard</h2>
                        <p>Error loading dashboard data</p>
                    </div>
                    <button class="btn btn-secondary" onclick="app.logout()">← Logout</button>
                </div>
                <div class="card" style="margin-top:16px;">
                    <h3 style="background:linear-gradient(135deg,#c62828,#e53935);">⚠️ Error</h3>
                    <div class="card-inner" style="text-align:center; padding:30px;">
                        <p style="color:#c62828; font-size:1.1rem; font-weight:600;">Failed to load dashboard data</p>
                        <p style="color:#666; margin-top:8px;">Error: ${err.message}</p>
                        <button class="btn btn-primary" style="margin-top:16px;" onclick="app.login('student')">🔄 Try Again</button>
                    </div>
                </div>
            `;
        }
    }

    renderMealToggle(type, desc, isOpted, isPresent) {
        const isCutoff = db.isCutoffPassed(type);
        const isDisabled = isCutoff || !isPresent;

        return `
            <div class="meal-toggle">
                <div>
                    <strong style="color: var(--primary-navy);">${type}</strong> <br>
                    <small style="color: #666;">${desc || 'N/A'}</small> <br>
                    ${isCutoff ? '<small style="color:var(--danger)">⏰ Cutoff passed</small>' :
                !isPresent ? '<small style="color:var(--danger)">⚠ Marked Absent</small>' :
                    '<small style="color:var(--success)">✅ Open for opt-in</small>'}
                </div>
                <div class="switch">
                    <button class="btn ${isOpted ? 'btn-primary' : 'btn-secondary'}" 
                        ${isDisabled ? 'disabled style="opacity:0.5"' : ''}
                        data-action="toggle" data-type="${type}">
                        ${isOpted ? '✔ Eating' : '✘ Skipping'}
                    </button>
                </div>
            </div>
        `;
    }

    renderRatingForm(mealType, desc) {
        return `
            <div style="padding:10px 0; border-bottom:1px solid #f0f0f0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:var(--primary-navy);">${mealType}</strong><br>
                        <small style="color:#666;">${desc || 'N/A'}</small>
                    </div>
                    <div class="star-rating" data-meal="${mealType}">
                        ${[1, 2, 3, 4, 5].map(s => `
                            <span class="star" data-rating="${s}" data-meal-type="${mealType}" 
                                style="font-size:1.4rem; cursor:pointer; color:#ddd; transition:color 0.2s;">★</span>
                        `).join('')}
                    </div>
                </div>
                <div style="margin-top:6px; display:none;" class="rating-comment-${mealType}">
                    <div style="display:flex; gap:6px;">
                        <input type="text" class="rating-input-${mealType}" placeholder="Add a comment (optional)" style="margin:0; flex:1; font-size:0.82rem;">
                        <button class="btn btn-primary" data-action="submit-rating" data-meal="${mealType}" style="padding:6px 12px; font-size:0.78rem;">Submit</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // Presence Action
        this.container.querySelectorAll('[data-action="mark-attendance"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const status = e.target.dataset.status;
                try {
                    const today = new Date().toISOString().split('T')[0];
                    await db.markStudentAttendance(this.studentId, status, today);
                    await this.render();
                    window.app.showToast(`Attendance marked as ${status}`);
                } catch (err) { alert(err.message); }
            });
        });

        // Meal Toggle
        this.container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const type = e.target.dataset.type;
                try {
                    await db.toggleMeal(this.studentId, type);
                    await this.render();
                    window.app.showToast(`Updated ${type} status`);
                } catch (err) { alert(err.message); }
            });
        });

        // Star Ratings
        let selectedRatings = {};
        this.container.querySelectorAll('.star').forEach(star => {
            star.addEventListener('mouseenter', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                const meal = e.target.dataset.mealType;
                const stars = this.container.querySelectorAll(`.star[data-meal-type="${meal}"]`);
                stars.forEach((s, i) => { s.style.color = i < rating ? '#ffc107' : '#ddd'; });
            });

            star.addEventListener('mouseleave', (e) => {
                const meal = e.target.dataset.mealType;
                const selected = selectedRatings[meal] || 0;
                const stars = this.container.querySelectorAll(`.star[data-meal-type="${meal}"]`);
                stars.forEach((s, i) => { s.style.color = i < selected ? '#ffc107' : '#ddd'; });
            });

            star.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                const meal = e.target.dataset.mealType;
                selectedRatings[meal] = rating;
                const stars = this.container.querySelectorAll(`.star[data-meal-type="${meal}"]`);
                stars.forEach((s, i) => { s.style.color = i < rating ? '#ffc107' : '#ddd'; });
                // Show comment box
                const commentBox = this.container.querySelector(`.rating-comment-${meal}`);
                if (commentBox) commentBox.style.display = 'block';
            });
        });

        // Submit Rating
        this.container.querySelectorAll('[data-action="submit-rating"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const meal = e.target.dataset.meal;
                const rating = selectedRatings[meal];
                if (!rating) { alert('Please select a star rating first.'); return; }
                const commentInput = this.container.querySelector(`.rating-input-${meal}`);
                const comment = commentInput ? commentInput.value : '';
                await db.submitMealRating(this.studentId, meal, rating, comment);
                window.app.showToast(`${meal} rated ${rating} ⭐`);
                selectedRatings[meal] = 0;
                const commentBox = this.container.querySelector(`.rating-comment-${meal}`);
                if (commentBox) commentBox.style.display = 'none';
                if (commentInput) commentInput.value = '';
                // Reset stars
                const stars = this.container.querySelectorAll(`.star[data-meal-type="${meal}"]`);
                stars.forEach(s => { s.style.color = '#ddd'; });
            });
        });

        // Leave Request Form
        const leaveForm = this.container.querySelector('#leave-form');
        if (leaveForm) {
            leaveForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(leaveForm);
                await db.submitLeaveRequest(this.studentId, this.student.name, fd.get('fromDate'), fd.get('toDate'), fd.get('reason'));
                window.app.showToast('Leave Request Submitted');
                leaveForm.reset();
                await this.render();
            });
        }
    }
}
