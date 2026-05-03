// =====================================================================
// LNMIIT Faculty Management — Frontend (MongoDB-backed via REST API)
// =====================================================================

const API = '/api/faculty';
const COLORS = ['#f87171','#fb923c','#fbbf24','#a3e635','#4ade80','#34d399',
                 '#2dd4bf','#38bdf8','#818cf8','#a78bfa','#e879f9','#f472b6'];

// ── State ─────────────────────────────────────────────────────────────
let facultyData    = [];
let facultyToDelete = null;

// ── API Helper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const res  = await fetch(API + path, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// ── Load all faculty from the server ─────────────────────────────────
async function loadFaculty() {
    try {
        facultyData = await apiFetch('');
        syncState();
    } catch (err) {
        showToast('Failed to load data: ' + err.message, 'error');
    }
}

// ── Auto-generate next Emp ID (for form pre-fill) ────────────────────
function generateEmpId() {
    let maxId = 0;
    facultyData.forEach(f => {
        const match = f.empId.match(/^EMP(\d+)$/i);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxId) maxId = num;
        }
    });
    return `EMP${String(maxId + 1).padStart(3, '0')}`;
}

// ── Routing ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const navBtns = document.querySelectorAll('.nav-btn');
    const panels  = document.querySelectorAll('.panel');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.getAttribute('data-target');
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            if (targetId !== 'retrieve-details') {
                document.getElementById('retrieveFacultySelect').value = '';
                document.getElementById('faculty-profile-view').classList.add('hidden');
                document.getElementById('no-profile-selected').classList.remove('hidden');
            }
            if (targetId === 'allocate-course') renderAllocationsTable();
        });
    });

    loadFaculty();
});

function navigateToPanel(panelId) {
    document.querySelector(`.nav-btn[data-target="${panelId}"]`).click();
}

// ── State Sync ────────────────────────────────────────────────────────
function syncState() {
    updateStats();
    populateSelects();
    renderAllFaculty();
    renderAllocationsTable();
    const empIdField = document.getElementById('empId');
    if (empIdField) empIdField.value = generateEmpId();
}

function updateStats() {
    document.getElementById('stat-total-faculty').innerText = facultyData.length;
    const depts = new Set(facultyData.map(f => f.department));
    document.getElementById('stat-total-departments').innerText = depts.size;
    const totalCourses = facultyData.reduce((sum, f) => sum + f.courses.length, 0);
    document.getElementById('stat-total-courses').innerText = totalCourses;
}

function populateSelects() {
    const opts = facultyData
        .map(f => `<option value="${f.id}">${f.firstName} ${f.lastName} (${f.empId})</option>`)
        .join('');

    document.getElementById('allocFacultySelect').innerHTML =
        `<option value="" disabled selected>Select Faculty</option>${opts}`;
    document.getElementById('retrieveFacultySelect').innerHTML =
        `<option value="" disabled selected>Search/Select Faculty to view details</option>${opts}`;
}

// ── All Faculty Panel ─────────────────────────────────────────────────
function getInitials(first, last) {
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

function renderAllFaculty(filterText = '') {
    const grid     = document.getElementById('faculty-grid');
    grid.innerHTML = '';

    const lower    = filterText.toLowerCase();
    const filtered = facultyData.filter(f => {
        const name = `${f.firstName} ${f.lastName}`.toLowerCase();
        return name.includes(lower) || f.department.toLowerCase().includes(lower);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);">
            No faculty found matching "${filterText}".</p>`;
        return;
    }

    filtered.forEach(f => {
        const coursesHtml = f.courses.length > 0
            ? f.courses.map(c => `<span class="course-chip" title="${c.name}">${c.code}</span>`).join('')
            : '<span style="color:var(--text-muted);font-size:0.8rem;">No courses assigned</span>';

        const card = document.createElement('div');
        card.className = 'faculty-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="avatar" style="background-color:${f.color}">
                    ${getInitials(f.firstName, f.lastName)}
                </div>
                <div class="card-title">
                    <h3>${f.firstName} ${f.lastName}</h3>
                    <p>${f.designation} | ${f.department}</p>
                </div>
            </div>
            <div class="card-body">
                <p><span class="label">Emp ID:</span> ${f.empId}</p>
                <p><span class="label">Joined:</span>  ${f.joiningYear}</p>
                <div class="courses-chip-container">${coursesHtml}</div>
            </div>
            <div class="card-actions">
                <button class="btn-text" onclick="viewFacultyDetails('${f.id}')">Details</button>
                <button class="btn-text danger" onclick="openDeleteModal('${f.id}')">Remove</button>
            </div>`;
        grid.appendChild(card);
    });
}

document.getElementById('search-faculty').addEventListener('input', e => {
    renderAllFaculty(e.target.value);
});

function viewFacultyDetails(id) {
    navigateToPanel('retrieve-details');
    document.getElementById('retrieveFacultySelect').value = id;
    renderProfileView(id);
}

// ── Add Faculty Panel ─────────────────────────────────────────────────
document.getElementById('add-faculty-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email      = document.getElementById('email').value.trim();
    const phone      = document.getElementById('phone').value.trim();
    const joiningYear = parseInt(document.getElementById('joiningYear').value, 10);

    // Client-side validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Invalid email format!', 'error'); return;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
        showToast('Phone number must be exactly 10 digits!', 'error'); return;
    }
    const currentYear = new Date().getFullYear();
    if (isNaN(joiningYear) || joiningYear < 1990 || joiningYear > currentYear) {
        showToast(`Joining year must be between 1990 and ${currentYear}!`, 'error'); return;
    }

    const payload = {
        firstName:      document.getElementById('firstName').value.trim(),
        lastName:       document.getElementById('lastName').value.trim(),
        empId:          document.getElementById('empId').value.trim(),
        department:     document.getElementById('department').value,
        designation:    document.getElementById('designation').value,
        joiningYear,
        email,
        phone,
        specialization: document.getElementById('specialization').value.trim() || 'N/A',
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };

    try {
        const added = await apiFetch('', { method: 'POST', body: JSON.stringify(payload) });
        showToast(`✅ Added ${added.firstName} ${added.lastName}`, 'success');
        e.target.reset();
        await loadFaculty();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ── Allocate Course Panel ─────────────────────────────────────────────
document.getElementById('allocate-course-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const facultyId = document.getElementById('allocFacultySelect').value;
    const code      = document.getElementById('courseCode').value.trim().toUpperCase();
    const name      = document.getElementById('courseName').value.trim();

    try {
        const updated = await apiFetch(`/${facultyId}/courses`, {
            method: 'POST',
            body: JSON.stringify({ code, name })
        });
        showToast(`Course ${code} assigned to ${updated.firstName}.`, 'success');
        document.getElementById('courseCode').value = '';
        document.getElementById('courseName').value = '';
        await loadFaculty();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

function renderAllocationsTable() {
    const tbody = document.getElementById('allocations-tbody');
    tbody.innerHTML = '';
    let hasAllocations = false;

    facultyData.forEach(faculty => {
        faculty.courses.forEach(course => {
            hasAllocations = true;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${faculty.firstName} ${faculty.lastName}</td>
                <td>${faculty.department}</td>
                <td><strong>${course.code}</strong></td>
                <td>${course.name}</td>
                <td>
                    <button class="btn-text danger"
                        onclick="removeCourse('${faculty.id}', '${course.code}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>`;
            tbody.appendChild(tr);
        });
    });

    if (!hasAllocations) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">
            No courses allocated yet.</td></tr>`;
    }
}

window.removeCourse = async function (facultyId, courseCode) {
    try {
        await apiFetch(`/${facultyId}/courses/${courseCode}`, { method: 'DELETE' });
        showToast(`Removed course ${courseCode}.`, 'success');
        await loadFaculty();
        // Refresh profile view if currently open
        const sel = document.getElementById('retrieveFacultySelect');
        if (sel.value === facultyId) renderProfileView(facultyId);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ── Retrieve Details Panel ────────────────────────────────────────────
document.getElementById('retrieveFacultySelect').addEventListener('change', e => {
    renderProfileView(e.target.value);
});

function renderProfileView(id) {
    const faculty = facultyData.find(f => f.id === id);
    if (!faculty) return;

    document.getElementById('no-profile-selected').classList.add('hidden');
    document.getElementById('faculty-profile-view').classList.remove('hidden');

    const avatar = document.getElementById('prof-avatar');
    avatar.innerText           = getInitials(faculty.firstName, faculty.lastName);
    avatar.style.backgroundColor = faculty.color;

    document.getElementById('prof-name').innerText              = `${faculty.firstName} ${faculty.lastName}`;
    document.getElementById('prof-designation-dept').innerText  = `${faculty.designation} | ${faculty.department}`;
    document.getElementById('prof-empid').innerText             = faculty.empId;
    document.getElementById('prof-year').innerText              = faculty.joiningYear;
    document.getElementById('prof-email').innerText             = faculty.email;
    document.getElementById('prof-phone').innerText             = faculty.phone || 'N/A';
    document.getElementById('prof-spec').innerText              = faculty.specialization || 'N/A';

    const coursesContainer = document.getElementById('prof-courses');
    coursesContainer.innerHTML = faculty.courses.length > 0
        ? faculty.courses.map(c => `<span class="course-chip">${c.code}: ${c.name}</span>`).join('')
        : '<span style="color:var(--text-muted);">No courses allocated.</span>';
}

// ── Delete Modal ──────────────────────────────────────────────────────
window.openDeleteModal = function (id) {
    const faculty = facultyData.find(f => f.id === id);
    if (!faculty) return;
    facultyToDelete = id;
    document.getElementById('delete-target-name').innerText = `${faculty.firstName} ${faculty.lastName}`;
    document.getElementById('delete-modal').classList.add('active');
};

function closeDeleteModal() {
    facultyToDelete = null;
    document.getElementById('delete-modal').classList.remove('active');
}

document.getElementById('close-modal').addEventListener('click', closeDeleteModal);
document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);

document.getElementById('confirm-delete').addEventListener('click', async () => {
    if (!facultyToDelete) return;
    const faculty = facultyData.find(f => f.id === facultyToDelete);
    try {
        await apiFetch(`/${facultyToDelete}`, { method: 'DELETE' });
        showToast(`Removed ${faculty.firstName} ${faculty.lastName}.`, 'success');
        closeDeleteModal();
        await loadFaculty();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ── Toast Notifications ───────────────────────────────────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast     = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success'
        ? '<i class="fa-solid fa-check-circle" style="color:var(--success)"></i>'
        : '<i class="fa-solid fa-circle-exclamation" style="color:var(--danger)"></i>';

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3000);
}
