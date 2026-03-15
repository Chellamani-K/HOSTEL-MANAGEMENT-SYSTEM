import { db, TOTAL_STRENGTH } from '../api_client.js';

export class AdminDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.searchQuery = '';
    }

    async render() {
        const [studentsResponse, stock, stockAlerts, complaints, leaveRequests] = await Promise.all([
            (this.searchQuery ? db.searchStudents(this.searchQuery) : db.getAllStudents()).catch(() => []),
            db.getStock().catch(() => ({ rice: 0, wheat: 0, oil: 0, gas: 0, masala: 0, eggs: 0, potato: 0, beans: 0, tomato: 0, onion: 0, radish: 0, other_veg: 0 })),
            db.getStockAlerts().catch(() => []),
            db.getComplaints().catch(() => []),
            db.getLeaveRequests().catch(() => [])
        ]);

        const students = studentsResponse || [];
        const allStudents = await db.getAllStudents().catch(() => []);
        const pendingComplaints = (complaints || []).filter(c => c.status === 'Pending');
        const pendingLeaves = (leaveRequests || []).filter(l => l.status === 'Pending');

        this.container.innerHTML = `
            <div class="dashboard-header">
                <div>
                    <h2>🛡️ Admin Panel</h2>
                    <p>Manage Student Database | <strong>Total Strength: ${TOTAL_STRENGTH}</strong> | Registered: ${allStudents.length}</p>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-primary" onclick="app.currentDashboard.showNoticeManager()">📢 Notices</button>
                    <button class="btn btn-secondary" onclick="app.logout()">← Logout</button>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="stats-row" style="margin-bottom:20px;">
                <div class="stat-item">
                    <div class="stat-icon">👥</div>
                    <div class="stat-number">${allStudents.length}</div>
                    <div class="stat-label">Students</div>
                </div>
                <div class="stat-item" style="${stockAlerts.length > 0 ? 'border: 2px solid #e65100;' : ''}">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-number" style="${stockAlerts.length > 0 ? 'color:#e65100;' : ''}">${stockAlerts.length}</div>
                    <div class="stat-label">Stock Alerts</div>
                </div>
                <div class="stat-item" style="${pendingComplaints.length > 0 ? 'border: 2px solid #c62828;' : ''}">
                    <div class="stat-icon">📋</div>
                    <div class="stat-number" style="${pendingComplaints.length > 0 ? 'color:#c62828;' : ''}">${pendingComplaints.length}</div>
                    <div class="stat-label">Pending Complaints</div>
                </div>
                <div class="stat-item" style="${pendingLeaves.length > 0 ? 'border: 2px solid #f57c00;' : ''}">
                    <div class="stat-icon">🏠</div>
                    <div class="stat-number" style="${pendingLeaves.length > 0 ? 'color:#f57c00;' : ''}">${pendingLeaves.length}</div>
                    <div class="stat-label">Leave Requests</div>
                </div>
            </div>

            ${stockAlerts.length > 0 ? `
            <div class="card" style="margin-bottom:16px; border-left: 4px solid #e65100;">
                <h3 style="background: linear-gradient(135deg, #e65100, #f57c00);">⚠️ Low Stock Alerts</h3>
                <div class="card-inner">
                    <div style="display:flex; flex-wrap:wrap; gap:10px;">
                        ${stockAlerts.map(a => `
                            <div style="padding:8px 14px; border-radius:6px; font-size:0.84rem; font-weight:600;
                                background: ${a.level === 'critical' ? '#ffebee' : '#fff3e0'};
                                color: ${a.level === 'critical' ? '#c62828' : '#e65100'};
                                border: 1px solid ${a.level === 'critical' ? '#ffcdd2' : '#ffe0b2'};">
                                ${a.level === 'critical' ? '🔴' : '🟡'} ${a.item}: ${a.qty} left
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="card-grid">
                <!-- Add Student -->
                <div class="card">
                    <h3>➕ Add New Student</h3>
                    <div class="card-inner">
                        <form id="add-student-form">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                                <div><label>Student ID</label><input type="text" name="id" placeholder="e.g. S006" required></div>
                                <div><label>Full Name</label><input type="text" name="name" placeholder="Full Name" required></div>
                                <div><label>Department</label><input type="text" name="dept" placeholder="Department" required></div>
                                <div><label>Year</label><input type="number" name="year" placeholder="Year" min="1" max="5" required></div>
                                <div><label>Hostel ID</label><input type="text" name="hostel" placeholder="e.g. H1" required></div>
                                <div><label>Room No</label><input type="text" name="room" placeholder="e.g. 101"></div>
                                <div style="grid-column:span 2;"><label>Phone</label><input type="tel" name="phone" placeholder="Mobile Number"></div>
                            </div>
                            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">Add Student</button>
                        </form>
                    </div>
                </div>

                <!-- Student List with Search -->
                <div class="card">
                    <h3>📋 Student Registry (${students.length}${this.searchQuery ? ` matching "${this.searchQuery}"` : ''})</h3>
                    <div class="card-inner">
                        <div style="display:flex; gap:8px; margin-bottom:12px;">
                            <input type="text" id="student-search" placeholder="🔍 Search by name, ID, dept, room..."
                                value="${this.searchQuery}" style="margin-bottom:0; flex:1;">
                            <button class="btn btn-secondary" onclick="app.currentDashboard.downloadExcel()">📥 Export</button>
                        </div>
                        <div style="max-height: 400px; overflow-y: auto;">
                           ${students.length === 0 ? '<p style="text-align:center; color:#999; padding:20px;">No students found.</p>' :
                students.map(s => `
                               <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                                   <div>
                                       <strong style="color: var(--primary-navy);">${s.name}</strong> 
                                       <span style="color: #999; font-size:0.8rem;">(${s.id})</span><br>
                                       <small style="color: #666;">${s.dept} - Year ${s.year} | Hostel: ${s.hostel}${s.room ? ' | Room: ' + s.room : ''}${s.phone ? ' | 📱 ' + s.phone : ''}</small>
                                   </div>
                                   <button class="btn btn-danger" style="padding: 5px 12px; font-size:0.78rem;" 
                                       data-action="remove" data-id="${s.id}">Remove</button>
                               </div>
                           `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Complaint Management -->
                <div class="card">
                    <h3 style="background: linear-gradient(135deg, #880e4f, #ad1457);">📢 Complaint Management</h3>
                    <div class="card-inner">
                        <div style="max-height: 350px; overflow-y: auto;">
                            ${complaints.length === 0 ? '<p style="text-align:center; color:#999;">No complaints yet.</p>' :
                complaints.map((c, i) => `
                                <div style="padding:10px; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <strong>${c.category}</strong> <span style="color:#999; font-size:0.78rem;">by ${c.studentId}</span><br>
                                        <small style="color:#666;">${c.comment.substring(0, 60)}${c.comment.length > 60 ? '...' : ''}</small>
                                    </div>
                                    <select data-action="update-complaint" data-index="${i}" 
                                        style="width:auto; margin:0; padding:4px 8px; font-size:0.78rem;">
                                        <option value="Pending" ${c.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                                        <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>🔄 In Progress</option>
                                        <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>✅ Resolved</option>
                                    </select>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Leave Management -->
                <div class="card">
                    <h3 style="background: linear-gradient(135deg, #e65100, #f57c00);">🏠 Leave Requests</h3>
                    <div class="card-inner">
                        <div style="max-height: 350px; overflow-y: auto;">
                            ${leaveRequests.length === 0 ? '<p style="text-align:center; color:#999;">No leave requests.</p>' :
                leaveRequests.map(lr => `
                                <div style="padding:10px; border-bottom:1px solid #f0f0f0;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            <strong style="color:var(--primary-navy);">${lr.studentName}</strong> 
                                            <span style="color:#999; font-size:0.78rem;">(${lr.studentId})</span><br>
                                            <small style="color:#666;">📅 ${lr.fromDate} → ${lr.toDate} | Reason: ${lr.reason}</small>
                                        </div>
                                        <div style="display:flex; gap:4px;">
                                            ${lr.status === 'Pending' ? `
                                                <button class="btn btn-primary" style="padding:4px 10px; font-size:0.75rem;" 
                                                    data-action="approve-leave" data-id="${lr.id}">✔ Approve</button>
                                                <button class="btn btn-danger" style="padding:4px 10px; font-size:0.75rem;" 
                                                    data-action="reject-leave" data-id="${lr.id}">✘ Reject</button>
                                            ` : `
                                                <span class="complaint-status status-${lr.status.toLowerCase()}">${lr.status === 'Approved' ? '✅' : '❌'} ${lr.status}</span>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Stock Management -->
                <div class="card" style="grid-column: span 1;">
                    <h3 style="background: linear-gradient(135deg, #2e7d32, #388e3c);">🍎 Stock Management</h3>
                    <div class="card-inner">
                        <form id="stock-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div><label>Rice (kg)</label><input type="number" name="rice" value="${stock.rice}" min="0"></div>
                            <div><label>Wheat Flour (kg)</label><input type="number" name="wheat" value="${stock.wheat}" min="0"></div>
                            <div><label>Cooking Oil (L)</label><input type="number" name="oil" value="${stock.oil}" min="0"></div>
                            <div><label>Gas Cylinders</label><input type="number" name="gas" value="${stock.gas}" min="0"></div>
                            <div><label>Masala Items (kg)</label><input type="number" name="masala" value="${stock.masala}" min="0"></div>
                            <div><label>Eggs (units)</label><input type="number" name="eggs" value="${stock.eggs}" min="0"></div>
                            <div style="grid-column: span 2; margin-top: 10px; border-top: 2px solid #e0e0e0; padding-top: 12px;">
                                <h4 style="margin-bottom: 10px; color: var(--primary-navy); font-size: 0.9rem;">🥕 Vegetables Stock (kg)</h4>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                    <div><label>Potato</label><input type="number" name="potato" value="${stock.potato || 0}" min="0"></div>
                                    <div><label>Beans</label><input type="number" name="beans" value="${stock.beans || 0}" min="0"></div>
                                    <div><label>Tomato</label><input type="number" name="tomato" value="${stock.tomato || 0}" min="0"></div>
                                    <div><label>Onion</label><input type="number" name="onion" value="${stock.onion || 0}" min="0"></div>
                                    <div><label>Radish</label><input type="number" name="radish" value="${stock.radish || 0}" min="0"></div>
                                    <div><label>Other Veg</label><input type="number" name="other_veg" value="${stock.other_veg || 0}" min="0"></div>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary" style="grid-column: span 2; margin-top: 10px;">Update Stock</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Notice Manager Modal -->
            <dialog id="notice-modal" style="border:none; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.2); padding:0; max-width:550px; width:90%;">
                <div style="padding:18px 22px; background:linear-gradient(135deg,#003366,#1a3a6c); border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color:white; margin:0; font-size:1rem;">📢 Post New Notice</h3>
                    <button class="btn btn-secondary" id="close-notice-modal" style="font-size:0.8rem;">Close</button>
                </div>
                <div style="padding:22px;">
                    <form id="notice-form">
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
        const modal = this.container.querySelector('#notice-modal');
        modal.showModal();
    }

    async downloadExcel() {
        const students = await db.getAllStudents();
        if (!students || students.length === 0) { alert('No students to export.'); return; }

        let csvContent = "Student ID,Name,Department,Year,Hostel ID,Room,Phone\n";
        students.forEach(s => {
            const row = [s.id, `"${s.name}"`, s.dept, s.year, s.hostel, s.room || '', s.phone || ''].join(",");
            csvContent += row + "\n";
        });

        const bom = "\uFEFF";
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "student_registry_excel.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    attachEvents() {
        // Add Student Form
        const form = this.container.querySelector('#add-student-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const student = {
                id: fd.get('id'),
                name: fd.get('name'),
                dept: fd.get('dept'),
                year: parseInt(fd.get('year')),
                hostel: fd.get('hostel'),
                room: fd.get('room') || '',
                phone: fd.get('phone') || ''
            };
            await db.addStudent(student);
            window.app.showToast('Student Added Successfully');
            this.searchQuery = '';
            await this.render();
        });

        // Remove Student
        this.container.querySelectorAll('[data-action="remove"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (confirm('Are you sure you want to remove this student?')) {
                    await db.removeStudent(id);
                    await this.render();
                    window.app.showToast('Student Removed');
                }
            });
        });

        // Search
        const searchInput = this.container.querySelector('#student-search');
        searchInput.addEventListener('input', async (e) => {
            this.searchQuery = e.target.value;
            await this.render();
            // Restore focus
            const newInput = this.container.querySelector('#student-search');
            newInput.focus();
            newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
        });

        // Stock Form
        const stockForm = this.container.querySelector('#stock-form');
        if (stockForm) {
            stockForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(stockForm);
                const stockData = {};
                for (const [key, val] of fd.entries()) { stockData[key] = val; }
                await db.updateStock(stockData);
                window.app.showToast('Stock Updated Successfully');
                await this.render();
            });
        }

        // Complaint Status Update
        this.container.querySelectorAll('[data-action="update-complaint"]').forEach(sel => {
            sel.addEventListener('change', async (e) => {
                const index = parseInt(e.target.dataset.index);
                await db.updateComplaintStatus(index, e.target.value);
                window.app.showToast('Complaint Status Updated');
                await this.render();
            });
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
        const noticeModal = this.container.querySelector('#notice-modal');
        const closeNoticeBtn = this.container.querySelector('#close-notice-modal');
        closeNoticeBtn.addEventListener('click', () => noticeModal.close());

        const noticeForm = this.container.querySelector('#notice-form');
        noticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(noticeForm);
            await db.addNotice(fd.get('title'), fd.get('message'), 'Admin', fd.get('priority'));
            noticeForm.reset();
            noticeModal.close();
            window.app.showToast('Notice Posted Successfully');
        });
    }
}
