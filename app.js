// --- 1. Data Model ---
// Colors for avatars
const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#e879f9', '#f472b6'];

let facultyData = [
    {
        id: '1',
        firstName: 'Amit',
        lastName: 'Sharma',
        empId: 'EMP001',
        department: 'CSE',
        designation: 'Professor',
        joiningYear: 2010,
        email: 'amit.sharma@lnmiit.ac.in',
        phone: '9876543210',
        specialization: 'Database Systems, Data Mining',
        courses: [
            { code: 'CSE301', name: 'Database Management Systems' },
            { code: 'CSE412', name: 'Data Mining' }
        ],
        color: colors[0]
    },
    {
        id: '2',
        firstName: 'Priya',
        lastName: 'Singh',
        empId: 'EMP002',
        department: 'ECE',
        designation: 'Associate Professor',
        joiningYear: 2015,
        email: 'priya.singh@lnmiit.ac.in',
        phone: '9876543211',
        specialization: 'VLSI Design, Microprocessors',
        courses: [
            { code: 'ECE205', name: 'Digital Logic Design' }
        ],
        color: colors[1]
    },
    {
        id: '3',
        firstName: 'Rahul',
        lastName: 'Verma',
        empId: 'EMP003',
        department: 'ME',
        designation: 'Assistant Professor',
        joiningYear: 2018,
        email: 'rahul.verma@lnmiit.ac.in',
        phone: '9876543212',
        specialization: 'Robotics, Thermodynamics',
        courses: [],
        color: colors[2]
    },
    {
        id: '4',
        firstName: 'Neha',
        lastName: 'Gupta',
        empId: 'EMP004',
        department: 'Mathematics',
        designation: 'Professor',
        joiningYear: 2008,
        email: 'neha.gupta@lnmiit.ac.in',
        phone: '9876543213',
        specialization: 'Discrete Mathematics, Algebra',
        courses: [
            { code: 'MTH102', name: 'Mathematics II' }
        ],
        color: colors[3]
    }
];

let facultyToDelete = null;

// --- 2. Shell / Routing ---
document.addEventListener('DOMContentLoaded', () => {
    // Nav logic
    const navBtns = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.panel');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active btn
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active panel
            const targetId = btn.getAttribute('data-target');
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Reset profile view when navigating away
            if (targetId !== 'retrieve-details') {
                document.getElementById('retrieveFacultySelect').value = "";
                document.getElementById('faculty-profile-view').classList.add('hidden');
                document.getElementById('no-profile-selected').classList.remove('hidden');
            }
            
            // Re-render allocations if allocating course tab is clicked
            if (targetId === 'allocate-course') {
                renderAllocationsTable();
            }
        });
    });

    // Initial render
    syncState();
});

function navigateToPanel(panelId) {
    document.querySelector(`.nav-btn[data-target="${panelId}"]`).click();
}

// --- 3. State Sync Utilities ---
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

function syncState() {
    updateStats();
    populateSelects();
    renderAllFaculty();
    renderAllocationsTable();
    
    const empIdField = document.getElementById('empId');
    if (empIdField) {
        empIdField.value = generateEmpId();
    }
}

function updateStats() {
    document.getElementById('stat-total-faculty').innerText = facultyData.length;
    
    const depts = new Set(facultyData.map(f => f.department));
    document.getElementById('stat-total-departments').innerText = depts.size;

    let totalCourses = 0;
    facultyData.forEach(f => {
        totalCourses += f.courses.length;
    });
    document.getElementById('stat-total-courses').innerText = totalCourses;
}

function populateSelects() {
    const allocSelect = document.getElementById('allocFacultySelect');
    const retrieveSelect = document.getElementById('retrieveFacultySelect');

    const optionsHTML = `<option value="" disabled selected>Select Faculty</option>` + 
        facultyData.map(f => `<option value="${f.id}">${f.firstName} ${f.lastName} (${f.empId})</option>`).join('');

    allocSelect.innerHTML = optionsHTML;
    retrieveSelect.innerHTML = `<option value="" disabled selected>Search/Select Faculty to view details</option>` + 
        facultyData.map(f => `<option value="${f.id}">${f.firstName} ${f.lastName} (${f.empId})</option>`).join('');
}

// --- 4. Panel Logic ---

// --- All Faculty Panel ---
function getInitials(first, last) {
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

function renderAllFaculty(filterText = '') {
    const grid = document.getElementById('faculty-grid');
    grid.innerHTML = '';

    const lowerFilter = filterText.toLowerCase();
    const filtered = facultyData.filter(f => {
        const fullName = `${f.firstName} ${f.lastName}`.toLowerCase();
        return fullName.includes(lowerFilter) || f.department.toLowerCase().includes(lowerFilter);
    });

    if(filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted);">No faculty found matching "${filterText}".</p>`;
        return;
    }

    filtered.forEach(f => {
        const coursesHtml = f.courses.length > 0 
            ? f.courses.map(c => `<span class="course-chip" title="${c.name}">${c.code}</span>`).join('')
            : '<span style="color:var(--text-muted); font-size:0.8rem;">No courses assigned</span>';

        const card = document.createElement('div');
        card.className = 'faculty-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="avatar" style="background-color: ${f.color}">${getInitials(f.firstName, f.lastName)}</div>
                <div class="card-title">
                    <h3>${f.firstName} ${f.lastName}</h3>
                    <p>${f.designation} | ${f.department}</p>
                </div>
            </div>
            <div class="card-body">
                <p><span class="label">Emp ID:</span> ${f.empId}</p>
                <p><span class="label">Joined:</span> ${f.joiningYear}</p>
                <div class="courses-chip-container">
                    ${coursesHtml}
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-text" onclick="viewFacultyDetails('${f.id}')">Details</button>
                <button class="btn-text danger" onclick="openDeleteModal('${f.id}')">Remove</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.getElementById('search-faculty').addEventListener('input', (e) => {
    renderAllFaculty(e.target.value);
});

function viewFacultyDetails(id) {
    navigateToPanel('retrieve-details');
    document.getElementById('retrieveFacultySelect').value = id;
    renderProfileView(id);
}

// --- Add Faculty Panel ---
document.getElementById('add-faculty-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const empId = document.getElementById('empId').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const joiningYear = parseInt(document.getElementById('joiningYear').value, 10);
    
    // 1. Unique ID Check
    if (facultyData.some(f => f.empId.toLowerCase() === empId.toLowerCase())) {
        showToast(`Employee ID ${empId} already exists!`, 'error');
        return;
    }

    // 2. Unique Email Check & Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast(`Invalid email format!`, 'error');
        return;
    }
    if (facultyData.some(f => f.email.toLowerCase() === email.toLowerCase())) {
        showToast(`Email ${email} is already registered!`, 'error');
        return;
    }

    // 3. Unique Phone Check & Format
    if (phone) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            showToast(`Phone number must be exactly 10 digits!`, 'error');
            return;
        }
        if (facultyData.some(f => f.phone === phone)) {
            showToast(`Phone number ${phone} is already registered!`, 'error');
            return;
        }
    }

    // 4. Joining Year Check
    const currentYear = new Date().getFullYear();
    if (isNaN(joiningYear) || joiningYear < 1990 || joiningYear > currentYear) {
        showToast(`Joining year must be between 1990 and ${currentYear}!`, 'error');
        return;
    }

    const newFaculty = {
        id: Date.now().toString(),
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        empId: empId,
        department: document.getElementById('department').value,
        designation: document.getElementById('designation').value,
        joiningYear: joiningYear,
        email: email,
        phone: phone,
        specialization: document.getElementById('specialization').value.trim() || 'N/A',
        courses: [],
        color: colors[Math.floor(Math.random() * colors.length)]
    };

    facultyData.push(newFaculty);
    
    showToast(`Successfully added ${newFaculty.firstName} ${newFaculty.lastName}`, 'success');
    e.target.reset();
    
    syncState();
});

// --- Allocate Course Panel ---
document.getElementById('allocate-course-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const facultyId = document.getElementById('allocFacultySelect').value;
    const code = document.getElementById('courseCode').value.trim().toUpperCase();
    const name = document.getElementById('courseName').value.trim();

    const faculty = facultyData.find(f => f.id === facultyId);
    
    if (faculty.courses.some(c => c.code === code)) {
        showToast(`Course ${code} is already assigned to ${faculty.firstName}.`, 'error');
        return;
    }

    faculty.courses.push({ code, name });
    showToast(`Course ${code} assigned to ${faculty.firstName}.`, 'success');
    
    document.getElementById('courseCode').value = '';
    document.getElementById('courseName').value = '';
    
    syncState();
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
                    <button class="btn-text danger" onclick="removeCourse('${faculty.id}', '${course.code}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });

    if (!hasAllocations) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No courses allocated yet.</td></tr>`;
    }
}

window.removeCourse = function(facultyId, courseCode) {
    const faculty = facultyData.find(f => f.id === facultyId);
    if(faculty) {
        faculty.courses = faculty.courses.filter(c => c.code !== courseCode);
        showToast(`Removed course ${courseCode} from ${faculty.firstName}.`, 'success');
        syncState();
        
        // If we are currently viewing this faculty in retrieve details, update it too
        const retrieveSelect = document.getElementById('retrieveFacultySelect');
        if (retrieveSelect.value === facultyId) {
            renderProfileView(facultyId);
        }
    }
};


// --- Retrieve Details Panel ---
document.getElementById('retrieveFacultySelect').addEventListener('change', (e) => {
    renderProfileView(e.target.value);
});

function renderProfileView(id) {
    const faculty = facultyData.find(f => f.id === id);
    if (!faculty) return;

    document.getElementById('no-profile-selected').classList.add('hidden');
    document.getElementById('faculty-profile-view').classList.remove('hidden');

    document.getElementById('prof-avatar').innerText = getInitials(faculty.firstName, faculty.lastName);
    document.getElementById('prof-avatar').style.backgroundColor = faculty.color;
    
    document.getElementById('prof-name').innerText = `${faculty.firstName} ${faculty.lastName}`;
    document.getElementById('prof-designation-dept').innerText = `${faculty.designation} | ${faculty.department}`;
    
    document.getElementById('prof-empid').innerText = faculty.empId;
    document.getElementById('prof-year').innerText = faculty.joiningYear;
    document.getElementById('prof-email').innerText = faculty.email;
    document.getElementById('prof-phone').innerText = faculty.phone || 'N/A';
    document.getElementById('prof-spec').innerText = faculty.specialization || 'N/A';

    const coursesContainer = document.getElementById('prof-courses');
    if (faculty.courses.length > 0) {
        coursesContainer.innerHTML = faculty.courses.map(c => 
            `<span class="course-chip">${c.code}: ${c.name}</span>`
        ).join('');
    } else {
        coursesContainer.innerHTML = '<span style="color:var(--text-muted);">No courses allocated.</span>';
    }
}

// --- Modals & Toasts ---
window.openDeleteModal = function(id) {
    const faculty = facultyData.find(f => f.id === id);
    if(!faculty) return;
    
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

document.getElementById('confirm-delete').addEventListener('click', () => {
    if (facultyToDelete) {
        const faculty = facultyData.find(f => f.id === facultyToDelete);
        facultyData = facultyData.filter(f => f.id !== facultyToDelete);
        showToast(`Removed ${faculty.firstName} ${faculty.lastName}.`, 'success');
        closeDeleteModal();
        syncState();
    }
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '<i class="fa-solid fa-check-circle" style="color:var(--success)"></i>' : '<i class="fa-solid fa-circle-exclamation" style="color:var(--danger)"></i>';
    
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if(toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}
