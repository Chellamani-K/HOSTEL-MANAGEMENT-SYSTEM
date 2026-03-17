import { db } from '../api_client.js';

export class WardenDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    async render() {
        // Fetch all data from the backend in parallel, with individual fallbacks
        const [stats, menu, ratings, stockAlerts, allLeaves] = await Promise.all([
            db.getAnalytics().catch(() => ({ breakfast: { optIn: 0, total: 200 }, lunch: { optIn: 0, total: 200 }, dinner: { optIn: 0, total: 200 }, presentToday: 0 })),
            db.getMenu().catch(() => ({ date: new Date().toISOString().split('T')[0], breakfast: 'Not Available', lunch: 'Not Available', dinner: 'Not Available', staff: '-' })),
            db.getTodayAverageRatings().catch(() => ({ Breakfast: { avg: 'N/A', count: 0 }, Lunch: { avg: 'N/A', count: 0 }, Dinner: { avg: 'N/A', count: 0 } })),
            db.getStockAlerts().catch(() => []),
            db.getLeaveRequests().catch(() => [])
        ]);
        const pendingLeaves = (allLeaves || []).filter(l => l.status === 'Pending');

        this.container.innerHTML = `
            <div class="dashboard-header">
                <div>
                    <h2>👨‍🍳 Warden Dashboard</h2>
                    <p>Live Mess Analytics & Menu Management | <strong>Total: ${stats.breakfast.total} | Present Today: ${stats.presentToday}</strong></p>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-primary" id="view-attn-btn">📋 Attendance</button>
                    <button class="btn btn-primary" id="view-report-btn" style="background:linear-gradient(135deg,#2e7d32,#388e3c);">📊 Daily Report</button>
                    <button class="btn btn-primary" onclick="app.currentDashboard.showNoticeManager()" style="background:linear-gradient(135deg,#e65100,#f57c00);">📢 Post Notice</button>
                    <button class="btn btn-secondary" onclick="app.logout()">← Logout</button>
                </div>
            </div>

            <!-- Quick Alerts -->
            ${stockAlerts.length > 0 || pendingLeaves.length > 0 ? `
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
                ${stockAlerts.length > 0 ? `
                <div style="padding:10px 16px; background:#fff3e0; border:1px solid #ffe0b2; border-radius:6px; font-size:0.84rem; color:#e65100; font-weight:500;">
                    ⚠️ ${stockAlerts.length} stock item(s) running low!
                </div>` : ''}
                ${pendingLeaves.length > 0 ? `
                <div style="padding:10px 16px; background:#e3f2fd; border:1px solid #bbdefb; border-radius:6px; font-size:0.84rem; color:#1565c0; font-weight:500;">
                    🏠 ${pendingLeaves.length} pending leave request(s)
                </div>` : ''}
            </div>
            ` : ''}

            <div class="card-grid">
                <!-- Live Analytics Card -->
                <div class="card">
                    <h3>📊 Live Consumption Forecast</h3>
                    <div class="card-inner">
                        <p style="color: #666; margin-bottom: 16px;">Real-time headcount for today's meals.</p>
                        ${this.renderStatBar('Breakfast', stats.breakfast)}
                        ${this.renderStatBar('Lunch', stats.lunch)}
                        ${this.renderStatBar('Dinner', stats.dinner)}
                    </div>
                </div>

                <!-- Meal Ratings Overview -->
                <div class="card">
                    <h3 style="background:linear-gradient(135deg,#4a148c,#6a1b9a);">⭐ Today's Meal Ratings</h3>
                    <div class="card-inner">
                        <p style="color: #666; margin-bottom: 16px;">Average student feedback for today's meals.</p>
                        ${['Breakfast', 'Lunch', 'Dinner'].map(meal => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f9fafb; border-radius:6px; margin-bottom:8px;">
                                <strong style="color:var(--primary-navy);">${meal}</strong>
                                <div>
                                    <span style="font-size:1.3rem; color:#ffc107;">${ratings[meal].avg !== 'N/A' ? '★'.repeat(Math.round(parseFloat(ratings[meal].avg))) + '☆'.repeat(5 - Math.round(parseFloat(ratings[meal].avg))) : '☆☆☆☆☆'}</span>
                                    <span style="color:#666; font-size:0.82rem; margin-left:6px;">${ratings[meal].avg} (${ratings[meal].count} votes)</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Menu Management Card -->
                <div class="card">
                    <h3 style="background:linear-gradient(135deg,#2e7d32,#388e3c);">📝 Update Daily Menu</h3>
                    <div class="card-inner">
                        <form id="menu-form">
                            <label>Breakfast</label>
                            <input type="text" name="breakfast" value="${menu.breakfast}">
                            <label>Lunch</label>
                            <input type="text" name="lunch" value="${menu.lunch}">
                            <label>Dinner</label>
                            <input type="text" name="dinner" value="${menu.dinner}">
                            <label>Staff on Duty</label>
                            <input type="text" name="staff" value="${menu.staff}">
                            <button type="submit" class="btn btn-primary" style="width:100%">Update Menu</button>
                        </form>
                    </div>
                </div>

                <!-- Leave Requests (Quick View) -->
                <div class="card">
                    <h3 style="background:linear-gradient(135deg,#e65100,#f57c00);">🏠 Pending Leave Requests (${pendingLeaves.length})</h3>
                    <div class="card-inner">
                        ${pendingLeaves.length === 0 ? '<p style="text-align:center; color:#999; padding:20px;">No pending leaves 👍</p>' :
                pendingLeaves.map(lr => `
                            <div style="padding:10px; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:var(--primary-navy);">${lr.studentName}</strong> <span style="color:#999; font-size:0.78rem;">(${lr.studentId})</span><br>
                                    <small style="color:#666;">📅 ${lr.fromDate} → ${lr.toDate} | ${lr.reason}</small>
                                </div>
                                <div style="display:flex; gap:4px;">
                                    <button class="btn btn-primary" style="padding:4px 10px; font-size:0.75rem;" 
                                        data-action="approve-leave" data-id="${lr.id}">✔</button>
                                    <button class="btn btn-danger" style="padding:4px 10px; font-size:0.75rem;" 
                                        data-action="reject-leave" data-id="${lr.id}">✘</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Attendance Modal -->
            <dialog id="attendance-modal" style="border:none; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.2); padding:0; max-width:650px; width:90%;">
                <div style="padding:18px 22px; background:linear-gradient(135deg,#003366,#1a3a6c); border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color:white; margin:0; font-size:1rem;">📋 Daily Attendance List</h3>
                    <div style="display:flex; gap:6px;">
                        <button id="whatsapp-attn" style="font-size:0.8rem; background:#25D366; color:white; border:none; border-radius:4px; padding:6px 12px; cursor:pointer;" title="Share on WhatsApp"><span style="margin-right:4px;">💬</span> Share</button>
                        <button class="btn btn-secondary" id="close-modal" style="font-size:0.8rem;">Close</button>
                    </div>
                </div>
                <div style="padding:20px; max-height:60vh; overflow-y:auto;">
                    <table>
                        <thead><tr><th>ID</th><th>Name</th><th>Room</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th></tr></thead>
                        <tbody id="attendance-list-body"></tbody>
                    </table>
                </div>
            </dialog>

            <!-- Daily Report Modal -->
            <dialog id="report-modal" style="border:none; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.2); padding:0; max-width:700px; width:90%;">
                <div style="padding:18px 22px; background:linear-gradient(135deg,#2e7d32,#388e3c); border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color:white; margin:0; font-size:1rem;">📊 Daily Report</h3>
                    <div style="display:flex; gap:6px;">
                        <button id="whatsapp-share" style="font-size:0.8rem; background:#25D366; color:white; border:none; border-radius:4px; padding:6px 12px; cursor:pointer;" title="Share on WhatsApp"><span style="margin-right:4px;">💬</span> Share</button>
                        <button class="btn btn-secondary" id="print-report" style="font-size:0.8rem;">🖨️ Print</button>
                        <button class="btn btn-secondary" id="close-report" style="font-size:0.8rem;">Close</button>
                    </div>
                </div>
                <div id="report-content" style="padding:22px; max-height:65vh; overflow-y:auto;"></div>
            </dialog>

            <!-- Notice Modal -->
            <dialog id="notice-modal-warden" style="border:none; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.2); padding:0; max-width:550px; width:90%;">
                <div style="padding:18px 22px; background:linear-gradient(135deg,#e65100,#f57c00); border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color:white; margin:0; font-size:1rem;">📢 Post New Notice</h3>
                    <button class="btn btn-secondary" id="close-notice-modal-w" style="font-size:0.8rem;">Close</button>
                </div>
                <div style="padding:22px;">
                    <form id="notice-form-w">
                        <label>Notice Title</label>
                        <input type="text" name="title" placeholder="Enter notice title..." required>
                        <label>Message</label>
                        <textarea name="message" placeholder="Enter notice details..." rows="4" required></textarea>
                        <label>Priority</label>
                        <select name="priority">
                            <option value="normal">🔵 General</option>
                            <option value="important">🔴 Important</option>
                        </select>
                        <button type="submit" class="btn btn-primary" style="width:100%;">Post Notice</button>
                    </form>
                </div>
            </dialog>
        `;

        this.attachEvents();
    }

    showNoticeManager() {
        const modal = this.container.querySelector('#notice-modal-warden');
        modal.showModal();
    }

    renderStatBar(label, data) {
        const percentage = Math.round((data.optIn / data.total) * 100);
        return `
            <div style="margin-bottom: 20px;">
                <div style="display:flex; justify-content:space-between; font-weight:600; color: var(--primary-navy); font-size: 0.88rem;">
                    <span>${label}</span>
                    <span>${data.optIn} / ${data.total} Students</span>
                </div>
                <div class="stat-bar">
                    <div class="stat-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // Menu Form
        const form = this.container.querySelector('#menu-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            await db.updateMenu({ breakfast: fd.get('breakfast'), lunch: fd.get('lunch'), dinner: fd.get('dinner'), staff: fd.get('staff') });
            window.app.showToast('Menu Updated Successfully');
            await this.render();
        });

        // Attendance Modal
        const modal = this.container.querySelector('#attendance-modal');
        this.container.querySelector('#view-attn-btn').addEventListener('click', async () => { await this.renderAttendanceList(); modal.showModal(); });
        this.container.querySelector('#close-modal').addEventListener('click', () => modal.close());
        this.container.querySelector('#whatsapp-attn').addEventListener('click', async () => {
            const list = await db.getDailyAttendanceDetails();
            let msg = `*Daily Attendance Report - ${new Date().toLocaleDateString('en-IN')}*\n\n`;
            let presentCount = list.filter(s => s.attendance.breakfast || s.attendance.lunch || s.attendance.dinner).length;
            msg += `Total Students: ${list.length}\n`;
            msg += `Present Today (at least one meal): ${presentCount}\n\n`;
            msg += `*Details:*\n`;
            list.forEach((s, idx) => {
                let meals = [];
                if (s.attendance.breakfast) meals.push('B');
                if (s.attendance.lunch) meals.push('L');
                if (s.attendance.dinner) meals.push('D');
                msg += `- ${s.name} (${s.id}): ${meals.length ? meals.join(',') : 'Absent'}\n`;
            });
            const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        });

        // Report Modal
        const reportModal = this.container.querySelector('#report-modal');
        this.container.querySelector('#view-report-btn').addEventListener('click', async () => { await this.renderDailyReport(); reportModal.showModal(); });
        this.container.querySelector('#close-report').addEventListener('click', () => reportModal.close());
        this.container.querySelector('#whatsapp-share').addEventListener('click', async () => {
            const report = await db.generateDailyReport();
            let msg = `*Daily Hostel Report - ${report.date}*\n\n`;
            msg += `*Meal Stats:*\n`;
            msg += `🍳 Breakfast: ${report.stats.breakfast.optIn}/${report.stats.breakfast.total}\n`;
            msg += `🍛 Lunch: ${report.stats.lunch.optIn}/${report.stats.lunch.total}\n`;
            msg += `🍲 Dinner: ${report.stats.dinner.optIn}/${report.stats.dinner.total}\n\n`;
            msg += `👨‍🎓 Total Present: ${report.stats.presentToday}\n`;
            msg += `📝 Pending Leaves: ${report.pendingLeaves}\n`;
            if(report.stockAlerts.length > 0) {
                msg += `⚠️ Low Stock: ${report.stockAlerts.map(a => a.item).join(', ')}\n`;
            }
            msg += `\n*Today's Menu:*\nB: ${report.menu.breakfast}\nL: ${report.menu.lunch}\nD: ${report.menu.dinner}\n`;
            const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        });
        this.container.querySelector('#print-report').addEventListener('click', () => {
            const content = this.container.querySelector('#report-content').innerHTML;
            const win = window.open('', '_blank');
            win.document.write(`
                <html><head><title>Daily Report - ${db.getTodayStr()}</title>
                <style>body{font-family:Arial,sans-serif;padding:20px;color:#333;}table{width:100%;border-collapse:collapse;margin:10px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#003366;color:white;}h2,h3{color:#003366;}.section{margin:16px 0;padding:12px;border:1px solid #ddd;border-radius:4px;}</style>
                </head><body>${content}</body></html>
            `);
            win.document.close();
            win.print();
        });

        // Leave Approve/Reject
        this.container.querySelectorAll('[data-action="approve-leave"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await db.updateLeaveStatus(parseInt(e.target.dataset.id), 'Approved');
                window.app.showToast('Leave Approved');
                await this.render();
            });
        });

        this.container.querySelectorAll('[data-action="reject-leave"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await db.updateLeaveStatus(parseInt(e.target.dataset.id), 'Rejected');
                window.app.showToast('Leave Rejected');
                await this.render();
            });
        });

        // Notice Modal
        const noticeModal = this.container.querySelector('#notice-modal-warden');
        this.container.querySelector('#close-notice-modal-w').addEventListener('click', () => noticeModal.close());
        const noticeForm = this.container.querySelector('#notice-form-w');
        noticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(noticeForm);
            await db.addNotice(fd.get('title'), fd.get('message'), 'Warden', fd.get('priority'));
            noticeForm.reset();
            noticeModal.close();
            window.app.showToast('Notice Posted Successfully');
        });
    }

    async renderAttendanceList() {
        const list = await db.getDailyAttendanceDetails();
        const tbody = this.container.querySelector('#attendance-list-body');

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">No students registered</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(s => `
            <tr>
                <td>${s.id}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.room || '-'}</td>
                <td style="color:${s.attendance.breakfast ? 'var(--success)' : '#ccc'}">${s.attendance.breakfast ? '✔ Yes' : '• No'}</td>
                <td style="color:${s.attendance.lunch ? 'var(--success)' : '#ccc'}">${s.attendance.lunch ? '✔ Yes' : '• No'}</td>
                <td style="color:${s.attendance.dinner ? 'var(--success)' : '#ccc'}">${s.attendance.dinner ? '✔ Yes' : '• No'}</td>
            </tr>
        `).join('');
    }

    async renderDailyReport() {
        const report = await db.generateDailyReport();
        const content = this.container.querySelector('#report-content');

        content.innerHTML = `
            <h2 style="text-align:center; color:var(--primary-navy); margin-bottom:4px;">🏨 Hostel Management System</h2>
            <h3 style="text-align:center; color:#666; font-weight:400; margin-bottom:20px;">Daily Report — ${report.date}</h3>
            
            <div class="section" style="margin:16px 0; padding:14px; border:1px solid #e0e0e0; border-radius:6px;">
                <h4 style="color:var(--primary-navy); margin-bottom:10px;">📊 Meal Statistics</h4>
                <table>
                    <thead><tr><th>Meal</th><th>Opted In</th><th>Total</th><th>Percentage</th><th>Avg Rating</th></tr></thead>
                    <tbody>
                        <tr><td>Breakfast</td><td>${report.stats.breakfast.optIn}</td><td>${report.stats.breakfast.total}</td><td>${Math.round(report.stats.breakfast.optIn / report.stats.breakfast.total * 100)}%</td><td>${report.ratings.Breakfast.avg} ⭐</td></tr>
                        <tr><td>Lunch</td><td>${report.stats.lunch.optIn}</td><td>${report.stats.lunch.total}</td><td>${Math.round(report.stats.lunch.optIn / report.stats.lunch.total * 100)}%</td><td>${report.ratings.Lunch.avg} ⭐</td></tr>
                        <tr><td>Dinner</td><td>${report.stats.dinner.optIn}</td><td>${report.stats.dinner.total}</td><td>${Math.round(report.stats.dinner.optIn / report.stats.dinner.total * 100)}%</td><td>${report.ratings.Dinner.avg} ⭐</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="section" style="margin:16px 0; padding:14px; border:1px solid #e0e0e0; border-radius:6px;">
                <h4 style="color:var(--primary-navy); margin-bottom:10px;">🍽️ Today's Menu</h4>
                <table>
                    <thead><tr><th>Meal</th><th>Items</th></tr></thead>
                    <tbody>
                        <tr><td>Breakfast</td><td>${report.menu.breakfast}</td></tr>
                        <tr><td>Lunch</td><td>${report.menu.lunch}</td></tr>
                        <tr><td>Dinner</td><td>${report.menu.dinner}</td></tr>
                        <tr><td>Staff</td><td>${report.menu.staff}</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="section" style="margin:16px 0; padding:14px; border:1px solid #e0e0e0; border-radius:6px;">
                <h4 style="color:var(--primary-navy); margin-bottom:10px;">📋 Summary</h4>
                <table>
                    <tbody>
                        <tr><td>Present Today</td><td><strong>${report.stats.presentToday}</strong></td></tr>
                        <tr><td>Total Complaints</td><td>${report.complaints.total} (Pending: ${report.complaints.pending}, Resolved: ${report.complaints.resolved})</td></tr>
                        <tr><td>Pending Leave Requests</td><td>${report.pendingLeaves}</td></tr>
                        <tr><td>Stock Alerts</td><td>${report.stockAlerts.length > 0 ? report.stockAlerts.map(a => `${a.item} (${a.qty})`).join(', ') : 'All good ✅'}</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }
}
