// RHU Katipunan Blood Donation System - Complete JavaScript

/* ---------- STORAGE ---------- */
let users = {};
let schedules = [];
let appointments = [];
let notifications = { admin: [], donor: [] };
let messages = [];
let deletedItems = { schedules: [], appointments: [], donors: [] };
let currentUser = null;
let selectedScheduleId = null;
let editingScheduleId = null;
let isEligible = false;
let currentChatUser = null;
let currentAptId = null;

/* ---------- UTILITY FUNCTIONS ---------- */
function qs(id) { return document.getElementById(id); }

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateTime(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleString('en-US', options);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ---------- LOCALSTORAGE FUNCTIONS ---------- */
function saveToLocalStorage() {
    try {
        const data = {
            users: users,
            schedules: schedules,
            appointments: appointments,
            notifications: notifications,
            messages: messages,
            deletedItems: deletedItems
        };
        localStorage.setItem('bloodDonationData', JSON.stringify(data));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('bloodDonationData');
        if (data) {
            const parsed = JSON.parse(data);
            users = parsed.users || {};
            schedules = parsed.schedules || [];
            appointments = parsed.appointments || [];
            notifications = parsed.notifications || { admin: [], donor: [] };
            messages = parsed.messages || [];
            deletedItems = parsed.deletedItems || { schedules: [], appointments: [], donors: [] };
            return true;
        }
    } catch (e) {
        console.error('Error loading data:', e);
    }
    return false;
}

/* ---------- INITIALIZE DEFAULT DATA ---------- */
function ensureInitialData() {
    loadFromLocalStorage();
    
    if (!users['admin']) {
        users['admin'] = {
            username: 'admin',
            password: 'admin123',
            type: 'admin',
            fullname: 'Administrator',
            email: 'admin@rhukatipunan.gov.ph',
            contact: '',
            gender: 'Male'
        };
    }

    if (!notifications.admin) notifications.admin = [];
    if (!notifications.donor) notifications.donor = [];
    if (!messages) messages = [];
    if (!deletedItems.schedules) deletedItems.schedules = [];
    if (!deletedItems.appointments) deletedItems.appointments = [];
    if (!deletedItems.donors) deletedItems.donors = [];
    
    saveToLocalStorage();
}

/* ---------- AUTH FUNCTIONS ---------- */
function showSignupForm() {
    qs('signupModal').classList.add('active');
}

function closeSignupForm() {
    qs('signupModal').classList.remove('active');
    ['signupUsername', 'signupPassword', 'signupConfirmPassword', 'signupName', 'signupEmail', 'signupContact', 'signupGender'].forEach(id => {
        const el = qs(id);
        if (el) el.value = '';
    });
}

function createAccount() {
    const username = (qs('signupUsername').value || '').trim();
    const password = (qs('signupPassword').value || '').trim();
    const confirmPassword = (qs('signupConfirmPassword').value || '').trim();
    const fullname = (qs('signupName').value || '').trim();
    const email = (qs('signupEmail').value || '').trim();
    const contact = (qs('signupContact').value || '').trim();
    const gender = qs('signupGender').value;

    if (!username || !password || !confirmPassword || !fullname || !email || !contact || !gender) {
        alert('Please fill in all required fields');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    if (users[username]) {
        alert('Username already exists. Please choose another username.');
        return;
    }

    if (!/^09\d{9}$/.test(contact)) {
        alert('Please enter a valid Philippine mobile number (09XXXXXXXXX)');
        return;
    }

    const newUser = {
        username,
        password,
        type: 'donor',
        fullname,
        email,
        contact,
        gender,
        donationHistory: [],
        previousDonations: 0,
        registeredAt: new Date().toISOString()
    };

    users[username] = newUser;
    currentUser = { ...newUser };
    saveToLocalStorage();

    notifications.admin.push({
        message: `🎉 New donor registered: ${fullname} (${username})`,
        time: formatDateTime(new Date()),
        read: false
    });
    saveToLocalStorage();

    closeSignupForm();
    qs('loginPage').style.display = 'none';
    qs('donorUsername').textContent = currentUser.fullname;
    qs('donorDashboard').classList.add('active');

    loadDonorDashboard();
    updateProfileInfo();
    alert('Account created successfully! Welcome, ' + currentUser.fullname + '!');
    updateDonorNotifications();
}

function login() {
    const username = (qs('username').value || '').trim();
    const password = (qs('password').value || '').trim();
    const userType = qs('userType').value;

    if (!username || !password) {
        alert('Please enter username and password');
        return;
    }

    if (users[username] && users[username].password === password && users[username].type === userType) {
        currentUser = { ...users[username] };

        qs('loginPage').style.display = 'none';
        if (userType === 'admin') {
            qs('adminUsername').textContent = currentUser.username;
            qs('adminDashboard').classList.add('active');
            loadAdminDashboard();
            updateProfileInfo();
        } else {
            qs('donorUsername').textContent = currentUser.fullname;
            qs('donorDashboard').classList.add('active');
            loadDonorDashboard();
            updateProfileInfo();
        }
    } else {
        alert('Invalid username or password');
    }
}

function logout() {
    currentUser = null;
    isEligible = false;
    currentChatUser = null;

    qs('adminDashboard').classList.remove('active');
    qs('donorDashboard').classList.remove('active');

    const dropdowns = document.querySelectorAll('.profile-dropdown, .notification-dropdown');
    dropdowns.forEach(d => d.classList.remove('active'));

    qs('loginPage').style.display = 'flex';
    qs('username').value = '';
    qs('password').value = '';
    qs('userType').value = 'donor';
}

function showForgotPassword() {
    qs('forgotPasswordModal').classList.add('active');
}

function closeForgotPassword() {
    qs('forgotPasswordModal').classList.remove('active');
    qs('resetUsername').value = '';
    qs('resetEmail').value = '';
}

function resetPassword() {
    const username = (qs('resetUsername').value || '').trim();
    const email = (qs('resetEmail').value || '').trim();

    if (!username || !email) {
        alert('Please fill in all fields');
        return;
    }

    if (users[username] && users[username].email === email) {
        alert('Password reset instructions have been sent to your email (simulated).');
    } else {
        alert('No account found with that username and email.');
    }

    closeForgotPassword();
}

/* ---------- PROFILE FUNCTIONS ---------- */
function toggleProfile(userType) {
    if (event) event.stopPropagation();
    const dropdownId = userType === 'admin' ? 'adminProfileDropdown' : 'donorProfileDropdown';
    const dropdown = qs(dropdownId);
    
    const notifDropdown = qs(userType === 'admin' ? 'adminNotificationDropdown' : 'donorNotificationDropdown');
    if (notifDropdown) notifDropdown.classList.remove('active');
    
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function updateProfileInfo() {
    if (!currentUser) return;
    
    if (currentUser.type === 'admin') {
        const usernameEl = qs('adminProfileUsername');
        const emailEl = qs('adminProfileEmail');
        if (usernameEl) usernameEl.textContent = currentUser.username;
        if (emailEl) emailEl.textContent = currentUser.email || 'admin@rhukatipunan.gov.ph';
    } else {
        const nameEl = qs('donorProfileName');
        const usernameEl = qs('donorProfileUsername');
        const emailEl = qs('donorProfileEmail');
        const contactEl = qs('donorProfileContact');
        const donationsEl = qs('donorProfileDonations');
        
        if (nameEl) nameEl.textContent = currentUser.fullname;
        if (usernameEl) usernameEl.textContent = currentUser.username;
        if (emailEl) emailEl.textContent = currentUser.email;
        if (contactEl) contactEl.textContent = currentUser.contact;
        
        const completed = appointments.filter(a => a.donorUsername === currentUser.username && a.status === 'completed').length;
        const totalDonations = (currentUser.previousDonations || 0) + completed;
        if (donationsEl) donationsEl.textContent = totalDonations;
    }
}

/* ---------- ADMIN DASHBOARD ---------- */
function loadAdminDashboard() {
    loadSchedulesList();
    loadAppointmentsList();
    loadDonorsList();
    loadTrashBin();
    updateAdminNotifications();
    updateMessageNotifications();
}

function switchTab(tab) {
    const buttons = document.querySelectorAll('#adminDashboard .tab-btn');
    const contents = document.querySelectorAll('#adminDashboard .tab-content');

    buttons.forEach(btn => btn.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    const el = qs(tab + 'Tab');
    if (el) el.classList.add('active');
}

function createSchedule() {
    const date = qs('scheduleDate').value;
    const startTime = qs('scheduleStartTime').value;
    const endTime = qs('scheduleEndTime').value;
    const staff = (qs('scheduleStaff').value || '').trim();
    const slots = parseInt(qs('scheduleSlots').value);

    if (!date || !startTime || !endTime || !staff || isNaN(slots) || slots <= 0) {
        alert('Please fill in all fields correctly');
        return;
    }

    const selectedDate = new Date(date);
    const today = new Date(); 
    today.setHours(0,0,0,0);
    if (selectedDate < today) {
        alert('Cannot create schedule for past dates');
        return;
    }

    const newSchedule = {
        id: schedules.length ? Math.max(...schedules.map(s => s.id)) + 1 : 1,
        date,
        startTime,
        endTime,
        time: `${startTime} - ${endTime}`,
        staff,
        totalSlots: slots,
        bookedSlots: 0
    };

    schedules.push(newSchedule);
    saveToLocalStorage();

    qs('scheduleDate').value = '';
    qs('scheduleStartTime').value = '';
    qs('scheduleEndTime').value = '';
    qs('scheduleStaff').value = '';
    qs('scheduleSlots').value = '10';

    alert('Schedule created successfully!');
    loadSchedulesList();
    notifyAllDonors('📅 New donation schedule available for ' + formatDate(date) + ' at ' + startTime + ' - ' + endTime);
}

function loadSchedulesList() {
    const container = qs('schedulesList');
    if (!container) return;

    if (schedules.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">No schedules available. Create your first schedule above.</p>';
        return;
    }

    let html = '<div style="overflow-x: auto;"><table><thead><tr><th>Date</th><th>Time</th><th>Staff</th><th>Slots</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    schedules.forEach(schedule => {
        const available = schedule.totalSlots - schedule.bookedSlots;
        const status = available > 0 ? `<span class="badge badge-success">${available} Available</span>` : `<span class="badge badge-danger">Fully Booked</span>`;
        html += `
            <tr>
                <td>${formatDate(schedule.date)}</td>
                <td>${escapeHtml(schedule.time)}</td>
                <td><i class="fas fa-user-nurse"></i> ${escapeHtml(schedule.staff)}</td>
                <td>${schedule.bookedSlots}/${schedule.totalSlots}</td>
                <td>${status}</td>
                <td class="action-buttons">
                    <button onclick="editSchedule(${schedule.id})" class="btn-sm btn-warning"><i class="fas fa-edit"></i> Edit</button>
                    <button onclick="deleteSchedule(${schedule.id})" class="btn-sm btn-danger"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function editSchedule(id) {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;
    editingScheduleId = id;
    qs('editScheduleDate').value = schedule.date;
    qs('editScheduleStartTime').value = schedule.startTime || schedule.time.split(' - ')[0] || '';
    qs('editScheduleEndTime').value = schedule.endTime || schedule.time.split(' - ')[1] || '';
    qs('editScheduleStaff').value = schedule.staff;
    qs('editScheduleSlots').value = schedule.totalSlots;
    qs('editScheduleModal').classList.add('active');
}

function closeEditScheduleModal() {
    qs('editScheduleModal').classList.remove('active');
    editingScheduleId = null;
}

function updateSchedule() {
    if (!editingScheduleId) return;
    const schedule = schedules.find(s => s.id === editingScheduleId);
    if (!schedule) return;

    const newDate = qs('editScheduleDate').value;
    const newStartTime = qs('editScheduleStartTime').value;
    const newEndTime = qs('editScheduleEndTime').value;
    const newStaff = (qs('editScheduleStaff').value || '').trim();
    const newSlots = parseInt(qs('editScheduleSlots').value);

    if (!newDate || !newStartTime || !newEndTime || !newStaff || isNaN(newSlots) || newSlots < schedule.bookedSlots) {
        alert('Invalid schedule data or slots cannot be less than already booked appointments');
        return;
    }

    schedule.date = newDate;
    schedule.startTime = newStartTime;
    schedule.endTime = newEndTime;
    schedule.time = `${newStartTime} - ${newEndTime}`;
    schedule.staff = newStaff;
    schedule.totalSlots = newSlots;
    saveToLocalStorage();

    const affected = appointments.filter(a => a.scheduleId === editingScheduleId);
    affected.forEach(a => {
        notifyDonor(a.donorUsername, '📅 Your appointment schedule has been updated. New date: ' + formatDate(schedule.date) + ' at ' + schedule.time);
    });

    closeEditScheduleModal();
    loadSchedulesList();
    loadAppointmentsList();
    alert('Schedule updated successfully!');
}

function deleteSchedule(id) {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    if (schedule.bookedSlots > 0) {
        if (!confirm('This schedule has ' + schedule.bookedSlots + ' booked appointments. Deleting will cancel these appointments. Continue?')) {
            return;
        }
        const affected = appointments.filter(a => a.scheduleId === id);
        affected.forEach(a => {
            notifyDonor(a.donorUsername, '❌ Your appointment has been cancelled due to schedule deletion. Please book a new appointment.');
        });
    }

    if (!confirm('Are you sure you want to delete this schedule?')) return;

    deletedItems.schedules.push({...schedule, deletedAt: new Date().toISOString()});
    
    schedules = schedules.filter(s => s.id !== id);
    appointments = appointments.filter(a => a.scheduleId !== id);
    saveToLocalStorage();
    
    loadSchedulesList();
    loadAppointmentsList();
    loadTrashBin();
    alert('Schedule moved to trash bin!');
}

function loadAppointmentsList() {
    const pendingContainer = qs('pendingAppointmentsList');
    const allContainer = qs('allAppointmentsList');

    const scheduleGroups = {};
    
    appointments.forEach(apt => {
        if (!scheduleGroups[apt.scheduleId]) {
            scheduleGroups[apt.scheduleId] = [];
        }
        scheduleGroups[apt.scheduleId].push(apt);
    });

    if (pendingContainer) {
        const pendingSchedules = Object.keys(scheduleGroups).filter(schedId => {
            return scheduleGroups[schedId].some(apt => apt.status === 'pending');
        });

        if (pendingSchedules.length === 0) {
            pendingContainer.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">No pending appointments</p>';
        } else {
            let html = '';
            pendingSchedules.forEach(schedId => {
                const schedule = schedules.find(s => s.id === parseInt(schedId));
                if (!schedule) return;
                
                const scheduleApts = scheduleGroups[schedId].filter(apt => apt.status === 'pending');
                const pendingCount = scheduleApts.length;
                
                html += `
                    <div class="schedule-card" onclick="viewScheduleAppointments(${schedId}, 'pending')">
                        <div class="schedule-date"><i class="fas fa-calendar-day"></i> ${formatDate(schedule.date)}</div>
                        <div class="schedule-time"><i class="fas fa-clock"></i> ${escapeHtml(schedule.time)}</div>
                        <div class="schedule-staff"><i class="fas fa-user-nurse"></i> ${escapeHtml(schedule.staff)}</div>
                        <div class="schedule-slots">
                            <span>${pendingCount} Pending Appointment${pendingCount !== 1 ? 's' : ''}</span>
                            <span class="badge badge-warning">VIEW</span>
                        </div>
                    </div>
                `;
            });
            pendingContainer.innerHTML = html;
        }
    }

    if (allContainer) {
        if (Object.keys(scheduleGroups).length === 0) {
            allContainer.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">No appointments yet</p>';
        } else {
            let html = '';
            Object.keys(scheduleGroups).forEach(schedId => {
                const schedule = schedules.find(s => s.id === parseInt(schedId));
                if (!schedule) return;
                
                const scheduleApts = scheduleGroups[schedId];
                const aptCount = scheduleApts.length;
                
                html += `
                    <div class="schedule-card" onclick="viewScheduleAppointments(${schedId}, 'all')">
                        <div class="schedule-date"><i class="fas fa-calendar-day"></i> ${formatDate(schedule.date)}</div>
                        <div class="schedule-time"><i class="fas fa-clock"></i> ${escapeHtml(schedule.time)}</div>
                        <div class="schedule-staff"><i class="fas fa-user-nurse"></i> ${escapeHtml(schedule.staff)}</div>
                        <div class="schedule-slots">
                            <span>${aptCount} Appointment${aptCount !== 1 ? 's' : ''}</span>
                            <span class="badge badge-info">VIEW</span>
                        </div>
                    </div>
                `;
            });
            allContainer.innerHTML = html;
        }
    }
}

function viewScheduleAppointments(scheduleId, filter) {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    const scheduleApts = appointments.filter(apt => apt.scheduleId === scheduleId);
    const filteredApts = filter === 'pending' ? scheduleApts.filter(apt => apt.status === 'pending') : scheduleApts;
    
    const modal = qs('viewScheduleModal');
    const title = qs('viewScheduleTitle');
    const content = qs('viewScheduleContent');
    
    if (title) {
        title.innerHTML = `<i class="fas fa-list"></i> Appointments for ${formatDate(schedule.date)} at ${escapeHtml(schedule.time)}`;
    }
    
    if (content) {
        if (filteredApts.length === 0) {
            content.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">No appointments for this schedule</p>';
        } else {
            let html = '<div style="overflow-x: auto;"><table><thead><tr><th>Name</th><th>Blood Type</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
            filteredApts.forEach(apt => {
                const statusBadge = apt.status === 'approved' ? 'badge-success' : apt.status === 'rejected' ? 'badge-danger' : apt.status === 'completed' ? 'badge-info' : 'badge-warning';
                html += `
                    <tr>
                        <td>${escapeHtml(apt.name)}</td>
                        <td><span class="badge badge-danger">${escapeHtml(apt.bloodType)}</span></td>
                        <td>${escapeHtml(apt.contact)}</td>
                        <td><span class="badge ${statusBadge}">${apt.status.toUpperCase()}</span></td>
                        <td class="action-buttons">
                            ${apt.status === 'pending' ? `<button onclick="approveAppointment(${apt.id}); viewScheduleAppointments(${scheduleId}, '${filter}')" class="btn-sm btn-success"><i class="fas fa-check"></i> Approve</button>` : ''}
                            ${apt.status === 'pending' ? `<button onclick="rejectAppointment(${apt.id}); viewScheduleAppointments(${scheduleId}, '${filter}')" class="btn-sm btn-danger"><i class="fas fa-times"></i> Reject</button>` : ''}
                            ${apt.status === 'approved' ? `<button onclick="completeAppointment(${apt.id}); viewScheduleAppointments(${scheduleId}, '${filter}')" class="btn-sm btn-info"><i class="fas fa-check-circle"></i> Complete</button>` : ''}
                            <button onclick="viewAppointmentDetails(${apt.id})" class="btn-sm btn-info"><i class="fas fa-eye"></i> View</button>
                            <button onclick="deleteAppointment(${apt.id}); closeViewScheduleModal(); loadAppointmentsList()" class="btn-sm btn-danger"><i class="fas fa-trash"></i> Delete</button>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table></div>';
            content.innerHTML = html;
        }
    }
    
    if (modal) modal.classList.add('active');
}

function closeViewScheduleModal() {
    const modal = qs('viewScheduleModal');
    if (modal) modal.classList.remove('active');
}

function approveAppointment(id) {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    
    if (apt.status === 'approved') {
        alert('This appointment is already approved');
        return;
    }
    
    const schedule = schedules.find(s => s.id === apt.scheduleId);
    if (!schedule) {
        alert('Schedule not found');
        return;
    }
    
    if (schedule.bookedSlots >= schedule.totalSlots) {
        alert('Cannot approve — schedule is fully booked');
        return;
    }
    
    apt.status = 'approved';
    schedule.bookedSlots++;
    saveToLocalStorage();
    
    loadAppointmentsList();
    loadSchedulesList();
    alert('Appointment approved!');
    notifyDonor(apt.donorUsername, '✅ Your appointment has been approved for ' + formatDate(schedule.date) + ' at ' + schedule.time);
    updateAdminNotifications();
}

function completeAppointment(id) {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    
    if (!confirm('Mark this appointment as completed (donor successfully donated blood)?')) return;
    
    apt.status = 'completed';
    apt.completedDate = new Date().toISOString();
    
    if (users[apt.donorUsername]) {
        if (!users[apt.donorUsername].donationHistory) {
            users[apt.donorUsername].donationHistory = [];
        }
        users[apt.donorUsername].donationHistory.push({
            date: apt.completedDate,
            scheduleId: apt.scheduleId,
            bags: apt.numBags,
            bloodType: apt.bloodType
        });
    }
    
    saveToLocalStorage();
    loadAppointmentsList();
    loadDonorsList();
    updateProfileInfo();
    
    alert('Donation completed successfully!');
    notifyDonor(apt.donorUsername, '🎉 Thank you for your blood donation! You successfully donated and saved lives. We look forward to seeing you again!');
}

function rejectAppointment(id) {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    
    const reason = prompt('Please enter reason for rejection (will be sent to donor):');
    if (reason === null) return;
    
    const schedule = schedules.find(s => s.id === apt.scheduleId);
    
    if (apt.status === 'approved' && schedule && schedule.bookedSlots > 0) {
        schedule.bookedSlots--;
    }
    
    apt.status = 'rejected';
    saveToLocalStorage();
    
    loadAppointmentsList();
    loadSchedulesList();
    alert('Appointment rejected!');
    notifyDonor(apt.donorUsername, '❌ Your appointment has been rejected. Reason: ' + (reason || 'Not specified'));
    updateAdminNotifications();
}

function deleteAppointment(id) {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    
    const schedule = schedules.find(s => s.id === apt.scheduleId);
    if (schedule && apt.status === 'approved' && schedule.bookedSlots > 0) {
        schedule.bookedSlots--;
    }
    
    deletedItems.appointments.push({...apt, deletedAt: new Date().toISOString()});
    
    appointments = appointments.filter(a => a.id !== id);
    saveToLocalStorage();
    
    loadAppointmentsList();
    loadSchedulesList();
    loadTrashBin();
    alert('Appointment moved to trash bin!');
}

function viewAppointmentDetails(id) {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    
    const schedule = schedules.find(s => s.id === apt.scheduleId);
    const details = `
APPOINTMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERSONAL INFORMATION:
Name: ${apt.name}
Age: ${apt.age} years old
Gender: ${apt.gender}
Civil Status: ${apt.status || 'N/A'}
Blood Type: ${apt.bloodType}

CONTACT INFORMATION:
Phone: ${apt.contact}
Email: ${apt.email}
Address: ${apt.address}

DONATION DETAILS:
Number of Bags: ${apt.numBags}
Medical History: ${apt.medicalHistory || 'None'}
${apt.previousDonations ? 'Previous Donations: ' + apt.previousDonations : 'First Time Donor'}
${apt.lastDonationDate ? 'Last Donation: ' + formatDate(apt.lastDonationDate.split('T')[0]) : ''}

EMERGENCY CONTACT:
Name: ${apt.emergencyName}
Phone: ${apt.emergencyContact}

APPOINTMENT INFO:
Date: ${schedule ? formatDate(schedule.date) : 'N/A'}
Time: ${schedule ? schedule.time : 'N/A'}
Staff: ${schedule ? schedule.staff : 'N/A'}
Status: ${apt.status.toUpperCase()}

Booked on: ${formatDate(apt.createdAt.split('T')[0])}
${apt.completedDate ? 'Completed on: ' + formatDate(apt.completedDate.split('T')[0]) : ''}
    `;
    alert(details);
}

/* ---------- DONORS MANAGEMENT ---------- */
function loadDonorsList() {
    const container = qs('donorsList');
    if (!container) return;
    
    const registeredDonors = Object.values(users).filter(u => u.type === 'donor');
    
    const regCountEl = qs('registeredDonorsCount');
    if (regCountEl) regCountEl.textContent = registeredDonors.length;
    
    const activeDonors = registeredDonors.filter(donor => {
        const donorAppts = appointments.filter(a => a.donorUsername === donor.username);
        const completed = donorAppts.filter(a => a.status === 'completed').length;
        return completed > 0 || (donor.previousDonations && donor.previousDonations > 0);
    });
    const activeCountEl = qs('completedDonorsCount');
    if (activeCountEl) activeCountEl.textContent = activeDonors.length;
    
    if (registeredDonors.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">No registered donors yet</p>';
        return;
    }

    registeredDonors.sort((a, b) => {
        const dateA = new Date(a.registeredAt || '2025-01-01');
        const dateB = new Date(b.registeredAt || '2025-01-01');
        return dateB - dateA;
    });

    let html = '<div style="overflow-x: auto;"><table><thead><tr><th>Name</th><th>Status</th><th>Total Donations</th><th>Actions</th></tr></thead><tbody>';
    
    registeredDonors.forEach(donor => {
        const donorAppts = appointments.filter(a => a.donorUsername === donor.username);
        const completed = donorAppts.filter(a => a.status === 'completed').length;
        const totalDonations = (donor.previousDonations || 0) + completed;
        
        // Determine donor status
        let statusBadge = '';
        let statusText = '';
        if (totalDonations === 0) {
            statusBadge = 'badge-warning';
            statusText = 'New Donor';
        } else if (totalDonations >= 10) {
            statusBadge = 'badge-success';
            statusText = 'Elite Donor';
        } else if (totalDonations >= 5) {
            statusBadge = 'badge-info';
            statusText = 'Active Donor';
        } else {
            statusBadge = 'badge-info';
            statusText = 'Regular Donor';
        }
        
        html += `
            <tr>
                <td><strong>${escapeHtml(donor.fullname)}</strong></td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td><span class="badge badge-danger" style="font-size: 16px; padding: 8px 12px;">${totalDonations}</span></td>
                <td class="action-buttons">
                    <button onclick="viewDonorCredentials('${donor.username}')" class="btn-sm btn-info"><i class="fas fa-key"></i> Credentials</button>
                    <button onclick="deleteDonorAccount('${donor.username}')" class="btn-sm btn-danger"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function viewDonorCredentials(username) {
    const donor = users[username];
    if (!donor) return;
    
    const content = qs('credentialsContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="credentials-display">
            <h4 style="margin-bottom: 15px; color: #2c3e50;"><i class="fas fa-user-circle"></i> ${escapeHtml(donor.fullname)}</h4>
            <p><strong>Username:</strong> ${escapeHtml(donor.username)}</p>
            <p><strong>Password:</strong> <span class="password-value">${escapeHtml(donor.password)}</span></p>
            <p><strong>Gender:</strong> ${escapeHtml(donor.gender || 'N/A')}</p>
            <p><strong>Email:</strong> ${escapeHtml(donor.email)}</p>
            <p><strong>Contact:</strong> ${escapeHtml(donor.contact)}</p>
            <p><strong>Registered:</strong> ${formatDate(donor.registeredAt.split('T')[0])}</p>
        </div>
        <div class="alert alert-info">
            <i class="fas fa-info-circle"></i> This information is confidential. Use responsibly.
        </div>
    `;
    
    qs('viewCredentialsModal').classList.add('active');
}

function closeCredentialsModal() {
    qs('viewCredentialsModal').classList.remove('active');
}

function deleteDonorAccount(username) {
    if (!confirm('Are you sure you want to delete this donor account? This action will move the account to trash.')) return;
    
    const donor = users[username];
    if (!donor) return;
    
    deletedItems.donors.push({...donor, deletedAt: new Date().toISOString()});
    
    delete users[username];
    
    appointments = appointments.filter(a => a.donorUsername !== username);
    
    saveToLocalStorage();
    loadDonorsList();
    loadTrashBin();
    alert('Donor account moved to trash bin!');
}

/* ---------- TRASH BIN ---------- */
function loadTrashBin() {
    loadDeletedSchedules();
    loadDeletedAppointments();
    loadDeletedDonors();
}

function loadDeletedSchedules() {
    const container = qs('deletedSchedulesList');
    if (!container) return;
    
    if (deletedItems.schedules.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-trash"></i><p>No deleted schedules</p></div>';
        return;
    }
    
    let html = '';
    deletedItems.schedules.forEach((schedule, index) => {
        html += `
            <div class="trash-item">
                <div class="trash-item-info">
                    <strong>${formatDate(schedule.date)} at ${escapeHtml(schedule.time)}</strong>
                    <span>Staff: ${escapeHtml(schedule.staff)} | Deleted: ${formatDateTime(schedule.deletedAt)}</span>
                </div>
                <div class="trash-item-actions">
                    <button onclick="restoreSchedule(${index})" class="btn-sm btn-success"><i class="fas fa-undo"></i> Restore</button>
                    <button onclick="permanentDeleteSchedule(${index})" class="btn-sm btn-danger"><i class="fas fa-trash-alt"></i> Delete Forever</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function loadDeletedAppointments() {
    const container = qs('deletedAppointmentsList');
    if (!container) return;
    
    if (deletedItems.appointments.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-trash"></i><p>No deleted appointments</p></div>';
        return;
    }
    
    let html = '';
    deletedItems.appointments.forEach((apt, index) => {
        html += `
            <div class="trash-item">
                <div class="trash-item-info">
                    <strong>${escapeHtml(apt.name)} - ${escapeHtml(apt.bloodType)}</strong>
                    <span>Status: ${apt.status.toUpperCase()} | Deleted: ${formatDateTime(apt.deletedAt)}</span>
                </div>
                <div class="trash-item-actions">
                    <button onclick="restoreAppointment(${index})" class="btn-sm btn-success"><i class="fas fa-undo"></i> Restore</button>
                    <button onclick="permanentDeleteAppointment(${index})" class="btn-sm btn-danger"><i class="fas fa-trash-alt"></i> Delete Forever</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function loadDeletedDonors() {
    const container = qs('deletedDonorsList');
    if (!container) return;
    
    if (deletedItems.donors.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-trash"></i><p>No deleted donor accounts</p></div>';
        return;
    }
    
    let html = '';
    deletedItems.donors.forEach((donor, index) => {
        html += `
            <div class="trash-item">
                <div class="trash-item-info">
                    <strong>${escapeHtml(donor.fullname)} (${escapeHtml(donor.username)})</strong>
                    <span>Email: ${escapeHtml(donor.email)} | Deleted: ${formatDateTime(donor.deletedAt)}</span>
                </div>
                <div class="trash-item-actions">
                    <button onclick="restoreDonor(${index})" class="btn-sm btn-success"><i class="fas fa-undo"></i> Restore</button>
                    <button onclick="permanentDeleteDonor(${index})" class="btn-sm btn-danger"><i class="fas fa-trash-alt"></i> Delete Forever</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function restoreSchedule(index) {
    if (index < 0 || index >= deletedItems.schedules.length) return;
    
    const schedule = deletedItems.schedules[index];
    delete schedule.deletedAt;
    schedules.push(schedule);
    deletedItems.schedules.splice(index, 1);
    saveToLocalStorage();
    
    loadSchedulesList();
    loadTrashBin();
    alert('Schedule restored successfully!');
}

function restoreAppointment(index) {
    if (index < 0 || index >= deletedItems.appointments.length) return;
    
    const apt = deletedItems.appointments[index];
    
    const schedule = schedules.find(s => s.id === apt.scheduleId);
    if (!schedule) {
        alert('Cannot restore: The schedule for this appointment no longer exists.');
        return;
    }
    
    if (apt.status === 'approved' && schedule.bookedSlots >= schedule.totalSlots) {
        alert('Cannot restore: The schedule is now fully booked.');
        return;
    }
    
    delete apt.deletedAt;
    appointments.push(apt);
    if (apt.status === 'approved') {
        schedule.bookedSlots++;
    }
    deletedItems.appointments.splice(index, 1);
    saveToLocalStorage();
    
    loadAppointmentsList();
    loadSchedulesList();
    loadTrashBin();
    alert('Appointment restored successfully!');
}

function restoreDonor(index) {
    if (index < 0 || index >= deletedItems.donors.length) return;
    
    const donor = deletedItems.donors[index];
    
    if (users[donor.username]) {
        alert('Cannot restore: A user with this username already exists.');
        return;
    }
    
    delete donor.deletedAt;
    users[donor.username] = donor;
    deletedItems.donors.splice(index, 1);
    saveToLocalStorage();
    
    loadDonorsList();
    loadTrashBin();
    alert('Donor account restored successfully!');
}

function permanentDeleteSchedule(index) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this schedule? This action cannot be undone!')) return;
    
    deletedItems.schedules.splice(index, 1);
    saveToLocalStorage();
    loadTrashBin();
    alert('Schedule permanently deleted!');
}

function permanentDeleteAppointment(index) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this appointment? This action cannot be undone!')) return;
    
    deletedItems.appointments.splice(index, 1);
    saveToLocalStorage();
    loadTrashBin();
    alert('Appointment permanently deleted!');
}

function permanentDeleteDonor(index) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this donor account? This action cannot be undone!')) return;
    
    deletedItems.donors.splice(index, 1);
    saveToLocalStorage();
    loadTrashBin();
    alert('Donor account permanently deleted!');
}

/* ---------- DONOR DASHBOARD ---------- */
function loadDonorDashboard() {
    loadDonorSchedules();
    loadDonorAppointments();
    updateDonorNotifications();
    updateMessageNotifications();
}

function switchDonorTab(tab) {
    const buttons = document.querySelectorAll('#donorDashboard .tab-btn');
    const contents = document.querySelectorAll('#donorDashboard .tab-content');

    buttons.forEach(btn => btn.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    const el = qs(tab + 'Tab');
    if (el) el.classList.add('active');
}

function loadDonorSchedules() {
    const container = qs('donorSchedulesList');
    if (!container) return;

    const today = new Date(); 
    today.setHours(0,0,0,0);
    const futureSchedules = schedules.filter(s => new Date(s.date) >= today);

    if (futureSchedules.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:40px;">No upcoming schedules available. Please check back later.</p>';
        return;
    }

    let html = '';
    futureSchedules.forEach(schedule => {
        const available = schedule.totalSlots - schedule.bookedSlots;
        const isFull = available === 0;
        html += `
            <div class="schedule-card ${isFull ? 'full' : ''}" ${!isFull ? `onclick="openEligibilityCheck(${schedule.id})"` : ''} style="cursor: ${!isFull ? 'pointer' : 'not-allowed'}">
                <div class="schedule-date"><i class="fas fa-calendar-day"></i> ${formatDate(schedule.date)}</div>
                <div class="schedule-time"><i class="fas fa-clock"></i> ${escapeHtml(schedule.time)}</div>
                <div class="schedule-staff"><i class="fas fa-user-nurse"></i> ${escapeHtml(schedule.staff)}</div>
                <div class="schedule-slots">
                    <span>${isFull ? 'Fully Booked' : available + ' Slot' + (available !== 1 ? 's' : '') + ' Available'}</span>
                    ${isFull ? '<span class="badge badge-danger">FULL</span>' : '<span class="badge badge-success">AVAILABLE</span>'}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* ---------- ELIGIBILITY CHECK ---------- */
function openEligibilityCheck(scheduleId) {
    selectedScheduleId = scheduleId;
    isEligible = false;
    
    const femaleSection = qs('femaleOnlySection');
    if (femaleSection && currentUser) {
        femaleSection.style.display = currentUser.gender === 'Female' ? 'block' : 'none';
    }
    
    const checkboxes = ['age18', 'weight50', 'healthyCheck', 'noInfection', 'noChronicIllness', 
                        'normalBP', 'noAnemia', 'noSeizures', 'noRecentTattoo', 
                        'noRecentSurgery', 'noRecentVaccine', 'noRecentTravel', 'noAntibiotics', 
                        'noAlcohol', 'hadMeal', 'noSmoking', 'noDrugs', 'notPregnant', 
                        'notMenstruating', 'noRecentPregnancy'];
    checkboxes.forEach(id => {
        const el = qs(id);
        if (el) el.checked = false;
    });
    
    const resultDiv = qs('eligibilityResult');
    if (resultDiv) resultDiv.innerHTML = '';
    
    const modal = qs('eligibilityModal');
    if (modal) modal.classList.add('active');
}

function closeEligibilityModal() {
    const modal = qs('eligibilityModal');
    if (modal) modal.classList.remove('active');
    isEligible = false;
    selectedScheduleId = null;
}

function checkEligibility() {
    const checks = {
        age18: qs('age18').checked,
        weight50: qs('weight50').checked,
        healthyCheck: qs('healthyCheck').checked,
        noInfection: qs('noInfection').checked,
        noChronicIllness: qs('noChronicIllness').checked,
        normalBP: qs('normalBP').checked,
        noAnemia: qs('noAnemia').checked,
        noSeizures: qs('noSeizures').checked,
        noRecentTattoo: qs('noRecentTattoo').checked,
        noRecentSurgery: qs('noRecentSurgery').checked,
        noRecentVaccine: qs('noRecentVaccine').checked,
        noRecentTravel: qs('noRecentTravel').checked,
        noAntibiotics: qs('noAntibiotics').checked,
        noAlcohol: qs('noAlcohol').checked,
        hadMeal: qs('hadMeal').checked,
        noSmoking: qs('noSmoking').checked,
        noDrugs: qs('noDrugs').checked
    };

    if (currentUser && currentUser.gender === 'Female') {
        checks.notPregnant = qs('notPregnant').checked;
        checks.notMenstruating = qs('notMenstruating').checked;
        checks.noRecentPregnancy = qs('noRecentPregnancy').checked;
    }

    const resultDiv = qs('eligibilityResult');
    const allChecked = Object.values(checks).every(val => val === true);

    if (allChecked) {
        isEligible = true;
        resultDiv.innerHTML = `
            <div class="eligibility-result eligible">
                <i class="fas fa-check-circle"></i>
                <div>Congratulations! You are ELIGIBLE to donate blood!</div>
                <p style="margin-top: 15px; font-size: 14px;">You can now proceed to book your appointment.</p>
                <button onclick="proceedToBooking()" class="btn btn-primary" style="margin-top: 15px; max-width: 250px;">
                    <i class="fas fa-calendar-plus"></i> Proceed to Booking
                </button>
            </div>
        `;
    } else {
        isEligible = false;
        let reasons = [];
        if (!checks.age18) reasons.push('Must be between 18-65 years old');
        if (!checks.weight50) reasons.push('Must weigh at least 50 kg');
        if (!checks.healthyCheck) reasons.push('Must be in good health');
        if (!checks.noInfection) reasons.push('Must be free from infections');
        if (!checks.noChronicIllness) reasons.push('Must not have chronic illnesses');
        if (!checks.normalBP) reasons.push('Must have normal blood pressure');
        if (!checks.noAnemia) reasons.push('Must not be anemic');
        if (!checks.noSeizures) reasons.push('Must not have seizure disorders');
        if (!checks.noRecentTattoo) reasons.push('No tattoo/piercing in last 6 months');
        if (!checks.noRecentSurgery) reasons.push('No surgery in last 6 months');
        if (!checks.noRecentVaccine) reasons.push('No recent vaccines (last 4 weeks)');
        if (!checks.noRecentTravel) reasons.push('No travel to malaria areas in last 3 months');
        if (!checks.noAntibiotics) reasons.push('Must not be on antibiotics');
        if (!checks.noAlcohol) reasons.push('No alcohol in last 24 hours');
        if (!checks.hadMeal) reasons.push('Must have eaten within 4 hours');
        if (!checks.noSmoking) reasons.push('No smoking in last 2 hours');
        if (!checks.noDrugs) reasons.push('Must not use illegal drugs');
        
        if (currentUser && currentUser.gender === 'Female') {
            if (!checks.notPregnant) reasons.push('Must not be pregnant or breastfeeding');
            if (!checks.notMenstruating) reasons.push('Should not donate during menstruation');
            if (!checks.noRecentPregnancy) reasons.push('Must wait 6 months after childbirth');
        }

        resultDiv.innerHTML = `
            <div class="eligibility-result not-eligible">
                <i class="fas fa-times-circle"></i>
                <div>Sorry, you are NOT ELIGIBLE to donate at this time.</div>
                <div style="margin-top: 15px; text-align: left; font-size: 14px;">
                    <strong>Reasons:</strong><br>
                    • ${reasons.join('<br>• ')}
                </div>
                <p style="margin-top: 15px; font-size: 13px;">Please consult with our medical staff for more information or try again when eligible.</p>
            </div>
        `;
    }
}

function toggleDonationFields() {
    const hasDonated = qs('hasDonatedBefore').value;
    const container = qs('previousDonationFields');
    if (container) container.style.display = hasDonated === 'yes' ? 'block' : 'none';
    
    const warning = qs('donationWarning');
    if (warning) warning.style.display = 'none';
}

function checkLastDonationDate() {
    const lastDonationDate = qs('lastDonationDate').value;
    const warning = qs('donationWarning');
    const submitBtn = qs('submitBookingBtn');
    
    if (!lastDonationDate || !warning || !submitBtn) return;
    
    const schedule = schedules.find(s => s.id === selectedScheduleId);
    if (!schedule) return;
    
    const lastDate = new Date(lastDonationDate);
    const scheduleDate = new Date(schedule.date);
    const monthsDiff = (scheduleDate - lastDate) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsDiff < 3) {
        warning.innerHTML = '<i class="fas fa-exclamation-triangle"></i> You must wait at least 3 months between donations. You are not eligible for this schedule.';
        warning.className = 'error';
        warning.style.display = 'block';
        warning.style.background = '#f8d7da';
        warning.style.color = '#721c24';
        warning.style.border = '1px solid #f5c6cb';
        submitBtn.disabled = true;
    } else {
        warning.innerHTML = '<i class="fas fa-check-circle"></i> You meet the 3-month waiting period requirement.';
        warning.className = 'success';
        warning.style.display = 'block';
        warning.style.background = '#d4edda';
        warning.style.color = '#155724';
        warning.style.border = '1px solid #c3e6cb';
        submitBtn.disabled = false;
    }
}

function proceedToBooking() {
    if (!isEligible) {
        alert('Please complete the eligibility check first');
        return;
    }
    
    if (!selectedScheduleId) {
        alert('No schedule selected');
        return;
    }
    
    const eligModal = qs('eligibilityModal');
    if (eligModal) eligModal.classList.remove('active');
    
    if (currentUser) {
        const nameField = qs('donorName');
        const emailField = qs('donorEmail');
        const contactField = qs('donorContact');
        const genderField = qs('donorGender');
        
        if (nameField) nameField.value = currentUser.fullname;
        if (emailField) emailField.value = currentUser.email;
        if (contactField) contactField.value = currentUser.contact;
        if (genderField) genderField.value = currentUser.gender || '';
    }
    
    const completedDonations = appointments.filter(a => 
        a.donorUsername === currentUser.username && a.status === 'completed'
    );
    
    qs('hasDonatedBefore').value = completedDonations.length > 0 || currentUser.previousDonations > 0 ? 'yes' : 'no';
    toggleDonationFields();
    
    if (completedDonations.length > 0) {
        const lastDonation = completedDonations[completedDonations.length - 1];
        const lastDonationDateField = qs('lastDonationDate');
        const previousDonationsField = qs('previousDonations');
        
        if (lastDonationDateField && lastDonation.completedDate) {
            lastDonationDateField.value = lastDonation.completedDate.split('T')[0];
            checkLastDonationDate();
        }
        
        if (previousDonationsField) {
            previousDonationsField.value = completedDonations.length;
        }
    }
    
    const bookModal = qs('bookingModal');
    if (bookModal) bookModal.classList.add('active');
}

function closeBookingModal() {
    const modal = qs('bookingModal');
    if (modal) modal.classList.remove('active');
    isEligible = false;
    selectedScheduleId = null;
    
    const submitBtn = qs('submitBookingBtn');
    if (submitBtn) submitBtn.disabled = false;
}

function submitBooking() {
    if (!selectedScheduleId) {
        alert('No schedule selected');
        return;
    }

    if (!currentUser || currentUser.type !== 'donor') {
        alert('Please login as donor to book an appointment.');
        return;
    }

    const name = (qs('donorName').value || '').trim();
    const ageVal = qs('donorAge').value;
    const age = ageVal ? parseInt(ageVal) : null;
    const gender = qs('donorGender').value;
    const status = qs('donorStatus').value;
    const address = (qs('donorAddress').value || '').trim();
    const contact = (qs('donorContact').value || '').trim();
    const email = (qs('donorEmail').value || '').trim();
    const medicalHistory = (qs('medicalHistory').value || '').trim();
    const hasDonatedBefore = qs('hasDonatedBefore').value;
    
    let previousDonations = 0;
    let lastDonationDate = null;
    
    if (hasDonatedBefore === 'yes') {
        previousDonations = parseInt(qs('previousDonations').value || '0');
        lastDonationDate = qs('lastDonationDate').value;
    }
    
    const bloodType = qs('donorBloodType').value;
    const numBags = parseInt(qs('numBags').value || '1');
    const emergencyName = (qs('emergencyName').value || '').trim();
    const emergencyContact = (qs('emergencyContact').value || '').trim();

    if (!name || !age || !gender || !status || !address || !contact || !email || !bloodType || !emergencyName || !emergencyContact || !hasDonatedBefore) {
        alert('Please fill in all required fields (marked with *)');
        return;
    }
    
    if (hasDonatedBefore === 'yes' && (!previousDonations || !lastDonationDate)) {
        alert('Please provide your previous donation information');
        return;
    }
    
    if (age < 18 || age > 65) { 
        alert('Age must be between 18 and 65 years'); 
        return; 
    }
    
    if (!/^09\d{9}$/.test(contact)) { 
        alert('Please enter a valid Philippine mobile number (09XXXXXXXXX)'); 
        return; 
    }

    const schedule = schedules.find(s => s.id === selectedScheduleId);
    if (!schedule) { 
        alert('Selected schedule not found'); 
        return; 
    }
    
    if (schedule.bookedSlots >= schedule.totalSlots) { 
        alert('Sorry, this schedule is now fully booked'); 
        closeBookingModal(); 
        loadDonorSchedules(); 
        return; 
    }

    if (lastDonationDate) {
        const lastDate = new Date(lastDonationDate);
        const scheduleDate = new Date(schedule.date);
        const monthsDiff = (scheduleDate - lastDate) / (1000 * 60 * 60 * 24 * 30);
        
        if (monthsDiff < 3) {
            alert(`You must wait at least 3 months between donations. Your last donation was on ${formatDate(lastDonationDate)}`);
            return;
        }
    }

    const newAppointment = {
        id: appointments.length ? Math.max(...appointments.map(a => a.id)) + 1 : 1,
        scheduleId: selectedScheduleId,
        donorUsername: currentUser.username,
        name,
        age,
        gender,
        status,
        address,
        bloodType,
        contact,
        email,
        numBags,
        medicalHistory,
        emergencyName,
        emergencyContact,
        previousDonations: previousDonations,
        lastDonationDate: lastDonationDate,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    saveToLocalStorage();

    const fields = ['donorName','donorAge','donorGender','donorStatus','donorAddress','donorBloodType','donorContact','donorEmail','numBags','medicalHistory','emergencyName','emergencyContact','previousDonations','lastDonationDate','hasDonatedBefore'];
    fields.forEach(f => { 
        const field = qs(f);
        if (field) field.value = ''; 
    });
    toggleDonationFields();

    closeBookingModal();
    alert('Appointment submitted successfully! Please wait for admin approval.');
    loadDonorSchedules();
    loadDonorAppointments();
    updateAdminNotifications();
    notifyDonor(currentUser.username, '📝 Your appointment request has been submitted and is pending approval.');
}

function loadDonorAppointments() {
    const container = qs('donorAppointmentsList');
    if (!container) return;
    
    if (!currentUser) {
        container.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">Please log in to see your appointments.</p>';
        return;
    }

    const myAppointments = appointments.filter(a => a.donorUsername === currentUser.username);
    
    if (myAppointments.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">You have no appointments yet. Book your first appointment now!</p>';
        return;
    }

    let html = '<div style="overflow-x: auto;"><table><thead><tr><th>Date</th><th>Time</th><th>Staff</th><th>Blood Type</th><th>Bags</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    myAppointments.forEach(apt => {
        const schedule = schedules.find(s => s.id === apt.scheduleId);
        const statusBadge = apt.status === 'approved' ? 'badge-success' : apt.status === 'rejected' ? 'badge-danger' : apt.status === 'completed' ? 'badge-info' : 'badge-warning';
        html += `
            <tr>
                <td>${schedule ? formatDate(schedule.date) : 'Schedule Deleted'}</td>
                <td>${schedule ? escapeHtml(schedule.time) : 'N/A'}</td>
                <td>${schedule ? escapeHtml(schedule.staff) : 'N/A'}</td>
                <td><span class="badge badge-danger">${escapeHtml(apt.bloodType)}</span></td>
                <td>${apt.numBags}</td>
                <td><span class="badge ${statusBadge}">${apt.status.toUpperCase()}</span></td>
                <td class="action-buttons">
                    ${apt.status === 'approved' ? `<button onclick="openReschedule(${apt.id})" class="btn-sm btn-warning"><i class="fas fa-calendar-alt"></i> Reschedule</button>` : ''}
                    ${apt.status === 'pending' ? `<button onclick="cancelAppointment(${apt.id})" class="btn-sm btn-danger"><i class="fas fa-times"></i> Cancel</button>` : ''}
                </td>
            </tr>
        `;
    });
    html += '</tbody></table></div>';
    
    const completed = myAppointments.filter(a => a.status === 'completed').length;
    const totalDonations = (currentUser.previousDonations || 0) + completed;
    if (totalDonations > 0) {
        html = `<div class="alert alert-info" style="margin-bottom: 20px;">
            <strong><i class="fas fa-award"></i> Your Donation History:</strong> You have successfully completed ${totalDonations} donation${totalDonations !== 1 ? 's' : ''}! Thank you for being a lifesaver!
        </div>` + html;
    }
    
    container.innerHTML = html;
}

function cancelAppointment(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    
    const schedule = schedules.find(s => s.id === apt.scheduleId);
    if (schedule && schedule.bookedSlots > 0) schedule.bookedSlots--;
    
    appointments = appointments.filter(a => a.id !== id);
    saveToLocalStorage();
    
    loadDonorAppointments();
    loadDonorSchedules();
    alert('Appointment cancelled successfully!');
    notifyDonor(currentUser.username, '❌ You have cancelled your appointment.');
    updateAdminNotifications();
}

function openReschedule(aptId) {
    currentAptId = aptId;
    const modal = qs('rescheduleModal');
    if (modal) modal.classList.add('active');
    loadRescheduleSchedules();
}

function closeRescheduleModal() {
    const modal = qs('rescheduleModal');
    if (modal) modal.classList.remove('active');
    currentAptId = null;
}

function loadRescheduleSchedules() {
    const container = qs('rescheduleSchedulesList');
    if (!container) return;

    const today = new Date();
    today.setHours(0,0,0,0);
    const currentApt = appointments.find(a => a.id === currentAptId);
    const futureSchedules = schedules.filter(s => new Date(s.date) >= today && (!currentApt || s.id !== currentApt.scheduleId));

    if (futureSchedules.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:40px;">No available schedules for rescheduling.</p>';
        return;
    }

    let html = '';
    futureSchedules.forEach(schedule => {
        const available = schedule.totalSlots - schedule.bookedSlots;
        const isFull = available === 0;
        html += `
            <div class="schedule-card ${isFull ? 'full' : ''}" ${!isFull ? `onclick="rescheduleTo(${schedule.id})"` : ''} style="cursor: ${!isFull ? 'pointer' : 'not-allowed'}">
                <div class="schedule-date"><i class="fas fa-calendar-day"></i> ${formatDate(schedule.date)}</div>
                <div class="schedule-time"><i class="fas fa-clock"></i> ${escapeHtml(schedule.time)}</div>
                <div class="schedule-staff"><i class="fas fa-user-nurse"></i> ${escapeHtml(schedule.staff)}</div>
                <div class="schedule-slots">
                    <span>${isFull ? 'Fully Booked' : available + ' Slot' + (available !== 1 ? 's' : '') + ' Available'}</span>
                    ${isFull ? '<span class="badge badge-danger">FULL</span>' : '<span class="badge badge-success">AVAILABLE</span>'}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function rescheduleTo(newId) {
    const apt = appointments.find(a => a.id === currentAptId);
    if (!apt) return;

    const oldSchedule = schedules.find(s => s.id === apt.scheduleId);
    const newSchedule = schedules.find(s => s.id === newId);

    if (!newSchedule || newSchedule.bookedSlots >= newSchedule.totalSlots) {
        alert('Selected schedule is not available.');
        return;
    }

    if (oldSchedule) oldSchedule.bookedSlots--;

    newSchedule.bookedSlots++;
    apt.scheduleId = newId;
    apt.status = 'pending';

    saveToLocalStorage();
    closeRescheduleModal();
    loadDonorAppointments();
    loadDonorSchedules();
    alert('Appointment rescheduled successfully! Pending admin approval.');
    notifyDonor(currentUser.username, `📅 Your appointment has been rescheduled to ${formatDate(newSchedule.date)} at ${newSchedule.time}. Pending approval.`);
    notifications.admin.push({
        message: `📅 Donor ${apt.name} rescheduled appointment. Please review.`,
        time: formatDateTime(new Date()),
        read: false
    });
    saveToLocalStorage();
}

/* ---------- NOTIFICATIONS ---------- */
function updateAdminNotifications() {
    const pendingCount = appointments.filter(a => a.status === 'pending').length;
    const unreadNotifs = notifications.admin.filter(n => !n.read).length;
    const total = pendingCount + unreadNotifs;
    const badgeEl = qs('adminNotificationCount');
    if (badgeEl) badgeEl.textContent = total;

    const dropdown = qs('adminNotificationDropdown');
    if (!dropdown) return;

    let html = '<div class="notification-header">Notifications</div>';
    if (total === 0) {
        html += '<div class="notification-item">No new notifications</div>';
    } else {
        const pending = appointments.filter(a => a.status === 'pending');
        pending.forEach(apt => {
            const schedule = schedules.find(s => s.id === apt.scheduleId);
            html += `
                <div class="notification-item unread" onclick="switchTab('appointments')">
                    <strong>${escapeHtml(apt.name)}</strong> requested an appointment
                    <div class="notification-time">${schedule ? formatDate(schedule.date) + ' at ' + escapeHtml(schedule.time) : 'Schedule pending'}</div>
                </div>
            `;
        });
        notifications.admin.slice(-10).reverse().forEach(notif => {
            html += `<div class="notification-item ${notif.read ? '' : 'unread'}">${escapeHtml(notif.message)}<div class="notification-time">${escapeHtml(notif.time)}</div></div>`;
        });
    }

    dropdown.innerHTML = html;
}

function updateDonorNotifications() {
    if (!currentUser) return;
    
    const myNotifications = notifications.donor.filter(n => n.username === currentUser.username);
    const unreadCount = myNotifications.filter(n => !n.read).length;
    const badgeEl = qs('donorNotificationCount');
    if (badgeEl) badgeEl.textContent = unreadCount;

    const dropdown = qs('donorNotificationDropdown');
    if (!dropdown) return;

    let html = '<div class="notification-header">Notifications</div>';
    if (myNotifications.length === 0) {
        html += '<div class="notification-item">No notifications yet</div>';
    } else {
        myNotifications.slice(-10).reverse().forEach((notif, index) => {
            html += `<div class="notification-item ${notif.read ? '' : 'unread'}" onclick="markAsRead(${index})">${escapeHtml(notif.message)}<div class="notification-time">${escapeHtml(notif.time)}</div></div>`;
        });
    }
    dropdown.innerHTML = html;
}

function toggleNotifications() {
    if (event) event.stopPropagation();
    const dropdown = qs('adminNotificationDropdown');
    
    const profileDropdown = qs('adminProfileDropdown');
    if (profileDropdown) profileDropdown.classList.remove('active');
    
    if (dropdown) dropdown.classList.toggle('active');
}

function toggleDonorNotifications() {
    if (event) event.stopPropagation();
    const dropdown = qs('donorNotificationDropdown');
    
    const profileDropdown = qs('donorProfileDropdown');
    if (profileDropdown) profileDropdown.classList.remove('active');
    
    if (dropdown) dropdown.classList.toggle('active');
}

function notifyDonor(username, message) {
    const notif = { 
        username, 
        message, 
        time: formatDateTime(new Date()), 
        read: false 
    };
    notifications.donor.push(notif);
    saveToLocalStorage();
    
    if (currentUser && currentUser.username === username && currentUser.type === 'donor') {
        updateDonorNotifications();
    }
}

function notifyAllDonors(message) {
    Object.values(users).filter(u => u.type === 'donor').forEach(u => {
        notifyDonor(u.username, message);
    });
}

function markAsRead(index) {
    if (!currentUser) return;
    
    const myNotifications = notifications.donor.filter(n => n.username === currentUser.username);
    const reversed = myNotifications.slice(-10).reverse();
    const actual = reversed[index];
    if (!actual) return;
    
    actual.read = true;

    for (let i = notifications.donor.length - 1, c = 0; i >= 0 && c <= index; i--) {
        if (notifications.donor[i].username === currentUser.username) {
            if (c === index) { 
                notifications.donor[i].read = true; 
                break; 
            }
            c++;
        }
    }
    
    saveToLocalStorage();
    updateDonorNotifications();
}

/* ---------- MESSAGING SYSTEM ---------- */
function toggleMessaging() {
    const modal = qs('messagingModal');
    if (modal) {
        modal.classList.toggle('active');
        if (modal.classList.contains('active')) {
            loadMessagesList();
        }
    }
}

function closeMessaging() {
    const messagingModal = qs('messagingModal');
    const chatModal = qs('chatModal');
    if (messagingModal) messagingModal.classList.remove('active');
    if (chatModal) chatModal.classList.remove('active');
    currentChatUser = null;
}

function loadMessagesList() {
    const container = qs('messagesList');
    if (!container) return;

    if (currentUser.type === 'admin') {
        const donors = Object.values(users).filter(u => u.type === 'donor');
        if (donors.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">No donors registered yet</p>';
            return;
        }

        let html = '<div class="messages-list">';
        donors.forEach(donor => {
            const unread = messages.filter(m => m.from === donor.username && m.to === 'admin' && !m.read).length;
            const lastMessage = messages.filter(m => (m.from === donor.username && m.to === 'admin') || (m.from === 'admin' && m.to === donor.username)).pop();
            
            html += `
                <div class="message-user-item" onclick="openChat('${donor.username}')">
                    <div class="message-user-avatar">${donor.fullname.charAt(0)}</div>
                    <div class="message-user-info">
                        <strong>${escapeHtml(donor.fullname)}</strong>
                        ${lastMessage ? `<p class="last-message">${escapeHtml(lastMessage.message.substring(0, 50))}${lastMessage.message.length > 50 ? '...' : ''}</p>` : '<p class="last-message">No messages yet</p>'}
                    </div>
                    ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } else {
        openChat('admin');
    }
}

function openChat(username) {
    currentChatUser = username;
    const messagingModal = qs('messagingModal');
    const chatModal = qs('chatModal');
    if (messagingModal) messagingModal.classList.remove('active');
    if (chatModal) chatModal.classList.add('active');
    
    const chatHeader = qs('chatHeader');
    if (chatHeader) {
        if (currentUser.type === 'admin') {
            const user = users[username];
            chatHeader.innerHTML = `<i class="fas fa-user-circle"></i> ${user ? escapeHtml(user.fullname) : escapeHtml(username)}`;
        } else {
            chatHeader.innerHTML = '<i class="fas fa-user-shield"></i> Administrator';
        }
    }
    
    loadChatMessages();
    
    messages.forEach(m => {
        if (m.from === username && m.to === currentUser.username) {
            m.read = true;
        }
    });
    saveToLocalStorage();
    updateMessageNotifications();
}

function loadChatMessages() {
    const container = qs('chatMessages');
    if (!container) return;

    const chatMessages = messages.filter(m => 
        (m.from === currentUser.username && m.to === currentChatUser) ||
        (m.from === currentChatUser && m.to === currentUser.username)
    );

    if (chatMessages.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">No messages yet. Start the conversation!</p>';
        return;
    }

    let html = '';
    chatMessages.forEach(msg => {
        const isMine = msg.from === currentUser.username;
        html += `
            <div class="chat-message ${isMine ? 'mine' : 'theirs'}">
                <div class="message-bubble">
                    <p>${escapeHtml(msg.message)}</p>
                    <span class="message-time">${formatDateTime(msg.timestamp)}</span>
                    ${isMine ? `<button class="delete-msg" onclick="deleteMessage(${msg.id})"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function deleteMessage(id) {
    if (!confirm('Delete this message?')) return;
    messages = messages.filter(m => m.id !== id);
    saveToLocalStorage();
    loadChatMessages();
}

function sendMessage() {
    const input = qs('messageInput');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;
    
    const newMessage = {
        id: messages.length ? Math.max(...messages.map(m => m.id)) + 1 : 1,
        from: currentUser.username,
        to: currentChatUser,
        message: message,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    messages.push(newMessage);
    saveToLocalStorage();
    
    input.value = '';
    loadChatMessages();
    updateMessageNotifications();
    
    if (currentUser.type === 'admin') {
        notifyDonor(currentChatUser, '💬 You have a new message from Admin');
    } else {
        notifications.admin.push({
            message: `💬 New message from ${currentUser.fullname}`,
            time: formatDateTime(new Date()),
            read: false
        });
        saveToLocalStorage();
    }
}

function closeChat() {
    const chatModal = qs('chatModal');
    if (chatModal) chatModal.classList.remove('active');
    currentChatUser = null;
    if (currentUser && currentUser.type === 'admin') {
        const messagingModal = qs('messagingModal');
        if (messagingModal) {
            messagingModal.classList.add('active');
            loadMessagesList();
        }
    }
}

function updateMessageNotifications() {
    let unreadCount = 0;
    
    if (currentUser.type === 'admin') {
        unreadCount = messages.filter(m => m.to === 'admin' && !m.read).length;
        const badge = qs('adminMessageCount');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    } else {
        unreadCount = messages.filter(m => m.to === currentUser.username && !m.read).length;
        const badge = qs('donorMessageCount');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }
}

/* ---------- SHARE FUNCTION ---------- */
function shareApp() {
    const shareData = {
        title: 'RHU Katipunan Blood Donation System',
        text: 'Be a hero, donate blood! Join the RHU Katipunan Blood Donation System.',
        url: window.location.href
    };

    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('Shared successfully'))
            .catch((error) => console.error('Error sharing', error));
    } else {
        navigator.clipboard.writeText(shareData.url)
            .then(() => alert('Link copied to clipboard! You can share it via Facebook, Messenger, Gmail, etc.'))
            .catch((error) => console.error('Error copying link', error));
    }
}

/* ---------- REMINDERS ---------- */
function checkUpcomingAppointments() {
    const today = new Date();
    appointments.forEach(apt => {
        if (apt.status === 'approved') {
            const schedule = schedules.find(s => s.id === apt.scheduleId);
            if (!schedule) return;
            
            const scheduleDate = new Date(schedule.date);
            const diffTime = scheduleDate - new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                notifyDonor(apt.donorUsername, `⏰ Reminder: You have an appointment tomorrow at ${schedule.time}.`);
            }
            if (diffDays === 0) {
                notifyDonor(apt.donorUsername, `⏰ Reminder: You have an appointment TODAY at ${schedule.time}. See you soon!`);
            }
        }
    });
}

/* ---------- OUTSIDE-CLICK HANDLING ---------- */
document.addEventListener('click', function(e) {
    const adminBell = document.querySelector('#adminDashboard .notification-bell');
    const donorBell = document.querySelector('#donorDashboard .notification-bell');
    const adminDropdown = qs('adminNotificationDropdown');
    const donorDropdown = qs('donorNotificationDropdown');
    const adminProfile = document.querySelector('#adminDashboard .user-profile');
    const donorProfile = document.querySelector('#donorDashboard .user-profile');
    const adminProfileDropdown = qs('adminProfileDropdown');
    const donorProfileDropdown = qs('donorProfileDropdown');

    if (adminBell && adminDropdown && !adminBell.contains(e.target)) {
        adminDropdown.classList.remove('active');
    }
    if (donorBell && donorDropdown && !donorBell.contains(e.target)) {
        donorDropdown.classList.remove('active');
    }
    if (adminProfile && adminProfileDropdown && !adminProfile.contains(e.target)) {
        adminProfileDropdown.classList.remove('active');
    }
    if (donorProfile && donorProfileDropdown && !donorProfile.contains(e.target)) {
        donorProfileDropdown.classList.remove('active');
    }
});

/* ---------- ENTER KEY HANDLERS ---------- */
document.addEventListener('DOMContentLoaded', function() {
    ['username','password'].forEach(id => {
        const input = qs(id);
        if (input) input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    });

    const messageInput = qs('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    const lastDonationDateInput = qs('lastDonationDate');
    if (lastDonationDateInput) {
        lastDonationDateInput.addEventListener('change', checkLastDonationDate);
    }

    ensureInitialData();
    const loginPage = qs('loginPage');
    if (loginPage) loginPage.style.display = 'flex';
});

setInterval(checkUpcomingAppointments, 60000);
checkUpcomingAppointments();