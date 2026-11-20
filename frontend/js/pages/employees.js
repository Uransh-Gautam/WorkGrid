// frontend/js/pages/employees.js
// Logic for the Workforce & Capacity (Employees) page.
// Supports Team and Workload filtering and adding new employees via modal.

let currentTeamFilter = 'All';
let currentWorkloadFilter = 'All';

document.addEventListener('DOMContentLoaded', () => {
  setupFilterEvents();
  setupModalEvents();
  loadEmployeesData();
});

async function loadEmployeesData() {
  const container = document.getElementById('employees-table-container');

  try {
    const [departments, employees] = await Promise.all([
      window.api.getDepartments(),
      window.api.getEmployees({ team: currentTeamFilter, workload: currentWorkloadFilter }),
    ]);

    renderTeamFilterButtons(departments);
    renderEmployeesTable(employees);
    populateModalSelects(departments, employees);
  } catch (error) {
    console.error('Error loading employees:', error);
    container.innerHTML = `
      <div class="p-8 text-center text-[#ba1a1a] text-[13px] bg-[#fff8f7]">
        <span class="material-symbols-outlined text-[20px] mb-1">error</span><br>
        ${window.api.escapeHtml(error.message || 'Cannot reach the server or database.')}
      </div>
    `;
  }
}

function renderTeamFilterButtons(departments) {
  const container = document.getElementById('team-filters');
  const buttons = [
    `<span class="text-[12px] font-semibold text-[#787774] mr-1 uppercase">Team:</span>`,
    `<button class="team-filter-btn px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
      currentTeamFilter === 'All'
        ? 'bg-[#005da9] text-white'
        : 'bg-white text-[#787774] border border-[#e9e9e7] hover:bg-[#f3ede4]'
    }" data-team="All">All Teams</button>`,
  ];

  departments.forEach((dept) => {
    const isActive = currentTeamFilter.toLowerCase() === dept.name.toLowerCase();
    buttons.push(`
      <button class="team-filter-btn px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
        isActive
          ? 'bg-[#005da9] text-white'
          : 'bg-white text-[#787774] border border-[#e9e9e7] hover:bg-[#f3ede4]'
      }" data-team="${window.api.escapeHtml(dept.name)}">${window.api.escapeHtml(dept.name)}</button>
    `);
  });

  container.innerHTML = buttons.join('');

  container.querySelectorAll('.team-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTeamFilter = btn.getAttribute('data-team');
      triggerFilterReload();
    });
  });
}

function setupFilterEvents() {
  const workloadContainer = document.getElementById('workload-filters');
  workloadContainer.querySelectorAll('.workload-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentWorkloadFilter = btn.getAttribute('data-workload');
      workloadContainer.querySelectorAll('.workload-filter-btn').forEach((b) => {
        b.className =
          'workload-filter-btn px-2.5 py-1 rounded text-[12px] font-medium transition-colors bg-white text-[#787774] border border-[#e9e9e7] hover:bg-[#f3ede4]';
      });
      btn.className =
        'workload-filter-btn px-2.5 py-1 rounded text-[12px] font-medium transition-colors bg-[#005da9] text-white';
      triggerFilterReload();
    });
  });
}

async function triggerFilterReload() {
  const container = document.getElementById('employees-table-container');
  container.innerHTML = `<div class="p-8 text-center text-[#787774] text-[13px]">Filtering employees...</div>`;
  try {
    const employees = await window.api.getEmployees({
      team: currentTeamFilter,
      workload: currentWorkloadFilter,
    });
    renderEmployeesTable(employees);
  } catch (err) {
    container.innerHTML = `
      <div class="p-8 text-center text-[#ba1a1a] text-[13px] bg-[#fff8f7]">
        ${window.api.escapeHtml(err.message || 'Failed to load filtered employees')}
      </div>
    `;
  }
}

function renderEmployeesTable(employees) {
  const container = document.getElementById('employees-table-container');

  if (!employees || employees.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-[#787774] text-[13px]">
        No employees found matching the selected filters.
      </div>
    `;
    return;
  }

  const rows = employees
    .map((emp) => {
      const initials = window.api.getInitials(emp.name);
      const capacity = emp.capacity || 40;
      const hours = emp.workloadHours || 0;
      const percent = emp.utilizationPercent || Math.round((hours / capacity) * 100);
      const barColor = window.api.getWorkloadBarColor(emp.workloadStatus);
      const statusBadge = window.api.getWorkloadBadge(emp.workloadStatus);
      const barWidth = Math.min(percent, 100);

      return `
        <tr class="h-10 hover:bg-[#F7F7F5] transition-colors">
          <td class="px-3.5 border-r border-[#e9e9e7] text-[#1d1c16] font-medium flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-[#f3ede4] text-[#1d1c16] text-[10px] flex items-center justify-center font-semibold shrink-0">
              ${initials}
            </span>
            <div class="flex flex-col min-w-0">
              <span class="truncate">${window.api.escapeHtml(emp.name)}</span>
              <span class="text-[11px] text-[#787774] truncate">${window.api.escapeHtml(emp.email)}</span>
            </div>
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7] text-[#787774] text-[13px]">
            ${window.api.escapeHtml(emp.role)}
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7] text-[#787774] text-[13px]">
            ${window.api.escapeHtml(emp.department?.name || '—')}
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7] text-[#787774] text-[13px]">
            ${window.api.escapeHtml(emp.manager?.name || '—')}
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7]">
            <div class="flex items-center gap-3">
              <div class="w-full bg-[#EBEBEA] h-[6px] rounded-full overflow-hidden">
                <div class="${barColor} h-full rounded-full" style="width: ${barWidth}%;"></div>
              </div>
              <span class="text-[12px] text-[#1d1c16] shrink-0 w-24 text-right font-medium">
                ${hours} / ${capacity}h <span class="${emp.workloadStatus === 'Overloaded' ? 'text-[#ba1a1a]' : 'text-[#787774]'}">(${percent}%)</span>
              </span>
            </div>
          </td>
          <td class="px-3.5 text-right">
            ${statusBadge}
          </td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <table class="w-full text-left border-collapse">
      <thead class="bg-[#F7F7F5] border-b border-[#e9e9e7] text-[12px] font-medium text-[#787774]">
        <tr class="h-8">
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/4">Name</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/6">Role</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/6">Department</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/6">Manager</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/4">Hours allocated</th>
          <th class="px-3.5 font-normal text-right w-24">Status</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#e9e9e7] text-[13px]">
        ${rows}
      </tbody>
    </table>
  `;
}

function populateModalSelects(departments, employees) {
  const deptSelect = document.getElementById('employee-modal-dept-select');
  deptSelect.innerHTML = `<option value="">Select team...</option>` +
    departments.map((d) => `<option value="${d.id}">${window.api.escapeHtml(d.name)}</option>`).join('');

  const mgrSelect = document.getElementById('employee-modal-manager-select');
  mgrSelect.innerHTML = `<option value="">None (Reports to Root / Self)</option>` +
    employees.map((e) => `<option value="${e.id}">${window.api.escapeHtml(e.name)} (${window.api.escapeHtml(e.role)})</option>`).join('');
}

function setupModalEvents() {
  const modal = document.getElementById('new-employee-modal');
  const openBtn = document.getElementById('open-new-employee-modal-btn');
  const closeBtn = document.getElementById('close-employee-modal-btn');
  const cancelBtn = document.getElementById('cancel-employee-modal-btn');
  const form = document.getElementById('new-employee-form');
  const formError = document.getElementById('new-employee-form-error');

  function open() {
    form.reset();
    formError.classList.add('hidden');
    formError.textContent = '';
    modal.classList.remove('hidden');
  }

  function close() {
    modal.classList.add('hidden');
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.classList.add('hidden');

    const formData = new FormData(form);
    const payload = {
      name: formData.get('name')?.trim(),
      email: formData.get('email')?.trim(),
      role: formData.get('role')?.trim(),
      departmentId: Number(formData.get('departmentId')),
      capacity: Number(formData.get('capacity') || 40),
      managerId: formData.get('managerId') ? Number(formData.get('managerId')) : null,
    };

    try {
      await window.api.createEmployee(payload);
      close();
      loadEmployeesData();
    } catch (err) {
      formError.textContent = err.message || 'Failed to create employee';
      formError.classList.remove('hidden');
    }
  });
}
