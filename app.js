/**
 * ══════════════════════════════════════════════════════════════
 *  ALIGHT RMS — APPLICATION LOGIC  (js/app.js)
 *  Requires: DB (from db/database.js) + Chart.js
 *  No inline styles — all class names live in css/styles.css
 * ══════════════════════════════════════════════════════════════
 */

/* ────────────────────────────────────────
   TOAST
──────────────────────────────────────── */
function toast(msg, type = 's') {
  const icons = { s: '✅', e: '❌', i: 'ℹ️', w: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-zone').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ────────────────────────────────────────
   MODALS
──────────────────────────────────────── */
function openModal(id)  { document.getElementById(`modal-${id}`).classList.add('open'); }
function closeModal(id) { document.getElementById(`modal-${id}`).classList.remove('open'); }

document.querySelectorAll('.modal-bg').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); })
);

/* ────────────────────────────────────────
   VALIDATION
──────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+]?[\d\s\-().]{7,20}$/;

function setFieldError(inputId, groupId, msg) {
  const inp = document.getElementById(inputId);
  const grp = document.getElementById(groupId);
  const msgEl = document.getElementById('msg-' + inputId);
  if (inp)   inp.classList.add('field-error');
  if (grp)   grp.classList.add('has-error');
  if (msgEl) { msgEl.textContent = msg; msgEl.classList.add('show', 'err'); }
}

function clearFieldError(inputId, groupId) {
  const inp = document.getElementById(inputId);
  const grp = document.getElementById(groupId);
  const msgEl = document.getElementById('msg-' + inputId);
  if (inp)   inp.classList.remove('field-error', 'field-ok');
  if (grp)   grp.classList.remove('has-error');
  if (msgEl) msgEl.classList.remove('show', 'err', 'ok');
}

function setFieldOk(inputId) {
  const inp = document.getElementById(inputId);
  if (inp) { inp.classList.remove('field-error'); inp.classList.add('field-ok'); }
}

function validateFields(checks) {
  let ok = true;
  checks.forEach(c => {
    clearFieldError(c.id, c.group);
    if (!c.test(c.val)) { setFieldError(c.id, c.group, c.msg); ok = false; }
    else setFieldOk(c.id);
  });
  return ok;
}

function checkPasswordStrength(inputId, barId) {
  const val = document.getElementById(inputId)?.value || '';
  const bar = document.getElementById(barId);
  if (!bar) return;
  if (!val) { bar.innerHTML = ''; return; }
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['Weak','Fair','Good','Strong'];
  const colors = ['var(--red)','var(--amber)','var(--blue)','var(--green)'];
  const widths = ['25%','50%','75%','100%'];
  bar.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
    <div style="flex:1;height:4px;background:var(--card3);border-radius:99px;overflow:hidden">
      <div style="height:100%;width:${widths[score-1]||'0%'};background:${colors[score-1]||'var(--red)'};border-radius:99px;transition:width .3s ease"></div>
    </div>
    <span style="font-size:11px;font-weight:700;color:${colors[score-1]||'var(--red)'}">${labels[score-1]||'Too short'}</span>
  </div>`;
}

/* ────────────────────────────────────────
   FORMAT UTILITIES
──────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}
function initials(name) {
  if (!name) return '?';
  return name.trim().split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}
function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ────────────────────────────────────────
   AVATAR HELPERS
──────────────────────────────────────── */
function setAvatarEl(el, user) {
  if (!el || !user) return;
  el.style.background = DB.AV_COLORS[user.role] || 'var(--blue)';
  el.innerHTML = user.photo
    ? `<img src="${user.photo}" alt="" />`
    : initials(user.name || '?');
}

function avatarHTML(user) {
  const bg = DB.AV_COLORS[user.role] || 'var(--blue)';
  if (user.photo) return `<div class="avatar" style="background:${bg}"><img src="${user.photo}" alt=""/></div>`;
  return `<div class="avatar" style="background:${bg}">${initials(user.name)}</div>`;
}

function statusBadge(s) {
  const m = { Pending:'badge-a', Approved:'badge-g', Rejected:'badge-r', Completed:'badge-p' };
  return `<span class="badge ${m[s]||'badge-b'}">${s}</span>`;
}

/* ────────────────────────────────────────
   PROFILE PHOTO MANAGEMENT
──────────────────────────────────────── */
let _regPhoto   = null;
let _modalPhoto = null;

async function onRegPicChange(input) {
  if (!input.files[0]) return;
  if (input.files[0].size > 5*1024*1024) { toast('Photo must be under 5MB','w'); return; }
  try {
    _regPhoto = await readFileAsDataURL(input.files[0]);
    document.getElementById('reg-pic-av').innerHTML =
      `<img src="${_regPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
    const zone = document.getElementById('reg-pic-zone');
    zone.classList.add('has-pic'); zone.classList.remove('error');
    document.getElementById('reg-pic-label').textContent = 'Photo selected ✓';
    document.getElementById('reg-pic-badge').textContent = '✓ DONE';
  } catch { toast('Could not load photo. Try a smaller file.','w'); }
}

async function onModalPicChange(input) {
  if (!input.files[0]) return;
  if (input.files[0].size > 5*1024*1024) { toast('Photo must be under 5MB','w'); return; }
  try {
    _modalPhoto = await readFileAsDataURL(input.files[0]);
    document.getElementById('m-av-preview').innerHTML =
      `<img src="${_modalPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
    const zone = document.getElementById('m-pic-zone');
    zone.classList.add('has-pic'); zone.classList.remove('error');
    document.getElementById('m-pic-label').textContent = 'Photo selected ✓';
    document.getElementById('m-pic-badge').textContent = '✓ DONE';
  } catch { toast('Could not load photo.','w'); }
}

async function previewEditUserPic(input) {
  if (!input.files[0]) return;
  const data = await readFileAsDataURL(input.files[0]);
  document.getElementById('eu-av-preview').innerHTML =
    `<img src="${data}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
}

async function updateProfilePic(input) {
  if (!input.files[0] || !DB.STATE.currentUser) return;
  if (input.files[0].size > 5*1024*1024) { toast('Photo must be under 5MB','w'); return; }
  try {
    const data = await readFileAsDataURL(input.files[0]);
    DB.updateUser(DB.STATE.currentUser.id, { photo: data });
    updateAvatarsEverywhere();
    toast('Profile picture updated');
  } catch { toast('Photo too large. Try a smaller image.','w'); }
}

function removeProfilePic() {
  if (!DB.STATE.currentUser) return;
  DB.updateUser(DB.STATE.currentUser.id, { photo: null });
  updateAvatarsEverywhere();
  toast('Profile picture removed','i');
}

function updateAvatarsEverywhere() {
  const u = DB.STATE.currentUser;
  setAvatarEl(document.getElementById('sb-av'), u);
  setAvatarEl(document.getElementById('topbar-av'), u);
  const profAv = document.getElementById('profile-av');
  if (profAv) {
    profAv.style.background = DB.AV_COLORS[u.role] || 'var(--blue)';
    profAv.innerHTML = u.photo
      ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/><div class="av-overlay">✏️</div>`
      : `<span>${initials(u.name)}</span><div class="av-overlay">✏️</div>`;
  }
  const setAv = document.getElementById('set-av-preview');
  if (setAv) setAv.innerHTML = u.photo
    ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : '👤';
}

/* ────────────────────────────────────────
   SETUP MODE & ADMIN ROLE GATING
──────────────────────────────────────── */
function applySetupMode() {
  const setup   = !DB.adminExists();
  const banner  = document.getElementById('setup-banner');
  const roleGrp = document.getElementById('fg-r-role');
  const tabs    = document.getElementById('auth-tabs');
  const loginLink = document.getElementById('login-register-link');

  if (setup) {
    banner.style.display = 'flex';
    if (roleGrp) roleGrp.style.display = 'none';
    authTabName('reg');
    if (tabs) tabs.style.display = 'none';
    if (loginLink) loginLink.style.display = 'none';
    document.getElementById('auth-sub-line').textContent = 'First-time setup · Create the Administrator account';
    document.getElementById('reg-submit-btn').textContent = 'Create Administrator account →';
  } else {
    banner.style.display = 'none';
    if (roleGrp) roleGrp.style.display = '';
    if (tabs) tabs.style.display = '';
    if (loginLink) loginLink.style.display = '';
    document.getElementById('auth-sub-line').textContent = 'Role-Based Management System · v7';
    document.getElementById('reg-submit-btn').textContent = 'Create account →';
  }
}

function applyAdminRoleGating() {
  const isAdmin = DB.STATE.currentUser?.role === 'admin';
  ['r-role','m-role','eu-role'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const existing = sel.querySelector('option[value="admin"]');
    if (existing) existing.remove();
    if (isAdmin) {
      const opt = document.createElement('option');
      opt.value = 'admin'; opt.textContent = 'Administrator';
      sel.appendChild(opt);
    }
  });
}

function onRegRoleChange(sel) {
  if (sel.value === 'admin' && DB.STATE.currentUser?.role !== 'admin') {
    sel.value = 'user';
    toast('Only Administrators can assign the Administrator role.','w');
  }
}

/* ────────────────────────────────────────
   AUTH — TAB SWITCHING
──────────────────────────────────────── */
function authTab(tab, el) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('auth-login').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('auth-reg').style.display   = tab === 'reg'   ? '' : 'none';
}

function authTabName(tab) {
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(t => t.classList.remove('on'));
  if (tab === 'login') {
    tabs[0]?.classList.add('on');
    document.getElementById('auth-login').style.display = '';
    document.getElementById('auth-reg').style.display   = 'none';
  } else {
    tabs[1]?.classList.add('on');
    document.getElementById('auth-login').style.display = 'none';
    document.getElementById('auth-reg').style.display   = '';
  }
}

/* ────────────────────────────────────────
   AUTH — LOGIN
──────────────────────────────────────── */
function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  const ok = validateFields([
    { id:'l-email', group:'fg-l-email', val:email, test:v => EMAIL_RE.test(v), msg:'Enter a valid email address.' },
    { id:'l-pass',  group:'fg-l-pass',  val:pass,  test:v => v.length >= 1,    msg:'Password is required.' },
  ]);
  if (!ok) return;
  const user = DB.STATE.users.find(u =>
    u.email.toLowerCase() === email.toLowerCase() && u.password === pass
  );
  if (!user) { setFieldError('l-pass','fg-l-pass','Invalid email or password.'); return; }
  if (user.status === 'inactive') { toast('Account inactive. Contact administrator.','e'); return; }
  loginUser(user);
}

/* ────────────────────────────────────────
   AUTH — REGISTER
──────────────────────────────────────── */
async function doRegister() {
  const isSetup = !DB.adminExists();
  const fn    = document.getElementById('r-fn').value.trim();
  const ln    = document.getElementById('r-ln').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const phone = document.getElementById('r-phone').value.trim();
  const role  = isSetup ? 'admin' : (document.getElementById('r-role')?.value || 'user');
  const pass  = document.getElementById('r-pass').value;
  const pass2 = document.getElementById('r-pass2').value;

  if (!_regPhoto) {
    const zone = document.getElementById('reg-pic-zone');
    zone.classList.add('error');
    setTimeout(() => zone.classList.remove('error'), 800);
    toast('Profile photo is required','w');
    return;
  }
  if (!isSetup && role === 'admin' && DB.STATE.currentUser?.role !== 'admin') {
    toast('Only Administrators can assign the Administrator role.','w');
    document.getElementById('r-role').value = 'user';
    return;
  }

  const checks = [
    { id:'r-fn',    group:'fg-r-fn',    val:fn,    test:v=>v.length>=2,       msg:'First name must be at least 2 characters.' },
    { id:'r-ln',    group:'fg-r-ln',    val:ln,    test:v=>v.length>=2,       msg:'Last name must be at least 2 characters.' },
    { id:'r-email', group:'fg-r-email', val:email, test:v=>EMAIL_RE.test(v),  msg:'Enter a valid email address.' },
    { id:'r-pass',  group:'fg-r-pass',  val:pass,  test:v=>v.length>=8,       msg:'Password must be at least 8 characters.' },
    { id:'r-pass2', group:'fg-r-pass2', val:pass2, test:v=>v===pass,          msg:'Passwords do not match.' },
  ];
  if (phone) checks.push({ id:'r-phone', group:'fg-r-phone', val:phone, test:v=>PHONE_RE.test(v), msg:'Enter a valid phone number.' });
  if (!validateFields(checks)) return;

  if (DB.findUserByEmail(email)) { setFieldError('r-email','fg-r-email','This email is already registered.'); return; }

  const user = DB.createUser({ name: fn+' '+ln, email, phone, role, password: pass, photo: _regPhoto });
  DB.addLog(user.name, role, isSetup ? 'Created Administrator account (setup)' : 'Registered account', 'Auth');
  toast(isSetup ? 'Administrator account created! Signing you in…' : 'Account created! Signing you in…','s');
  _regPhoto = null;
  setTimeout(() => loginUser(user), 800);
}

/* ────────────────────────────────────────
   LOGIN / LOGOUT
──────────────────────────────────────── */
function loginUser(user) {
  DB.STATE.currentUser = user;
  DB.persist();
  document.getElementById('page-auth').style.display = 'none';
  document.getElementById('dash').classList.add('on');
  applyAdminRoleGating();
  buildSidebar();
  refreshUI();
  gotoSection('overview');
  DB.addLog(user.name, user.role, 'Signed in', 'Auth');
}

function doLogout() {
  DB.addLog(DB.STATE.currentUser?.name||'Unknown', DB.STATE.currentUser?.role||'?', 'Signed out', 'Auth');
  DB.clearSession();
  document.getElementById('dash').classList.remove('on');
  document.getElementById('page-auth').style.display = '';
  applySetupMode();
  toast('Signed out','i');
}

/* ────────────────────────────────────────
   SIDEBAR
──────────────────────────────────────── */
const NAV = {
  admin:   [
    { id:'overview',      icon:'🏠', label:'Overview' },
    { id:'analytics',     icon:'📊', label:'Analytics' },
    { id:'reports',       icon:'📥', label:'Reports' },        // ← admin only
    { id:'requests',      icon:'📋', label:'All Requests' },
    { id:'users',         icon:'👥', label:'Users' },
    { id:'logs',          icon:'🔍', label:'Audit Log' },
    { id:'notifications', icon:'🔔', label:'Notifications' },
    { id:'settings',      icon:'⚙️', label:'Settings' },
  ],
  manager: [
    { id:'overview',      icon:'🏠', label:'Overview' },
    { id:'analytics',     icon:'📊', label:'Analytics' },
    { id:'reports',       icon:'📥', label:'Reports' },        // ← manager too
    { id:'requests',      icon:'📋', label:'All Requests' },
    { id:'users',         icon:'👥', label:'Team' },
    { id:'notifications', icon:'🔔', label:'Notifications' },
    { id:'settings',      icon:'⚙️', label:'Settings' },
  ],
  staff: [
    { id:'overview',      icon:'🏠', label:'Overview' },
    { id:'new-request',   icon:'➕', label:'New Request' },
    { id:'my-requests',   icon:'📁', label:'My Requests' },
    { id:'tasks',         icon:'✅', label:'Tasks' },
    { id:'notifications', icon:'🔔', label:'Notifications' },
    { id:'settings',      icon:'⚙️', label:'Settings' },
  ],
  user: [
    { id:'overview',      icon:'🏠', label:'Overview' },
    { id:'new-request',   icon:'➕', label:'New Request' },
    { id:'my-requests',   icon:'📁', label:'My Requests' },
    { id:'notifications', icon:'🔔', label:'Notifications' },
    { id:'settings',      icon:'⚙️', label:'Settings' },
  ],
};

function buildSidebar() {
  const u = DB.STATE.currentUser;
  const items = NAV[u.role] || NAV.user;
  document.getElementById('sb-nav').innerHTML =
    `<div class="sb-section">Navigation</div>` +
    items.map(i => {
      const unread = i.id === 'notifications'
        ? DB.getUnreadCount(u.id)
        : 0;
      return `<div class="sb-item" id="sb-${i.id}" onclick="gotoSection('${i.id}')">
        <span class="sb-icon">${i.icon}</span>
        <span class="sb-label">${i.label}</span>
        ${unread ? `<span class="sb-badge">${unread}</span>` : ''}
      </div>`;
    }).join('');

  document.getElementById('sb-name').textContent = u.name;
  document.getElementById('sb-role').textContent = DB.ROLE_LABELS[u.role];
  setAvatarEl(document.getElementById('sb-av'), u);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

/* ────────────────────────────────────────
   NAVIGATION
──────────────────────────────────────── */
const TITLES = {
  overview:'Overview', analytics:'Analytics', reports:'Reports',
  requests:'All Requests', users:'User Management',
  'new-request':'New Request', 'my-requests':'My Requests',
  notifications:'Notifications', logs:'Audit Log',
  tasks:'My Tasks', settings:'Settings', profile:'Profile',
};

function gotoSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.sb-item').forEach(s => s.classList.remove('on'));
  const sec = document.getElementById(`s-${id}`);
  if (sec) sec.classList.add('on');
  const sb = document.getElementById(`sb-${id}`);
  if (sb) sb.classList.add('on');
  document.getElementById('page-title').textContent = TITLES[id] || id;
  renderSection(id);
}

function renderSection(id) {
  const u = DB.STATE.currentUser;
  if (!u) return;
  if (id === 'overview')       renderOverview();
  if (id === 'analytics')      renderAnalytics();
  if (id === 'reports')        renderReports();
  if (id === 'users' && DB.ROLES[u.role] <= 2) renderUsers();
  if (id === 'requests' && DB.ROLES[u.role] <= 2) renderAllRequests();
  if (id === 'my-requests')    renderMyRequests();
  if (id === 'new-request')    { selectReqType(DB.STATE.currentReqType, document.querySelector('.req-type-btn.sel')); renderSidebarRequests(); }
  if (id === 'notifications')  renderNotifications();
  if (id === 'logs' && u.role === 'admin') renderLogs();
  if (id === 'tasks')          renderTasks();
  if (id === 'settings')       renderSettings();
  if (id === 'profile')        renderProfile();
}

/* ────────────────────────────────────────
   THEME
──────────────────────────────────────── */
function toggleTheme() {
  DB.STATE.theme = DB.STATE.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', DB.STATE.theme);
  DB.persist();
  refreshUI();
  Object.values(DB.STATE.charts).forEach(c => c.destroy());
  DB.STATE.charts = {};
  const active = document.querySelector('.section.on');
  if (active) renderSection(active.id.replace('s-',''));
}

function refreshUI() {
  const u = DB.STATE.currentUser;
  if (!u) return;
  setAvatarEl(document.getElementById('topbar-av'), u);
  const unread = DB.getUnreadCount(u.id);
  document.getElementById('notif-dot').style.display = unread ? '' : 'none';
  const dt = document.getElementById('dark-toggle');
  if (dt) { DB.STATE.theme === 'dark' ? dt.classList.add('on') : dt.classList.remove('on'); }
  document.getElementById('theme-btn').textContent = DB.STATE.theme === 'dark' ? '🌙' : '☀️';
}

/* ────────────────────────────────────────
   CHART HELPERS
──────────────────────────────────────── */
function tickColor() { return DB.STATE.theme === 'dark' ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.3)'; }
function gridColor() { return DB.STATE.theme === 'dark' ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; }

function noDataOverlay(wrapId, message) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.innerHTML = `<div class="no-chart-data"><div class="ncd-icon">📊</div><div>${message}</div></div>`;
}

function ensureCanvas(wrapId, canvasId) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return null;
  if (!wrap.querySelector('canvas')) wrap.innerHTML = `<canvas id="${canvasId}"></canvas>`;
  return document.getElementById(canvasId);
}

/* ────────────────────────────────────────
   OVERVIEW SECTION
──────────────────────────────────────── */
function renderOverview() {
  const u    = DB.STATE.currentUser;
  const reqs = (u.role === 'admin' || u.role === 'manager')
    ? DB.getAllRequests()
    : DB.getRequestsForUser(u.id);

  const stats = {
    total:     reqs.length,
    pending:   reqs.filter(r => r.status === 'Pending').length,
    approved:  reqs.filter(r => r.status === 'Approved').length,
    completed: reqs.filter(r => r.status === 'Completed').length,
  };

  document.getElementById('metric-cards').innerHTML = [
    { label:'Total Requests', val:stats.total,     icon:'📋', accent:'var(--blue)',   delta:'All time' },
    { label:'Pending',        val:stats.pending,   icon:'⏳', accent:'var(--amber)',  delta:'Awaiting action' },
    { label:'Approved',       val:stats.approved,  icon:'✅', accent:'var(--green)',  delta:'Approved' },
    { label:'Completed',      val:stats.completed, icon:'🏁', accent:'var(--purple)', delta:'Completed' },
  ].map(m => `<div class="metric-card" style="--card-accent:${m.accent}">
    <div class="mc-icon">${m.icon}</div>
    <div class="mc-label">${m.label}</div>
    <div class="mc-val">${m.val}</div>
    <div class="mc-delta">${m.delta}</div>
  </div>`).join('');

  renderLineChart(reqs);
  renderDonutChart(reqs);
  renderRecentRequests(reqs);
}

function renderLineChart(reqs) {
  const ctx = ensureCanvas('lineChartWrap','lineChart');
  if (!ctx) return;
  if (!reqs.length) { noDataOverlay('lineChartWrap','No activity data yet'); if (DB.STATE.charts.line) { DB.STATE.charts.line.destroy(); delete DB.STATE.charts.line; } return; }
  if (DB.STATE.charts.line) DB.STATE.charts.line.destroy();
  const dayCount = DB.STATE.activePeriod === '90d' ? 90 : DB.STATE.activePeriod === '30d' ? 30 : 7;
  const { labels, counts } = DB.bucketByDay(reqs, dayCount);
  DB.STATE.charts.line = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label:'Requests', data:counts, borderColor:'var(--blue)', backgroundColor:'rgba(79,142,247,.08)', tension:.4, fill:true, pointRadius:4, pointBackgroundColor:'var(--blue)' }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:gridColor()},ticks:{color:tickColor(),font:{size:11},maxTicksLimit:10}}, y:{grid:{color:gridColor()},ticks:{color:tickColor(),font:{size:11},stepSize:1},beginAtZero:true} } }
  });
}

function renderDonutChart(reqs) {
  const ctx = ensureCanvas('donutChartWrap','donutChart');
  if (!ctx) return;
  if (!reqs.length) { noDataOverlay('donutChartWrap','No requests to display'); if (DB.STATE.charts.donut) { DB.STATE.charts.donut.destroy(); delete DB.STATE.charts.donut; } return; }
  if (DB.STATE.charts.donut) DB.STATE.charts.donut.destroy();
  DB.STATE.charts.donut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending','Approved','Rejected','Completed'],
      datasets: [{ data: ['Pending','Approved','Rejected','Completed'].map(s => reqs.filter(r=>r.status===s).length), backgroundColor:['rgba(251,191,36,.7)','rgba(52,211,153,.7)','rgba(248,113,113,.7)','rgba(167,139,250,.7)'], borderWidth:0, hoverOffset:6 }]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom',labels:{color:tickColor(),font:{size:11},padding:12}}}, cutout:'70%' }
  });
}

function renderRecentRequests(reqs) {
  const tbody  = document.getElementById('req-tbody');
  const recent = [...reqs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  if (!recent.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No requests yet</div><div class="empty-sub">Submit your first request to get started.</div></div></td></tr>`; return; }
  tbody.innerHTML = recent.map(r =>
    `<tr><td class="cell-mono">${r.ref}</td><td>${r.type}</td><td>${r.userName}</td><td>${fmtDate(r.date)}</td><td>${statusBadge(r.status)}</td><td><button class="btn btn-g btn-sm" onclick="viewRequest('${r.id}')">View</button></td></tr>`
  ).join('');
}

/* ────────────────────────────────────────
   ANALYTICS SECTION
──────────────────────────────────────── */
function renderAnalytics() {
  const reqs      = DB.getAllRequests();
  const thisMonth = DB.getMonthRequests(reqs, 0);
  const lastMonth = DB.getMonthRequests(reqs, 1);

  document.getElementById('analytics-kpis').innerHTML = [
    { val:reqs.length,                                      label:'Total' },
    { val:reqs.filter(r=>r.status==='Pending').length,      label:'Pending' },
    { val:reqs.filter(r=>r.status==='Approved').length,     label:'Approved' },
  ].map(k=>`<div class="kpi-mini"><div class="kpi-mini-val">${k.val}</div><div class="kpi-mini-label">${k.label}</div></div>`).join('');

  // Bar — requests per month
  const bc = ensureCanvas('barChartWrap','barChart');
  if (bc) {
    if (!reqs.length) { noDataOverlay('barChartWrap','No requests to chart yet'); if (DB.STATE.charts.bar){DB.STATE.charts.bar.destroy();delete DB.STATE.charts.bar;} }
    else {
      if (DB.STATE.charts.bar) DB.STATE.charts.bar.destroy();
      const { labels, counts } = DB.bucketByMonth(reqs);
      DB.STATE.charts.bar = new Chart(bc, { type:'bar', data:{labels,datasets:[{label:'Requests',data:counts,backgroundColor:'rgba(79,142,247,.6)',borderRadius:6}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:tickColor(),font:{size:11}}},y:{grid:{color:gridColor()},ticks:{color:tickColor(),font:{size:11},stepSize:1},beginAtZero:true}}} });
    }
  }

  // Bar — by category
  const cc = ensureCanvas('catChartWrap','catChart');
  if (cc) {
    if (!reqs.length) { noDataOverlay('catChartWrap','No categories yet'); if (DB.STATE.charts.cat){DB.STATE.charts.cat.destroy();delete DB.STATE.charts.cat;} }
    else {
      if (DB.STATE.charts.cat) DB.STATE.charts.cat.destroy();
      const typeMap = {};
      reqs.forEach(r => { typeMap[r.type]=(typeMap[r.type]||0)+1; });
      const types  = Object.keys(typeMap);
      const counts = types.map(t=>typeMap[t]);
      DB.STATE.charts.cat = new Chart(cc, { type:'bar', data:{labels:types,datasets:[{label:'Count',data:counts,backgroundColor:'rgba(167,139,250,.6)',borderRadius:6}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:tickColor(),font:{size:11}}},y:{grid:{color:gridColor()},ticks:{color:tickColor(),font:{size:11},stepSize:1},beginAtZero:true}},indexAxis:'y'} });
    }
  }

  // Performance table
  const metrics = [
    { name:'Total requests', curr:thisMonth.length,                                       prev:lastMonth.length },
    { name:'Pending',        curr:thisMonth.filter(r=>r.status==='Pending').length,       prev:lastMonth.filter(r=>r.status==='Pending').length },
    { name:'Approved',       curr:thisMonth.filter(r=>r.status==='Approved').length,      prev:lastMonth.filter(r=>r.status==='Approved').length },
    { name:'Rejected',       curr:thisMonth.filter(r=>r.status==='Rejected').length,      prev:lastMonth.filter(r=>r.status==='Rejected').length },
  ];
  document.getElementById('analytics-tbody').innerHTML = metrics.map(m => {
    const d = m.curr - m.prev;
    return `<tr><td>${m.name}</td><td>${m.curr}</td><td>${m.prev}</td><td>${d>=0?'+':''}${d}</td><td><span style="color:${d>0?'var(--green)':d<0?'var(--red)':'var(--text-3)'}">${d>0?'▲':d<0?'▼':'—'} ${Math.abs(d)}</span></td></tr>`;
  }).join('');
}

/* ────────────────────────────────────────
   REPORTS SECTION
   ⚠️  Only visible to admin + manager.
       DB.canDownloadReports() enforces access.
──────────────────────────────────────── */
function renderReports() {
  const u = DB.STATE.currentUser;
  const container = document.getElementById('s-reports');
  if (!container) return;

  /* Hard gate — redirect non-privileged users away */
  if (!DB.canDownloadReports(u)) {
    container.innerHTML = `<div class="empty">
      <div class="empty-icon">🔒</div>
      <div class="empty-title">Access Restricted</div>
      <div class="empty-sub">Report downloads are only available to Administrators and Managers.</div>
    </div>`;
    return;
  }

  const reqs  = DB.getAllRequests();
  const users = DB.STATE.users;
  const logs  = DB.STATE.auditLog;

  container.innerHTML = `
    <div class="report-card">
      <div class="report-card-title">📥 Download Reports</div>
      <div class="report-card-sub">Export system data as CSV files. Only visible to Administrators and Managers.</div>
      <div class="report-grid">
        <div class="report-btn-card" onclick="downloadReport('requests')">
          <div class="rb-icon">📋</div>
          <div class="rb-label">Requests Report</div>
          <div class="rb-sub">${reqs.length} records · CSV</div>
        </div>
        <div class="report-btn-card" onclick="downloadReport('users')">
          <div class="rb-icon">👥</div>
          <div class="rb-label">Users Report</div>
          <div class="rb-sub">${users.length} records · CSV</div>
        </div>
        <div class="report-btn-card" onclick="downloadReport('audit')">
          <div class="rb-icon">🔍</div>
          <div class="rb-label">Audit Log Export</div>
          <div class="rb-sub">${logs.length} records · CSV</div>
        </div>
      </div>
    </div>

    <!-- Live preview table (requests) -->
    <div class="tbl-wrap">
      <div class="tbl-head">
        <div class="tbl-title">Requests Preview</div>
        <div class="tbl-acts">
          <input class="tbl-search" placeholder="Filter…" oninput="filterTbl(this,'rpt-tbody')" />
          <select class="fc" style="width:140px;padding:7px 10px" onchange="filterReportStatus(this.value)">
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
          </select>
          <button class="btn btn-teal btn-sm" onclick="downloadReport('requests')">⬇ Download CSV</button>
        </div>
      </div>
      <table class="data-tbl">
        <thead><tr>
          <th>Ref</th><th>Type</th><th>Sub-Type</th><th>Requester</th>
          <th>Date</th><th>Status</th><th>Notes</th>
        </tr></thead>
        <tbody id="rpt-tbody">
          ${reqs.length === 0
            ? `<tr><td colspan="7"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No requests</div></div></td></tr>`
            : reqs.map(r => `<tr>
                <td class="cell-mono">${r.ref}</td>
                <td>${r.type}</td>
                <td>${r.subType||'—'}</td>
                <td>${r.userName}</td>
                <td>${fmtDate(r.date)}</td>
                <td>${statusBadge(r.status)}</td>
                <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-2)">${r.notes||'—'}</td>
              </tr>`).join('')
          }
        </tbody>
      </table>
    </div>`;
}

/**
 * downloadReport(type)
 * Called from report buttons. Double-checks access before generating file.
 */
function downloadReport(type) {
  const u = DB.STATE.currentUser;
  if (!DB.canDownloadReports(u)) {
    toast('Access denied — Admins and Managers only.','e');
    return;
  }
  const { filename, csv } = DB.generateCSVReport(type);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  DB.addLog(u.name, u.role, `Downloaded report: ${filename}`, 'Reports');
  toast(`Downloaded: ${filename}`,'s');
}

function filterReportStatus(val) {
  document.querySelectorAll('#rpt-tbody tr').forEach(row => {
    row.style.display = !val || row.innerText.includes(val) ? '' : 'none';
  });
}

/* ────────────────────────────────────────
   USERS SECTION
──────────────────────────────────────── */
let _uf = 'all';

function filterUsers(role, el) {
  _uf = role;
  document.querySelectorAll('.ufilter').forEach(f => f.classList.remove('on'));
  el.classList.add('on');
  renderUsers();
}

function renderUsers() {
  const users = DB.getUsersByRole(_uf);
  const tbody = document.getElementById('users-tbody');
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><div class="empty-icon">👥</div><div class="empty-title">No users found</div><div class="empty-sub">Add users with the button above.</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `<tr>
    <td><div style="display:flex;align-items:center;gap:10px">${avatarHTML(u)}<div><div style="font-weight:600">${u.name}</div><div style="font-size:11px;color:var(--text-3)">${u.phone||'—'}</div></div></div></td>
    <td>${u.email}</td>
    <td><span class="role-tag role-${u.role}">${DB.ROLE_LABELS[u.role]}</span></td>
    <td><span class="badge ${u.status==='active'?'badge-g':'badge-r'}">${u.status}</span></td>
    <td>${fmtDate(u.joined)}</td>
    <td><div style="display:flex;gap:6px">
      <button class="btn btn-g btn-sm" onclick="openEditUser('${u.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Remove</button>
    </div></td>
  </tr>`).join('');
}

/* ── ADD USER ── */
function addUser() {
  const fn    = document.getElementById('m-fn').value.trim();
  const ln    = document.getElementById('m-ln').value.trim();
  const email = document.getElementById('m-email').value.trim();
  const phone = document.getElementById('m-phone').value.trim();
  const role  = document.getElementById('m-role').value;
  const pass  = document.getElementById('m-pass').value;

  if (!_modalPhoto) {
    const z = document.getElementById('m-pic-zone');
    z.classList.add('error');
    setTimeout(()=>z.classList.remove('error'),800);
    toast('Profile photo is required','w');
    return;
  }
  if (role === 'admin' && DB.STATE.currentUser?.role !== 'admin') {
    toast('Only Administrators can assign the Administrator role.','w');
    document.getElementById('m-role').value = 'user';
    return;
  }

  const checks = [
    { id:'m-fn',    group:'fg-m-fn',    val:fn,    test:v=>v.length>=2,      msg:'First name must be at least 2 characters.' },
    { id:'m-ln',    group:'fg-m-ln',    val:ln,    test:v=>v.length>=2,      msg:'Last name must be at least 2 characters.' },
    { id:'m-email', group:'fg-m-email', val:email, test:v=>EMAIL_RE.test(v), msg:'Enter a valid email address.' },
    { id:'m-pass',  group:'fg-m-pass',  val:pass,  test:v=>v.length>=8,      msg:'Password must be at least 8 characters.' },
  ];
  if (phone) checks.push({ id:'m-phone', group:'fg-m-phone', val:phone, test:v=>PHONE_RE.test(v), msg:'Enter a valid phone number.' });
  if (!validateFields(checks)) return;
  if (DB.findUserByEmail(email)) { setFieldError('m-email','fg-m-email','This email is already registered.'); return; }

  const user = DB.createUser({ name:fn+' '+ln, email, phone, role, password:pass, photo:_modalPhoto });
  DB.addLog(DB.STATE.currentUser.name, DB.STATE.currentUser.role, `Created user: ${user.name}`, 'Users');

  closeModal('add-user');
  ['m-fn','m-ln','m-email','m-phone','m-pass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
    clearFieldError(id,'fg-'+id);
  });
  document.getElementById('m-av-preview').innerHTML = '👤';
  document.getElementById('m-pic-zone').classList.remove('has-pic');
  document.getElementById('m-pic-label').textContent = 'Upload profile photo';
  document.getElementById('m-pic-badge').textContent = 'REQUIRED';
  document.getElementById('m-pass-strength').innerHTML = '';
  _modalPhoto = null;
  renderUsers();
  toast('User created','s');
}

function openEditUser(id) {
  const u = DB.findUserById(id);
  if (!u) return;
  document.getElementById('eu-id').value    = id;
  document.getElementById('eu-name').value  = u.name;
  document.getElementById('eu-email').value = u.email;
  applyAdminRoleGating();
  document.getElementById('eu-role').value   = u.role;
  document.getElementById('eu-status').value = u.status;
  const prev = document.getElementById('eu-av-preview');
  prev.innerHTML = u.photo
    ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : '👤';
  ['eu-name','eu-email'].forEach(fid => clearFieldError(fid,'fg-'+fid));
  openModal('edit-user');
}

function saveEditUser() {
  const id    = document.getElementById('eu-id').value;
  const name  = document.getElementById('eu-name').value.trim();
  const email = document.getElementById('eu-email').value.trim();
  const role  = document.getElementById('eu-role').value;

  if (role === 'admin' && DB.STATE.currentUser?.role !== 'admin') {
    toast('Only Administrators can assign the Administrator role.','w');
    const u = DB.findUserById(id);
    document.getElementById('eu-role').value = u?.role || 'user';
    return;
  }

  const checks = [
    { id:'eu-name',  group:'fg-eu-name',  val:name,  test:v=>v.length>=2,      msg:'Name must be at least 2 characters.' },
    { id:'eu-email', group:'fg-eu-email', val:email, test:v=>EMAIL_RE.test(v), msg:'Enter a valid email address.' },
  ];
  if (!validateFields(checks)) return;

  const conflict = DB.STATE.users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.id !== id);
  if (conflict) { setFieldError('eu-email','fg-eu-email','This email is already used by another user.'); return; }

  const pi = document.getElementById('eu-pic');
  const doSave = (photo) => {
    DB.updateUser(id, { name, email, role, status: document.getElementById('eu-status').value, ...(photo !== undefined ? { photo } : {}) });
    DB.addLog(DB.STATE.currentUser.name, DB.STATE.currentUser.role, `Updated user: ${name}`, 'Users');
    renderUsers();
    refreshUI();
    closeModal('edit-user');
    toast('User updated','s');
  };

  if (pi.files && pi.files[0]) {
    readFileAsDataURL(pi.files[0]).then(data => doSave(data));
  } else {
    doSave(undefined);
  }
}

function deleteUser(id) {
  if (!confirm('Remove this user? This cannot be undone.')) return;
  const u = DB.findUserById(id);
  DB.removeUser(id);
  DB.addLog(DB.STATE.currentUser.name, DB.STATE.currentUser.role, `Removed user: ${u?.name||id}`, 'Users');
  renderUsers();
  toast('User removed','i');
}

/* ────────────────────────────────────────
   REQUEST FORMS
──────────────────────────────────────── */
const REQ_FORMS = {
  booking: `
    <div class="fr"><div class="fg"><label>Vehicle type / plate</label><input class="fc" id="rf-vehicle" placeholder="e.g. RAB 123A / Land Cruiser"/></div><div class="fg"><label>Date needed</label><input class="fc" type="date" id="rf-date"/></div></div>
    <div class="fr"><div class="fg"><label>Departure point</label><input class="fc" id="rf-from" placeholder="Starting location"/></div><div class="fg"><label>Destination</label><input class="fc" id="rf-to" placeholder="Destination"/></div></div>
    <div class="fr"><div class="fg"><label>Departure time</label><input class="fc" type="time" id="rf-time"/></div><div class="fg"><label>No. of passengers</label><input class="fc" type="number" id="rf-pax" placeholder="e.g. 4" min="1"/></div></div>`,

  fuel: `
    <div class="fr"><div class="fg"><label>Vehicle plate</label><input class="fc" id="rf-vehicle" placeholder="e.g. RAB 123A"/></div><div class="fg"><label>Fuel type</label><select class="fc" id="rf-ftype"><option>Petrol</option><option>Diesel</option></select></div></div>
    <div class="fr"><div class="fg"><label>Amount (litres)</label><input class="fc" type="number" id="rf-litres" placeholder="e.g. 40" min="1"/></div><div class="fg"><label>Date required</label><input class="fc" type="date" id="rf-date"/></div></div>
    <div class="fg"><label>Odometer reading (km)</label><input class="fc" id="rf-odometer" placeholder="Current mileage"/></div>`,

  service: `
    <div class="section-label" style="margin-bottom:8px">Service sub-type</div>
    <div class="service-sub-grid" id="service-sub-grid">
      <div class="ssb sel" data-sub="vehicle_maintenance" onclick="selectServiceSub('vehicle_maintenance',this)"><span class="ss-icon">🚗</span>Vehicle Maintenance</div>
      <div class="ssb" data-sub="car_wash" onclick="selectServiceSub('car_wash',this)"><span class="ss-icon">🫧</span>Car Wash</div>
      <div class="ssb" data-sub="generator" onclick="selectServiceSub('generator',this)"><span class="ss-icon">⚡</span>Generator Service</div>
      <div class="ssb" data-sub="cleaning" onclick="selectServiceSub('cleaning',this)"><span class="ss-icon">🧹</span>Cleaning Service</div>
      <div class="ssb" data-sub="security" onclick="selectServiceSub('security',this)"><span class="ss-icon">🔐</span>Security Service</div>
      <div class="ssb" data-sub="plumbing" onclick="selectServiceSub('plumbing',this)"><span class="ss-icon">🔧</span>Plumbing / Electrical</div>
      <div class="ssb" data-sub="catering" onclick="selectServiceSub('catering',this)"><span class="ss-icon">🍽️</span>Catering Service</div>
      <div class="ssb" data-sub="printing" onclick="selectServiceSub('printing',this)"><span class="ss-icon">🖨️</span>Printing / Binding</div>
      <div class="ssb" data-sub="other_service" onclick="selectServiceSub('other_service',this)"><span class="ss-icon">📋</span>Other Service</div>
    </div>
    <div id="service-sub-form"></div>`,

  travel: `
    <div class="fr"><div class="fg"><label>Destination</label><input class="fc" id="rf-dest" placeholder="City / country"/></div><div class="fg"><label>Travel date</label><input class="fc" type="date" id="rf-date"/></div></div>
    <div class="fr"><div class="fg"><label>Return date</label><input class="fc" type="date" id="rf-ret"/></div><div class="fg"><label>Travel mode</label><select class="fc" id="rf-tmode"><option>Road</option><option>Air</option><option>Bus</option><option>Motorbike</option></select></div></div>
    <div class="fr"><div class="fg"><label>Per diem (days)</label><input class="fc" type="number" id="rf-days" placeholder="e.g. 3" min="1"/></div><div class="fg"><label>Purpose</label><input class="fc" id="rf-purpose" placeholder="Reason for travel"/></div></div>`,

  procurement: `
    <div class="fg"><label>Item(s) to purchase</label><input class="fc" id="rf-items" placeholder="List the items needed"/></div>
    <div class="fr"><div class="fg"><label>Quantity</label><input class="fc" id="rf-qty" placeholder="e.g. 10 units"/></div><div class="fg"><label>Estimated cost (RWF)</label><input class="fc" type="number" id="rf-cost" placeholder="e.g. 50000"/></div></div>
    <div class="fr"><div class="fg"><label>Supplier / vendor</label><input class="fc" id="rf-supplier" placeholder="Suggested supplier (optional)"/></div><div class="fg"><label>Date needed by</label><input class="fc" type="date" id="rf-date"/></div></div>`,

  leave: `
    <div class="fr"><div class="fg"><label>Leave type</label><select class="fc" id="rf-ltype"><option>Annual Leave</option><option>Sick Leave</option><option>Personal Leave</option><option>Maternity / Paternity</option><option>Compassionate Leave</option><option>Study Leave</option></select></div><div class="fg"><label>No. of days</label><input class="fc" type="number" id="rf-days" placeholder="e.g. 5" min="1"/></div></div>
    <div class="fr"><div class="fg"><label>Start date</label><input class="fc" type="date" id="rf-start"/></div><div class="fg"><label>End date</label><input class="fc" type="date" id="rf-end"/></div></div>
    <div class="fg"><label>Acting officer (if applicable)</label><input class="fc" id="rf-acting" placeholder="Name of covering staff"/></div>`,

  advance: `
    <div class="fr"><div class="fg"><label>Purpose of advance</label><input class="fc" id="rf-purpose" placeholder="What is it for?"/></div><div class="fg"><label>Amount requested (RWF)</label><input class="fc" type="number" id="rf-amount" placeholder="e.g. 100000" min="0"/></div></div>
    <div class="fr"><div class="fg"><label>Date needed</label><input class="fc" type="date" id="rf-date"/></div><div class="fg"><label>Expected repayment date</label><input class="fc" type="date" id="rf-repay"/></div></div>`,

  it: `
    <div class="fg"><label>Issue type</label><select class="fc" id="rf-issue"><option>Hardware Problem</option><option>Software / System Error</option><option>Network / Connectivity</option><option>New Equipment Request</option><option>Account / Access Issue</option><option>Printer / Scanner</option><option>Phone / Communication</option><option>Other IT Issue</option></select></div>
    <div class="fg"><label>Equipment / asset affected</label><input class="fc" id="rf-asset" placeholder="e.g. Laptop, Dell XPS, SN: 12345"/></div>
    <div class="fg"><label>Urgency</label><select class="fc" id="rf-urgency"><option>Low — Can wait</option><option>Medium — Within 2 days</option><option>High — Urgent</option><option>Critical — Blocking work</option></select></div>`,
};

/* Service sub-type forms — Car Wash included */
const SERVICE_FORMS = {
  vehicle_maintenance: `
    <div class="fr"><div class="fg"><label>Vehicle plate</label><input class="fc" id="sf-vehicle" placeholder="e.g. RAB 123A"/></div><div class="fg"><label>Maintenance type</label><select class="fc" id="sf-mtype"><option>Oil change</option><option>Tyre replacement</option><option>Battery</option><option>Brake service</option><option>Full service</option><option>Repair / diagnostics</option></select></div></div>
    <div class="fg"><label>Odometer (km)</label><input class="fc" id="sf-odo" placeholder="Current reading"/></div>`,

  /* ★ NEW — Car Wash sub-form */
  car_wash: `
    <div class="fr">
      <div class="fg">
        <label>Vehicle plate</label>
        <input class="fc" id="sf-cw-plate" placeholder="e.g. RAB 123A"/>
      </div>
      <div class="fg">
        <label>Wash type</label>
        <select class="fc" id="sf-cw-type">
          <option>Basic wash</option>
          <option>Full exterior wash</option>
          <option>Full interior &amp; exterior</option>
          <option>Engine wash</option>
          <option>Polish &amp; wax</option>
        </select>
      </div>
    </div>
    <div class="fr">
      <div class="fg">
        <label>Preferred date</label>
        <input class="fc" type="date" id="sf-cw-date"/>
      </div>
      <div class="fg">
        <label>Preferred time</label>
        <input class="fc" type="time" id="sf-cw-time"/>
      </div>
    </div>
    <div class="fg">
      <label>Special instructions</label>
      <input class="fc" id="sf-cw-notes" placeholder="e.g. Focus on interior upholstery…"/>
    </div>`,

  generator: `
    <div class="fr"><div class="fg"><label>Generator ID / location</label><input class="fc" id="sf-gen" placeholder="e.g. Main office, G-01"/></div><div class="fg"><label>Issue</label><select class="fc" id="sf-gissue"><option>Routine service</option><option>Not starting</option><option>Overheating</option><option>Fuel issue</option><option>Noise / vibration</option></select></div></div>`,

  cleaning: `
    <div class="fr"><div class="fg"><label>Area / location</label><input class="fc" id="sf-area" placeholder="e.g. Main hall, offices"/></div><div class="fg"><label>Frequency</label><select class="fc" id="sf-freq"><option>One-time</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></div></div>`,

  security: `
    <div class="fr"><div class="fg"><label>Location</label><input class="fc" id="sf-loc" placeholder="Site / area to secure"/></div><div class="fg"><label>Service type</label><select class="fc" id="sf-sectype"><option>Guard deployment</option><option>Access control</option><option>CCTV issue</option><option>Incident report</option></select></div></div>`,

  plumbing: `
    <div class="fg"><label>Issue description</label><input class="fc" id="sf-issue" placeholder="e.g. Leaking pipe in bathroom 2"/></div>
    <div class="fg"><label>Location</label><input class="fc" id="sf-loc" placeholder="Building / floor / room"/></div>`,

  catering: `
    <div class="fr"><div class="fg"><label>Event / occasion</label><input class="fc" id="sf-event" placeholder="e.g. Staff meeting, training"/></div><div class="fg"><label>Number of people</label><input class="fc" type="number" id="sf-pax" placeholder="e.g. 25" min="1"/></div></div>
    <div class="fg"><label>Date &amp; time</label><input class="fc" type="datetime-local" id="sf-dt"/></div>`,

  printing: `
    <div class="fr"><div class="fg"><label>Document / item</label><input class="fc" id="sf-doc" placeholder="e.g. Report, ID cards"/></div><div class="fg"><label>Quantity</label><input class="fc" type="number" id="sf-qty" placeholder="e.g. 50" min="1"/></div></div>
    <div class="fg"><label>Colour / B&W</label><select class="fc" id="sf-colour"><option>Black &amp; White</option><option>Colour</option><option>Mixed</option></select></div>`,

  other_service: `
    <div class="fg"><label>Service description</label><input class="fc" id="sf-desc" placeholder="Describe the service needed"/></div>`,
};

function selectReqType(type, el) {
  if (!type) type = 'booking';
  DB.STATE.currentReqType = type;
  document.querySelectorAll('.req-type-btn').forEach(b => b.classList.remove('sel'));
  if (el) el.classList.add('sel');
  document.getElementById('req-form-fields').innerHTML = `<div class="divider"></div>` + (REQ_FORMS[type] || '');
  if (type === 'service') {
    DB.STATE.currentServiceSub = 'vehicle_maintenance';
    renderServiceSubForm();
  }
}

function selectServiceSub(sub, el) {
  DB.STATE.currentServiceSub = sub;
  document.querySelectorAll('.ssb').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  renderServiceSubForm();
}

function renderServiceSubForm() {
  const el = document.getElementById('service-sub-form');
  if (el) el.innerHTML = `<div class="divider"></div>` + (SERVICE_FORMS[DB.STATE.currentServiceSub] || '');
}

/* ────────────────────────────────────────
   REQUEST SUBMISSION
──────────────────────────────────────── */
function submitRequest() {
  const u     = DB.STATE.currentUser;
  const notes = document.getElementById('req-notes').value.trim();

  if (!notes) {
    setFieldError('req-notes','fg-req-notes','Please provide a brief description or additional info.');
    return;
  }

  const type = DB.STATE.currentReqType;
  let typeLabel = (DB.REQUEST_TYPES[type]?.label) || type;
  let subType   = null;

  if (type === 'service') {
    const sub = DB.SERVICE_SUB_TYPES[DB.STATE.currentServiceSub];
    typeLabel = sub?.label || 'Service Request';
    subType   = sub?.label || null;
  }

  const req = DB.createRequest({ type:typeLabel, category:type, subType, userId:u.id, userName:u.name, notes });

  /* Notify all managers + admins */
  DB.STATE.users
    .filter(x => x.role === 'manager' || x.role === 'admin')
    .forEach(m => DB.addNotification(m.id, '📋 New Request', `${u.name} submitted: ${req.type}`, req.id));

  DB.addLog(u.name, u.role, `Submitted request: ${req.ref}`, 'Requests');

  document.getElementById('req-notes').value = '';
  clearFieldError('req-notes','fg-req-notes');
  toast('Request submitted successfully','s');
  gotoSection('my-requests');
}

function renderSidebarRequests() {
  const u       = DB.STATE.currentUser;
  const pending = DB.getRequestsForUser(u.id).filter(r => r.status === 'Pending').slice(0,3);
  const el      = document.getElementById('sidebar-my-req');
  if (!pending.length) { el.innerHTML = `<div style="font-size:13px;color:var(--text-3);text-align:center;padding:12px">No pending requests</div>`; return; }
  el.innerHTML = pending.map(r =>
    `<div style="font-size:13px;padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-weight:600">${r.ref}</div><div style="color:var(--text-2)">${r.type}</div></div>`
  ).join('');
}

function renderMyRequests() {
  const u    = DB.STATE.currentUser;
  const reqs = DB.getRequestsForUser(u.id);
  const grid = document.getElementById('my-req-grid');
  if (!reqs.length) {
    grid.innerHTML = `<div style="grid-column:1/-1"><div class="empty"><div class="empty-icon">📁</div><div class="empty-title">No requests yet</div><div class="empty-sub">Submit your first request to get started.</div><button class="btn btn-p" onclick="gotoSection('new-request')">+ New request</button></div></div>`;
    return;
  }
  const typeIcon = { booking:'🚗', fuel:'⛽', service:'🔧', travel:'✈️', procurement:'📦', leave:'🏖️', advance:'💰', it:'💻' };
  grid.innerHTML = reqs.map(r =>
    `<div class="req-card" onclick="viewRequest('${r.id}')">
      <div style="width:42px;height:42px;border-radius:10px;background:var(--blue-bg);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${typeIcon[r.category]||'📋'}</div>
      <div class="req-card-body">
        <div class="req-card-title">${r.type}</div>
        <div class="req-card-sub">${r.ref} · ${fmtDate(r.date)}${r.subType ? ' · <em>'+r.subType+'</em>' : ''}</div>
        <div class="req-card-foot">${statusBadge(r.status)}</div>
      </div>
    </div>`
  ).join('');
}

function renderAllRequests() {
  const reqs  = DB.getAllRequests();
  const tbody = document.getElementById('all-req-tbody');
  if (!reqs.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No requests</div><div class="empty-sub">Requests will appear here once submitted.</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = reqs.map(r =>
    `<tr>
      <td class="cell-mono">${r.ref}</td>
      <td>${r.type}</td>
      <td>${r.userName}</td>
      <td>${fmtDate(r.date)}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-2)">${r.notes||'—'}</td>
      <td>${statusBadge(r.status)}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-g btn-sm" onclick="viewRequest('${r.id}')">View</button>
        ${r.status==='Pending' ? `<button class="btn btn-success btn-sm" onclick="updateReqStatus('${r.id}','Approved')">✓</button><button class="btn btn-danger btn-sm" onclick="updateReqStatus('${r.id}','Rejected')">✕</button>` : ''}
      </div></td>
    </tr>`
  ).join('');
}

function updateReqStatus(id, status) {
  const req = DB.updateRequestStatus(id, status);
  if (!req) return;
  DB.addNotification(req.userId, `Request ${status}`, `Your request ${req.ref} has been ${status.toLowerCase()}.`, req.id);
  DB.addLog(DB.STATE.currentUser.name, DB.STATE.currentUser.role, `${status} request: ${req.ref}`, 'Requests');
  const active = document.querySelector('.section.on');
  if (active) renderSection(active.id.replace('s-',''));
  toast(`Request ${status.toLowerCase()}`, status==='Approved'?'s':'i');
  buildSidebar();
}

function filterReqStatus(val) {
  document.querySelectorAll('#all-req-tbody tr').forEach(row => {
    row.style.display = !val || row.innerText.includes(val) ? '' : 'none';
  });
}

function viewRequest(id) {
  const req = DB.getAllRequests().find(r => r.id === id) || DB.getRequestsForUser(DB.STATE.currentUser.id).find(r => r.id === id);
  if (!req) return;
  document.getElementById('vreq-title').textContent = `${req.type} · ${req.ref}`;
  document.getElementById('vreq-body').innerHTML = `
    <div class="stat-row"><span class="stat-k">Reference</span><span class="stat-v cell-mono">${req.ref}</span></div>
    <div class="stat-row"><span class="stat-k">Type</span><span class="stat-v">${req.type}</span></div>
    ${req.subType ? `<div class="stat-row"><span class="stat-k">Sub-type</span><span class="stat-v">${req.subType}</span></div>` : ''}
    <div class="stat-row"><span class="stat-k">Submitted by</span><span class="stat-v">${req.userName}</span></div>
    <div class="stat-row"><span class="stat-k">Date</span><span class="stat-v">${fmtTime(req.date)}</span></div>
    <div class="stat-row"><span class="stat-k">Status</span><span class="stat-v">${statusBadge(req.status)}</span></div>
    <div class="stat-row"><span class="stat-k">Notes</span><span class="stat-v">${req.notes||'—'}</span></div>`;
  const u = DB.STATE.currentUser;
  document.getElementById('vreq-actions').innerHTML = req.status === 'Pending' && DB.ROLES[u.role] <= 2
    ? `<button class="btn btn-p" onclick="updateReqStatus('${req.id}','Approved');closeModal('view-req')">Approve</button>
       <button class="btn btn-danger" onclick="updateReqStatus('${req.id}','Rejected');closeModal('view-req')">Reject</button>
       <button class="btn btn-o" onclick="closeModal('view-req')">Close</button>`
    : `<button class="btn btn-p" onclick="closeModal('view-req')">Close</button>`;
  openModal('view-req');
}

/* ────────────────────────────────────────
   NOTIFICATIONS
──────────────────────────────────────── */
function renderNotifications() {
  const u      = DB.STATE.currentUser;
  const notifs = DB.getNotificationsForUser(u.id);
  const el     = document.getElementById('notif-list');
  if (!notifs.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🔔</div><div class="empty-title">All clear</div><div class="empty-sub">No notifications yet.</div></div>`;
    return;
  }
  el.innerHTML = notifs.map(n =>
    `<div class="notif-item ${n.read?'':'unread'}" onclick="readNotif('${n.id}')">
      <div class="ni-icon" style="background:var(--blue-bg)">🔔</div>
      <div>
        <div class="ni-title">${n.title}</div>
        <div class="ni-body">${n.body}</div>
        <div class="ni-time">${fmtTime(n.time)}</div>
      </div>
    </div>`
  ).join('');
}

function readNotif(id) {
  DB.markNotificationRead(id);
  renderNotifications();
  buildSidebar();
  refreshUI();
}

function markAllRead() {
  DB.markAllNotificationsRead(DB.STATE.currentUser.id);
  renderNotifications();
  buildSidebar();
  refreshUI();
  toast('All read','s');
}

/* ────────────────────────────────────────
   AUDIT LOG
──────────────────────────────────────── */
function renderLogs() {
  const tbody = document.getElementById('logs-tbody');
  const logs  = DB.STATE.auditLog;
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">No logs yet</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = logs.slice(0,100).map(l =>
    `<tr>
      <td style="font-size:11px;color:var(--text-3);white-space:nowrap">${fmtTime(l.time)}</td>
      <td style="font-weight:600">${l.actor}</td>
      <td><span class="role-tag role-${l.role}">${DB.ROLE_LABELS[l.role]||l.role}</span></td>
      <td>${l.action}</td>
      <td><span class="badge badge-b">${l.module}</span></td>
    </tr>`
  ).join('');
}

/* ────────────────────────────────────────
   TASKS
──────────────────────────────────────── */
function renderTasks() {
  const u       = DB.STATE.currentUser;
  const myTasks = DB.STATE.tasks.filter(t => t.assignedTo === u.id);
  const cols    = [
    { title:'To Do',       icon:'📋', status:'todo' },
    { title:'In Progress', icon:'⚡', status:'inprogress' },
    { title:'Done',        icon:'✅', status:'done' },
  ];
  document.getElementById('tasks-board').innerHTML = cols.map(col => {
    const items = myTasks.filter(t => t.status === col.status);
    return `<div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <span style="font-size:18px">${col.icon}</span>
        <div class="card-title" style="margin:0">${col.title}</div>
        <span class="badge badge-b" style="margin-left:auto">${items.length}</span>
      </div>
      ${items.length
        ? items.map(t => `<div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px;font-size:13px"><div style="font-weight:600">${t.title}</div><div style="color:var(--text-3);font-size:11px;margin-top:4px">${fmtDate(t.due)}</div></div>`).join('')
        : `<div style="text-align:center;color:var(--text-3);font-size:12px;padding:20px">No tasks</div>`
      }
    </div>`;
  }).join('');
}

/* ────────────────────────────────────────
   SETTINGS
──────────────────────────────────────── */
function renderSettings() {
  const u = DB.STATE.currentUser;
  document.getElementById('set-name').value  = u.name;
  document.getElementById('set-email').value = u.email;
  document.getElementById('set-phone').value = u.phone || '';
  const setAv = document.getElementById('set-av-preview');
  setAv.innerHTML = u.photo
    ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : '👤';
  const adminSec = document.getElementById('admin-settings');
  if (adminSec) adminSec.style.display = u.role === 'admin' ? '' : 'none';
  const dt = document.getElementById('dark-toggle');
  if (dt) { DB.STATE.theme === 'dark' ? dt.classList.add('on') : dt.classList.remove('on'); }
}

function saveSettings() {
  const name  = document.getElementById('set-name').value.trim();
  const email = document.getElementById('set-email').value.trim();
  const phone = document.getElementById('set-phone').value.trim();
  const checks = [
    { id:'set-name',  group:'fg-set-name',  val:name,  test:v=>v.length>=2,      msg:'Name must be at least 2 characters.' },
    { id:'set-email', group:'fg-set-email', val:email, test:v=>EMAIL_RE.test(v), msg:'Enter a valid email address.' },
  ];
  if (phone) checks.push({ id:'set-phone', group:'fg-set-phone', val:phone, test:v=>PHONE_RE.test(v), msg:'Enter a valid phone number.' });
  if (!validateFields(checks)) return;

  const u        = DB.STATE.currentUser;
  const conflict = DB.STATE.users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.id !== u.id);
  if (conflict) { setFieldError('set-email','fg-set-email','This email is already used by another account.'); return; }

  DB.updateUser(u.id, { name, email, phone });
  buildSidebar();
  refreshUI();
  toast('Settings saved','s');
}

/* ────────────────────────────────────────
   PROFILE
──────────────────────────────────────── */
function renderProfile() {
  const u      = DB.STATE.currentUser;
  const myReqs = DB.getRequestsForUser(u.id);
  document.getElementById('profile-name').textContent  = u.name;
  document.getElementById('profile-email').textContent = u.email;
  document.getElementById('profile-role-tag').innerHTML =
    `<span class="role-tag role-${u.role}">${DB.ROLE_LABELS[u.role]}</span>`;

  const profAv = document.getElementById('profile-av');
  profAv.style.background = DB.AV_COLORS[u.role] || 'var(--blue)';
  profAv.innerHTML = u.photo
    ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/><div class="av-overlay">✏️</div>`
    : `<span>${initials(u.name)}</span><div class="av-overlay">✏️</div>`;
  profAv.onclick = () => document.getElementById('set-pic').click();

  document.getElementById('profile-stats').innerHTML = [
    { k:'Role',           v:DB.ROLE_LABELS[u.role] },
    { k:'Email',          v:u.email },
    { k:'Phone',          v:u.phone||'—' },
    { k:'Joined',         v:fmtDate(u.joined) },
    { k:'Total requests', v:myReqs.length },
    { k:'Pending',        v:myReqs.filter(r=>r.status==='Pending').length },
    { k:'Approved',       v:myReqs.filter(r=>r.status==='Approved').length },
  ].map(s=>`<div class="stat-row"><span class="stat-k">${s.k}</span><span class="stat-v">${s.v}</span></div>`).join('');

  const logs = DB.STATE.auditLog.filter(l => l.actor === u.name).slice(0,5);
  document.getElementById('profile-activity').innerHTML = logs.length
    ? logs.map(l=>`<div class="act-item"><div class="act-dot" style="background:var(--blue)"></div><div><div class="act-txt"><strong>${l.action}</strong> — ${l.module}</div><div class="act-time">${fmtTime(l.time)}</div></div></div>`).join('')
    : `<div class="empty" style="padding:30px 0"><div class="empty-icon">📜</div><div class="empty-title">No activity yet</div></div>`;
}

/* ────────────────────────────────────────
   MISC HELPERS
──────────────────────────────────────── */
function filterTbl(input, tbodyId) {
  const q = input.value.toLowerCase();
  document.querySelectorAll(`#${tbodyId} tr`).forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

function globalSearch(q) { /* placeholder for global search */ }

function setPeriod(btn, period) {
  document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  DB.STATE.activePeriod = period;
  renderOverview();
}

/* ────────────────────────────────────────
   BOOT
──────────────────────────────────────── */
function boot() {
  const msgs = ['Loading modules…','Checking session…','Ready!'];
  let i = 0;
  const ld = document.getElementById('ld-txt');
  const iv = setInterval(() => { if (i < msgs.length) ld.textContent = msgs[i++]; else clearInterval(iv); }, 400);

  DB.load();
  document.documentElement.setAttribute('data-theme', DB.STATE.theme);

  setTimeout(() => {
    document.getElementById('loader').classList.add('out');
    selectReqType('booking', document.querySelector('.req-type-btn.sel'));

    const sessionId = DB.getSessionUserId();
    if (sessionId) {
      const user = DB.findUserById(sessionId);
      if (user && user.status === 'active') { loginUser(user); return; }
    }

    document.getElementById('page-auth').style.display = '';
    applySetupMode();
  }, 1400);
}

boot();
