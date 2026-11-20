// frontend/js/api.js
// Centralized API client and formatting utilities for WorkGrid.
// All network requests go through this file.

const API_BASE = '/api';

/**
 * Executes a network request to the Express API with JSON parsing and standardized error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);

    let data = null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      const message = data?.message || `Request failed with status ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.status) throw error;
    // Database unreachable or server offline fallback
    const networkError = new Error('Cannot reach the server or database. Ensure backend is running.');
    networkError.status = 503;
    throw networkError;
  }
}

// ==========================================
// Formatting & XSS Security Helpers
// ==========================================

/**
 * Prevents Cross-Site Scripting (XSS) by escaping HTML characters.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats an ISO date into a localized human-readable string without hardcoded years.
 */
function formatDate(dateInput, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', options).format(d);
  } catch {
    return '—';
  }
}

/**
 * Returns HTML badge for workload status.
 * Green for Free (<20h), Blue for Active (20-40h), Red for Overloaded (>40h).
 */
function getWorkloadBadge(status) {
  if (status === 'Free') {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#DBEDDB] text-[#1C3829]">Free</span>`;
  }
  if (status === 'Overloaded') {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFE2DD] text-[#5D1715]">Overloaded</span>`;
  }
  return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#D3E5EF] text-[#183347]">Active</span>`;
}

/**
 * Returns Tailwind background color class for the workload progress bar.
 */
function getWorkloadBarColor(status) {
  if (status === 'Free') return 'bg-[#1C3829]';
  if (status === 'Overloaded') return 'bg-[#ba1a1a]';
  return 'bg-[#005da9]';
}

/**
 * Returns initials from full name (e.g. "Maya Lin" -> "ML").
 */
function getInitials(name) {
  if (!name) return '—';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ==========================================
// API Methods
// ==========================================

const api = {
  // Utilities
  escapeHtml,
  formatDate,
  getWorkloadBadge,
  getWorkloadBarColor,
  getInitials,

  // Health
  getHealth: () => request('/health'),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Departments
  getDepartments: () => request('/departments'),

  // Employees
  getEmployees: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.team && params.team !== 'All' && params.team !== 'All Teams') {
      qs.set('team', params.team);
    }
    if (params.workload && params.workload !== 'All' && params.workload !== 'All Workloads') {
      qs.set('workload', params.workload);
    }
    const q = qs.toString();
    return request(`/employees${q ? `?${q}` : ''}`);
  },
  getEmployeeById: (id) => request(`/employees/${id}`),
  createEmployee: (payload) =>
    request('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Projects
  getProjects: () => request('/projects'),
  createProject: (payload) =>
    request('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Allocations
  getAllocations: (status = 'Active') =>
    request(`/allocations?status=${encodeURIComponent(status)}`),
  getAllocationHistory: () => request('/allocations/history'),
  createAllocation: (payload) =>
    request('/allocations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Approvals
  getApprovals: (status = '') => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/approvals${query}`);
  },
  getApprovalById: (id) => request(`/approvals/${id}`),
  createReassignmentRequest: (payload) =>
    request('/approvals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  decideApproval: (id, action) =>
    request(`/approvals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),
};

// Expose globally for vanilla scripts
window.api = api;
window.Formatters = api; // backwards-compatible alias
window.ApiService = {
  health: { check: api.getHealth },
  dashboard: { get: api.getDashboard },
  departments: { getAll: api.getDepartments },
  employees: { getAll: api.getEmployees, getById: api.getEmployeeById, create: api.createEmployee },
  projects: { getAll: api.getProjects, create: api.createProject },
  allocations: { getAll: api.getAllocations, getHistory: api.getAllocationHistory, create: api.createAllocation },
  approvals: { getAll: api.getApprovals, getById: api.getApprovalById, create: api.createReassignmentRequest, decide: api.decideApproval },
};
