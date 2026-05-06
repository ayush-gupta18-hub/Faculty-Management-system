// =====================================================================
// LNMIIT Faculty Management — Frontend (MongoDB-backed via REST API)
// =====================================================================

const API    = '/api/faculty';
const COLORS = ['#f87171','#fb923c','#fbbf24','#a3e635','#4ade80','#34d399',
                 '#2dd4bf','#38bdf8','#818cf8','#a78bfa','#e879f9','#f472b6'];

// ── State ─────────────────────────────────────────────────────────────
let facultyData     = [];
let facultyToDelete = null;

// ── RBAC: read role & dept saved by auth.js ───────────────────────────
const token    = localStorage.getItem('token');
const userRole = localStorage.getItem('userRole');   // 'super_admin' | 'hod'
const userDept = localStorage.getItem('userDept');   // e.g. 'CSE' or ''

if (!token) {
    window.location.href = 'auth.html';
}

// ── API Helper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const res = await fetch(API + path, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// ══════════════════════════════════════════════════════════════════════
// REAL-TIME INLINE VALIDATION
// ══════════════════════════════════════════════════════════════════════

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Validation rules for each field.
 * Returns an error string, or '' if valid.
 */
function validateField(id, value) {
    switch (id) {
        case 'firstName':
        case 'lastName': {
            const label = id === 'firstName' ? 'First name' : 'Last name';
            if (!value.trim()) return `${label} is required.`;
            if (!/^[A-Za-z\s'-]+$/.test(value.trim()))
                return `${label} must contain only letters.`;
            return '';
        }
        case 'department':
            return value ? '' : 'Please select a department.';
        case 'designation':
            return value ? '' : 'Please select a designation.';
        case 'joiningYear': {
            const yr = parseInt(value, 10);
            if (!value) return 'Joining year is required.';
            if (isNaN(yr) || yr < 1990 || yr > CURRENT_YEAR)
                return `Year must be between 1990 and ${CURRENT_YEAR}.`;
            return '';
        }
        case 'email': {
            if (!value.trim()) return 'Email is required.';
            if (!/^[^\s@]+@lnmiit\.ac\.in$/.test(value.trim()))
                return 'Must be a valid @lnmiit.ac.in address.';
            return '';
        }
        case 'phone': {
            if (!value) return '';   // optional field
            if (!/^\d{10}$/.test(value)) return 'Phone must be exactly 10 digits.';
            return '';
        }
        case 'specialization':
            return value ? '' : 'Please select a specialization.';
        default:
            return '';
    }
}

/** Show/hide the inline error message and set border colour */
function setFieldState(id, errorMsg) {
    const input  = document.getElementById(id);
    const errEl  = document.getElementById(`err-${id}`);
    if (!input) return;

    if (errorMsg) {
        input.classList.add('invalid');
        input.classList.remove('valid');
        if (errEl) errEl.textContent = `⚠ ${errorMsg}`;
    } else if (input.value || input.tagName === 'SELECT') {
        input.classList.remove('invalid');
        input.classList.add('valid');
        if (errEl) errEl.textContent = '';
    } else {
        input.classList.remove('invalid', 'valid');
        if (errEl) errEl.textContent = '';
    }
}

/** Re-evaluate all required fields and enable/disable the submit button */
const REQUIRED_FIELDS = ['firstName','lastName','department','designation',
                         'joiningYear','email','specialization'];

function refreshSubmitState() {
    const btn = document.getElementById('submit-add-faculty');
    if (!btn) return;
    const hasErrors = REQUIRED_FIELDS.some(id => {
        const el = document.getElementById(id);
        return !el || el.classList.contains('invalid') || (!el.value.trim());
    });
    btn.disabled = hasErrors;
}

/** Attach blur + input listeners to a field */
function attachValidation(id) {
    const el = document.getElementById(id);
    if (!el) return;

    // Validate on blur (leaving the field)
    el.addEventListener('blur', () => {
        const err = validateField(id, el.value);
        setFieldState(id, err);
        refreshSubmitState();
    });

    // Validate on change (for selects) or on input (for text)
    const event = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(event, () => {
        // Only show real-time errors once the field has been touched (has a value)
        if (el.value) {
            const err = validateField(id, el.value);
            setFieldState(id, err);
        } else {
            el.classList.remove('invalid', 'valid');
            const errEl = document.getElementById(`err-${id}`);
            if (errEl) errEl.textContent = '';
        }
        refreshSubmitState();
    });
}

/** Wire up all validated fields */
function initValidation() {
    [...REQUIRED_FIELDS, 'phone'].forEach(attachValidation);
    refreshSubmitState();
}

/** Reset validation state when the form is cleared */
function resetValidation() {
    [...REQUIRED_FIELDS, 'phone'].forEach(id => {
        const el   = document.getElementById(id);
        const errEl = document.getElementById(`err-${id}`);
        if (el)    el.classList.remove('valid', 'invalid');
        if (errEl) errEl.textContent = '';
    });
    refreshSubmitState();
}

/** Shake the form to signal a blocked submission */
function shakeForm() {
    const form = document.getElementById('add-faculty-form');
    form.classList.add('shake');
    form.addEventListener('animationend', () => form.classList.remove('shake'), { once: true });
}

// ══════════════════════════════════════════════════════════════════════
// RBAC
// ══════════════════════════════════════════════════════════════════════

function applyRBACUI() {
    const roleBadge = document.getElementById('role-badge');
    const roleIcon  = document.getElementById('role-icon');
    const roleLabel = document.getElementById('role-label');
    const deptBadge = document.getElementById('dept-badge');

    if (userRole === 'super_admin') {
        roleBadge.classList.add('super-admin');
        roleIcon.className    = 'fa-solid fa-crown';
        roleLabel.textContent = 'Super Admin';
        deptBadge.classList.add('hidden');
    } else if (userRole === 'hod') {
        roleBadge.classList.add('hod');
        roleIcon.className    = 'fa-solid fa-building-user';
        roleLabel.textContent = 'HOD';
        if (userDept) {
            deptBadge.textContent = userDept;
            deptBadge.classList.remove('hidden');
        }
        // Show HOD notice banner
        const notice = document.getElementById('hod-dept-notice');
        if (notice) {
            notice.classList.remove('hidden');
            document.getElementById('hod-dept-label').textContent = userDept;
        }
        // Lock the Department select to HOD's dept
        const deptSelect = document.getElementById('department');
        if (deptSelect) {
            deptSelect.innerHTML = `<option value="${userDept}" selected>${userDept}</option>`;
            deptSelect.disabled  = true;
            deptSelect.style.cssText = 'background:#f3f4f6;color:var(--text-muted);cursor:not-allowed;';
        }
    }
}

// ══════════════════════════════════════════════════════════════════════
// CORE APP
// ══════════════════════════════════════════════════════════════════════

async function loadFaculty() {
    try {
        facultyData = await apiFetch('');
        syncState();
    } catch (err) {
        showToast('Failed to load data: ' + err.message, 'error');
    }
}

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

    applyRBACUI();
    initValidation();
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
    const grid = document.getElementById('faculty-grid');
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

// ── Add Faculty Form Submit ────────────────────────────────────────────
document.getElementById('add-faculty-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Run full validation on all fields before submitting
    let hasErrors = false;
    [...REQUIRED_FIELDS, 'phone'].forEach(id => {
        const el  = document.getElementById(id);
        if (!el) return;
        const err = validateField(id, el.value);
        setFieldState(id, err);
        if (err) hasErrors = true;
    });

    if (hasErrors) {
        shakeForm();
        showToast('Please fix the highlighted errors before submitting.', 'error');
        return;
    }

    const payload = {
        firstName:      document.getElementById('firstName').value.trim(),
        lastName:       document.getElementById('lastName').value.trim(),
        empId:          document.getElementById('empId').value.trim(),
        department:     document.getElementById('department').value,
        designation:    document.getElementById('designation').value,
        joiningYear:    parseInt(document.getElementById('joiningYear').value, 10),
        email:          document.getElementById('email').value.trim(),
        phone:          document.getElementById('phone').value.trim(),
        specialization: document.getElementById('specialization').value || 'N/A',
        color:          COLORS[Math.floor(Math.random() * COLORS.length)]
    };

    try {
        const added = await apiFetch('', { method: 'POST', body: JSON.stringify(payload) });
        showToast(`✅ Added ${added.firstName} ${added.lastName}`, 'success');
        e.target.reset();
        resetValidation();
        applyRBACUI();   // re-lock HOD dept after reset
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
    avatar.innerText             = getInitials(faculty.firstName, faculty.lastName);
    avatar.style.backgroundColor = faculty.color;

    document.getElementById('prof-name').innerText             = `${faculty.firstName} ${faculty.lastName}`;
    document.getElementById('prof-designation-dept').innerText = `${faculty.designation} | ${faculty.department}`;
    document.getElementById('prof-empid').innerText            = faculty.empId;
    document.getElementById('prof-year').innerText             = faculty.joiningYear;
    document.getElementById('prof-email').innerText            = faculty.email;
    document.getElementById('prof-phone').innerText            = faculty.phone || 'N/A';
    document.getElementById('prof-spec').innerText             = faculty.specialization || 'N/A';

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

// ── Logout ────────────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userDept');
    window.location.href = 'auth.html';
}