/**
 * ══════════════════════════════════════════════════════════════
 *  ALIGHT RMS — DATABASE LAYER  (db/database.js)
 *  All persistence, state, and seed data lives here.
 *  No DOM or UI code in this file.
 * ══════════════════════════════════════════════════════════════
 */

/* ────────────────────────────────────────
   CONSTANTS & LOOKUP TABLES
──────────────────────────────────────── */
const DB = (() => {

  /* Role hierarchy — lower number = higher privilege */
  const ROLES = { admin: 1, manager: 2, staff: 3, user: 4 };

  const ROLE_LABELS = {
    admin: 'Administrator',
    manager: 'Manager',
    staff: 'Staff',
    user: 'User',
  };

  const AV_COLORS = {
    admin:   'var(--red)',
    manager: 'var(--purple)',
    staff:   'var(--blue)',
    user:    'var(--green)',
  };

  /* Request types ─ used for labels + icons */
  const REQUEST_TYPES = {
    booking:     { label: 'Vehicle Booking',  icon: '🚗' },
    fuel:        { label: 'Fuel Request',      icon: '⛽' },
    service:     { label: 'Service Request',   icon: '🔧' },
    travel:      { label: 'Travel Request',    icon: '✈️' },
    procurement: { label: 'Procurement',       icon: '📦' },
    leave:       { label: 'Leave Request',     icon: '🏖️' },
    advance:     { label: 'Cash Advance',      icon: '💰' },
    it:          { label: 'IT Support',        icon: '💻' },
  };

  /* Service sub-types — includes the new Car Wash */
  const SERVICE_SUB_TYPES = {
    vehicle_maintenance: { label: 'Vehicle Maintenance', icon: '🚗' },
    car_wash:            { label: 'Car Wash',             icon: '🫧' },   // ← NEW
    generator:           { label: 'Generator Service',    icon: '⚡' },
    cleaning:            { label: 'Cleaning Service',     icon: '🧹' },
    security:            { label: 'Security Service',     icon: '🔐' },
    plumbing:            { label: 'Plumbing / Electrical',icon: '🔧' },
    catering:            { label: 'Catering Service',     icon: '🍽️' },
    printing:            { label: 'Printing / Binding',   icon: '🖨️' },
    other_service:       { label: 'Other Service',        icon: '📋' },
  };

  /* ────────────────────────────────────────
     STATE — single source of truth
  ──────────────────────────────────────── */
  const STATE = {
    currentUser:   null,
    users:         [],
    requests:      [],
    notifications: [],
    auditLog:      [],
    tasks:         [],
    theme:         'dark',
    currentReqType:    'booking',
    currentServiceSub: 'vehicle_maintenance',
    activePeriod:      '7d',
    charts:        {},
  };

  /* ────────────────────────────────────────
     PERSISTENCE — localStorage wrappers
  ──────────────────────────────────────── */
  const KEYS = {
    users:         'rms_users',
    requests:      'rms_requests',
    notifications: 'rms_notifications',
    auditLog:      'rms_auditLog',
    tasks:         'rms_tasks',
    theme:         'rms_theme',
    session:       'rms_session',
  };

  function persist() {
    try {
      ['users', 'requests', 'notifications', 'auditLog', 'tasks'].forEach(k => {
        localStorage.setItem(KEYS[k], JSON.stringify(STATE[k]));
      });
      localStorage.setItem(KEYS.theme, STATE.theme);
      if (STATE.currentUser) {
        localStorage.setItem(KEYS.session, STATE.currentUser.id);
      }
    } catch (e) {
      console.warn('[DB] localStorage write failed:', e);
    }
  }

  function load() {
    try {
      ['users', 'requests', 'notifications', 'auditLog', 'tasks'].forEach(k => {
        const raw = localStorage.getItem(KEYS[k]);
        if (raw) STATE[k] = JSON.parse(raw);
      });
      const th = localStorage.getItem(KEYS.theme);
      if (th) STATE.theme = th;
    } catch (e) {
      console.warn('[DB] localStorage read failed:', e);
    }
  }

  function clearSession() {
    STATE.currentUser = null;
    localStorage.removeItem(KEYS.session);
  }

  function getSessionUserId() {
    return localStorage.getItem(KEYS.session);
  }

  /* ────────────────────────────────────────
     ID GENERATORS
  ──────────────────────────────────────── */
  function uid() {
    return 'u' + Date.now() + Math.random().toString(36).slice(2, 6);
  }

  function reqId() {
    return 'RQ-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  /* ────────────────────────────────────────
     USER QUERIES
  ──────────────────────────────────────── */
  function adminExists() {
    return STATE.users.some(u => u.role === 'admin');
  }

  function findUserByEmail(email) {
    return STATE.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  function findUserById(id) {
    return STATE.users.find(u => u.id === id);
  }

  function getUsersByRole(role) {
    return role === 'all' ? [...STATE.users] : STATE.users.filter(u => u.role === role);
  }

  function createUser(data) {
    const user = {
      id:       uid(),
      name:     data.name,
      email:    data.email,
      phone:    data.phone || '',
      role:     data.role,
      password: data.password,
      status:   'active',
      joined:   new Date().toISOString().split('T')[0],
      photo:    data.photo || null,
    };
    STATE.users.push(user);
    persist();
    return user;
  }

  function updateUser(id, changes) {
    const u = findUserById(id);
    if (!u) return null;
    Object.assign(u, changes);
    if (STATE.currentUser?.id === id) Object.assign(STATE.currentUser, changes);
    persist();
    return u;
  }

  function removeUser(id) {
    STATE.users = STATE.users.filter(u => u.id !== id);
    persist();
  }

  /* ────────────────────────────────────────
     REQUEST QUERIES
  ──────────────────────────────────────── */
  function createRequest(data) {
    const req = {
      id:       uid(),
      ref:      reqId(),
      type:     data.type,        // human-readable label
      category: data.category,    // key like 'service', 'booking'…
      subType:  data.subType || null,
      userId:   data.userId,
      userName: data.userName,
      date:     new Date().toISOString(),
      status:   'Pending',
      notes:    data.notes || '',
    };
    STATE.requests.unshift(req);
    persist();
    return req;
  }

  function updateRequestStatus(id, status) {
    const req = STATE.requests.find(r => r.id === id);
    if (!req) return null;
    req.status = status;
    persist();
    return req;
  }

  function getRequestsForUser(userId) {
    return STATE.requests.filter(r => r.userId === userId);
  }

  function getAllRequests() {
    return [...STATE.requests];
  }

  /* ────────────────────────────────────────
     NOTIFICATION QUERIES
  ──────────────────────────────────────── */
  function addNotification(userId, title, body, reqId) {
    const notif = {
      id:     uid(),
      userId,
      title,
      body,
      reqId,
      read:   false,
      time:   new Date().toISOString(),
    };
    STATE.notifications.unshift(notif);
    persist();
    return notif;
  }

  function markNotificationRead(id) {
    const n = STATE.notifications.find(x => x.id === id);
    if (n) { n.read = true; persist(); }
  }

  function markAllNotificationsRead(userId) {
    STATE.notifications
      .filter(n => n.userId === userId)
      .forEach(n => { n.read = true; });
    persist();
  }

  function getNotificationsForUser(userId) {
    return STATE.notifications.filter(n => n.userId === userId);
  }

  function getUnreadCount(userId) {
    return STATE.notifications.filter(n => n.userId === userId && !n.read).length;
  }

  /* ────────────────────────────────────────
     AUDIT LOG
  ──────────────────────────────────────── */
  function addLog(actor, role, action, module) {
    STATE.auditLog.unshift({
      id:     uid(),
      time:   new Date().toISOString(),
      actor,
      role,
      action,
      module,
    });
    if (STATE.auditLog.length > 200) STATE.auditLog.length = 200;
    persist();
  }

  /* ────────────────────────────────────────
     ANALYTICS HELPERS — pure computation
  ──────────────────────────────────────── */
  function bucketByDay(reqs, days) {
    const now = new Date();
    const labels = [], counts = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      labels.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
      counts.push(reqs.filter(r => r.date && r.date.startsWith(key)).length);
    }
    return { labels, counts };
  }

  function bucketByMonth(reqs) {
    const now = new Date();
    const labels = [], counts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear(), mo = d.getMonth();
      labels.push(d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
      counts.push(reqs.filter(r => {
        if (!r.date) return false;
        const rd = new Date(r.date);
        return rd.getFullYear() === yr && rd.getMonth() === mo;
      }).length);
    }
    return { labels, counts };
  }

  function getMonthRequests(reqs, monthOffset = 0) {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    return reqs.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
    });
  }

  /* ────────────────────────────────────────
     REPORT GENERATION
     Only admin + manager can download reports.
  ──────────────────────────────────────── */

  /**
   * canDownloadReports(user) → boolean
   * Access guard used by both the UI and the generator.
   */
  function canDownloadReports(user) {
    return user && (user.role === 'admin' || user.role === 'manager');
  }

  /**
   * generateCSVReport(type) → { filename, csv }
   * type: 'requests' | 'users' | 'audit'
   */
  function generateCSVReport(type) {
    let rows = [], headers = [], filename = '';

    if (type === 'requests') {
      filename = `requests_report_${_today()}.csv`;
      headers = ['Ref', 'Type', 'Sub-Type', 'Requester', 'Date', 'Status', 'Notes'];
      rows = STATE.requests.map(r => [
        r.ref, r.type, r.subType || '—', r.userName,
        _fmtDate(r.date), r.status,
        (r.notes || '').replace(/,/g, ';').replace(/\n/g, ' '),
      ]);
    } else if (type === 'users') {
      filename = `users_report_${_today()}.csv`;
      headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'];
      rows = STATE.users.map(u => [
        u.name, u.email, u.phone || '—',
        ROLE_LABELS[u.role] || u.role, u.status, u.joined,
      ]);
    } else if (type === 'audit') {
      filename = `audit_log_${_today()}.csv`;
      headers = ['Time', 'Actor', 'Role', 'Action', 'Module'];
      rows = STATE.auditLog.map(l => [
        _fmtDate(l.time), l.actor,
        ROLE_LABELS[l.role] || l.role,
        (l.action || '').replace(/,/g, ';'), l.module,
      ]);
    }

    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n');
    return { filename, csv };
  }

  /* private date helpers (no DOM) */
  function _today() {
    return new Date().toISOString().split('T')[0];
  }
  function _fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /* ────────────────────────────────────────
     PUBLIC API
  ──────────────────────────────────────── */
  return {
    /* constants */
    ROLES, ROLE_LABELS, AV_COLORS, REQUEST_TYPES, SERVICE_SUB_TYPES,

    /* state (read-only reference — mutate via methods) */
    get STATE() { return STATE; },

    /* persistence */
    persist, load, clearSession, getSessionUserId,

    /* users */
    adminExists, findUserByEmail, findUserById, getUsersByRole,
    createUser, updateUser, removeUser,

    /* requests */
    createRequest, updateRequestStatus, getRequestsForUser, getAllRequests,

    /* notifications */
    addNotification, markNotificationRead, markAllNotificationsRead,
    getNotificationsForUser, getUnreadCount,

    /* audit */
    addLog,

    /* analytics */
    bucketByDay, bucketByMonth, getMonthRequests,

    /* reports */
    canDownloadReports, generateCSVReport,

    /* ids */
    uid, reqId,
  };
})();
