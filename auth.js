// ── Auth page JS — handles login, register, and role selection ──────────────

// ── Role pill toggle ──────────────────────────────────────────────────────────
const ROLE_HINTS = {
    super_admin: 'Administrative access',
    hod: 'Departmental management access'
};

function selectRole(role) {
    document.getElementById('selectedRole').value = role;
    document.querySelectorAll('.role-pill').forEach(p => p.classList.remove('selected'));
    document.getElementById(`pill-${role}`).classList.add('selected');
    document.getElementById('role-hint').textContent = ROLE_HINTS[role];

    const deptGroup = document.getElementById('dept-group');
    const deptSelect = document.getElementById('registerDept');
    if (role === 'hod') {
        deptGroup.classList.remove('hidden');
        deptSelect.required = true;
    } else {
        deptGroup.classList.add('hidden');
        deptSelect.required = false;
        deptSelect.value = '';
    }
}

// ── Page toggle ───────────────────────────────────────────────────────────────
function showRegister() {
    document.getElementById('login-box').classList.add('hidden');
    document.getElementById('register-box').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('register-box').classList.add('hidden');
    document.getElementById('login-box').classList.remove('hidden');
}

// keep old names working just in case
function register() { showRegister(); }
function login()    { showLogin(); }

// ── Error helper ──────────────────────────────────────────────────────────────
function showAuthError(elemId, msg) {
    const el = document.getElementById(elemId);
    el.textContent = msg;
    el.classList.add('visible');
}
function clearAuthError(elemId) {
    document.getElementById(elemId).classList.remove('visible');
}

// ── Login ─────────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthError('login-error');

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
        showAuthError('login-error', data.error || 'Login failed.');
        return;
    }

    // Persist token + role info for the main app
    localStorage.setItem('token',      data.token);
    localStorage.setItem('userRole',   data.role);
    localStorage.setItem('userDept',   data.department || '');

    window.location.href = 'index.html';
});

// ── Register ──────────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthError('register-error');

    const role       = document.getElementById('selectedRole').value;
    const department = document.getElementById('registerDept').value || null;
    const email      = document.getElementById('registerEmail').value.trim();
    const password   = document.getElementById('registerPassword').value;

    if (role === 'hod' && !department) {
        showAuthError('register-error', 'Please select your department.');
        return;
    }

    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, department })
    });

    const data = await res.json();

    if (!res.ok) {
        showAuthError('register-error', data.error || 'Registration failed.');
        return;
    }

    alert('✅ Account created! Please login.');
    showLogin();
});