// frontend/js/pages/allocations.js
// Logic for Resource Allocations & Audit History tabs.
// Handles Current Allocations, Allocation History, New Allocation Modal with live projected load,
// and Request Reassignment modal.

let currentTab = 'current'; // 'current' | 'history'
let cachedEmployees = [];
let cachedProjects = [];
let cachedAllocations = [];

document.addEventListener('DOMContentLoaded', () => {
  setupTabEvents();
  setupModalEvents();
  loadAllocationData();

  // If URL has action=new, trigger modal
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'new') {
    document.getElementById('open-new-allocation-modal-btn')?.click();
  }
});

function setupTabEvents() {
  const currentBtn = document.getElementById('tab-current-btn');
  const historyBtn = document.getElementById('tab-history-btn');

  currentBtn.addEventListener('click', () => {
    currentTab = 'current';
    currentBtn.className =
      'tab-btn pb-2.5 text-[14px] font-semibold text-[#005da9] border-b-2 border-[#005da9] flex items-center gap-2';
    historyBtn.className =
      'tab-btn pb-2.5 text-[14px] font-medium text-[#787774] hover:text-[#1d1c16] flex items-center gap-2 border-b-2 border-transparent';
    loadAllocationData();
  });

  historyBtn.addEventListener('click', () => {
    currentTab = 'history';
    historyBtn.className =
      'tab-btn pb-2.5 text-[14px] font-semibold text-[#005da9] border-b-2 border-[#005da9] flex items-center gap-2';
    currentBtn.className =
      'tab-btn pb-2.5 text-[14px] font-medium text-[#787774] hover:text-[#1d1c16] flex items-center gap-2 border-b-2 border-transparent';
    loadAllocationData();
  });
}

async function loadAllocationData() {
  const container = document.getElementById('allocations-table-container');
  const currentCount = document.getElementById('tab-current-count');
  const historyCount = document.getElementById('tab-history-count');

  container.innerHTML = `<div class="p-8 text-center text-[#787774] text-[13px]">Loading ${currentTab === 'current' ? 'active allocations' : 'allocation history'}...</div>`;

  try {
    const [employees, projects] = await Promise.all([
      window.api.getEmployees(),
      window.api.getProjects(),
    ]);

    cachedEmployees = employees;
    cachedProjects = projects;
    populateNewAllocationSelects();

    if (currentTab === 'current') {
      const allocations = await window.api.getAllocations('Active');
      cachedAllocations = allocations;
      currentCount.textContent = allocations.length;
      renderCurrentAllocations(allocations);
    } else {
      const history = await window.api.getAllocationHistory();
      historyCount.textContent = history.length;
      renderHistoryAllocations(history);
    }
  } catch (error) {
    console.error('Error loading allocations:', error);
    container.innerHTML = `
      <div class="p-8 text-center text-[#ba1a1a] text-[13px] bg-[#fff8f7]">
        <span class="material-symbols-outlined text-[20px] mb-1">error</span><br>
        ${window.api.escapeHtml(error.message || 'Cannot reach the server or database.')}
      </div>
    `;
  }
}

function renderCurrentAllocations(allocations) {
  const container = document.getElementById('allocations-table-container');

  if (!allocations || allocations.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-[#787774] text-[13px]">
        No active allocations currently recorded. Click "New allocation" to assign an employee.
      </div>
    `;
    return;
  }

  const rows = allocations
    .map((alloc) => {
      const emp = alloc.employee || {};
      const proj = alloc.project || {};
      const hours = alloc.hoursPerWeek || 0;
      const startedStr = window.api.formatDate(alloc.startedAt);

      return `
        <tr class="h-10 hover:bg-[#F7F7F5] transition-colors">
          <td class="px-3.5 border-r border-[#e9e9e7] font-medium text-[#1d1c16]">
            <div>${window.api.escapeHtml(emp.name || '—')}</div>
            <div class="text-[11px] text-[#787774]">${window.api.escapeHtml(emp.role || '—')}</div>
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7] text-[#1d1c16] text-[13px]">
            <span class="font-medium">${window.api.escapeHtml(proj.name || '—')}</span>
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7] text-[#1d1c16] text-[13px]">
            <div class="flex items-center gap-2">
              <span class="font-semibold">${hours}</span>
              <span class="text-[#787774] text-[12px]">hrs/week</span>
            </div>
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7] text-[#787774] text-[12px]">
            ${startedStr}
          </td>
          <td class="px-3.5 text-right">
            <button onclick="openReassignModal(${alloc.id})"
                    class="px-2.5 py-1 rounded-[4px] border border-[#e9e9e7] hover:bg-[#EFEFED] text-[#005da9] text-[12px] font-medium transition-colors">
              Request reassignment
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <table class="w-full text-left border-collapse">
      <thead class="bg-[#F7F7F5] border-b border-[#e9e9e7] text-[12px] font-medium text-[#787774]">
        <tr class="h-8">
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/4">Employee</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/4">Project</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/5">Hours Allocated</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/6">Assigned Date</th>
          <th class="px-3.5 font-normal text-right w-1/6">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#e9e9e7] text-[13px]">
        ${rows}
      </tbody>
    </table>
  `;
}

function renderHistoryAllocations(history) {
  const container = document.getElementById('allocations-table-container');

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-[#787774] text-[13px]">
        No allocation history entries recorded yet.
      </div>
    `;
    return;
  }

  const rows = history
    .map((h) => {
      const dateStr = window.api.formatDate(h.changedAt, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const emp = h.employee || {};
      const proj = h.allocation?.project || {};

      let typeBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#D3E5EF] text-[#183347]">Created</span>`;
      if (h.changeType === 'Reassigned') {
        typeBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FBF3DB] text-[#492F24]">Reassigned</span>`;
      } else if (h.changeType === 'Closed') {
        typeBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFE2DD] text-[#5D1715]">Closed</span>`;
      }

      return `
        <tr class="h-10 hover:bg-[#F7F7F5] transition-colors">
          <td class="px-3.5 border-r border-[#e9e9e7] text-[#787774] text-[12px] whitespace-nowrap">
            ${dateStr}
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7] font-medium text-[#1d1c16]">
            ${window.api.escapeHtml(emp.name || '—')}
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7] text-[#1d1c16] text-[13px]">
            ${window.api.escapeHtml(proj.name || '—')}
          </td>
          <td class="px-3.5 border-r border-[#e9e9e7]">
            ${typeBadge}
          </td>
          <td class="px-3.5 text-[#1d1c16] text-[13px]">
            ${window.api.escapeHtml(h.details || '—')}
          </td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <table class="w-full text-left border-collapse">
      <thead class="bg-[#F7F7F5] border-b border-[#e9e9e7] text-[12px] font-medium text-[#787774]">
        <tr class="h-8">
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/5">Timestamp</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/5">Employee</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/5">Project</th>
          <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-28">Event</th>
          <th class="px-3.5 font-normal">Change Details</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#e9e9e7] text-[13px]">
        ${rows}
      </tbody>
    </table>
  `;
}

function populateNewAllocationSelects() {
  const empSelect = document.getElementById('alloc-modal-emp-select');
  const projSelect = document.getElementById('alloc-modal-proj-select');

  empSelect.innerHTML = `<option value="">Select employee...</option>` +
    cachedEmployees
      .map(
        (e) =>
          `<option value="${e.id}" data-current-hours="${e.workloadHours || 0}" data-capacity="${e.capacity || 40}">
            ${window.api.escapeHtml(e.name)} (Current: ${e.workloadHours || 0}h/${e.capacity || 40}h)
          </option>`
      )
      .join('');

  projSelect.innerHTML = `<option value="">Select project...</option>` +
    cachedProjects
      .filter((p) => p.status !== 'Completed')
      .map((p) => `<option value="${p.id}">${window.api.escapeHtml(p.name)} (${p.status})</option>`)
      .join('');
}

function recalculateProjectedLoad() {
  const empSelect = document.getElementById('alloc-modal-emp-select');
  const hoursInput = document.getElementById('alloc-modal-hours-input');
  const curHoursEl = document.getElementById('proj-current-hours');
  const addHoursEl = document.getElementById('proj-added-hours');
  const totalHoursEl = document.getElementById('proj-total-hours');
  const warnMsg = document.getElementById('proj-warning-msg');

  const selectedOpt = empSelect.selectedOptions[0];
  const currentHours = selectedOpt ? Number(selectedOpt.getAttribute('data-current-hours') || 0) : 0;
  const capacity = selectedOpt ? Number(selectedOpt.getAttribute('data-capacity') || 40) : 40;
  const addedHours = Number(hoursInput.value || 0);
  const total = currentHours + addedHours;

  curHoursEl.textContent = `${currentHours} hrs`;
  addHoursEl.textContent = `+${addedHours} hrs`;
  totalHoursEl.textContent = `${total} / ${capacity} hrs`;

  if (total > capacity) {
    warnMsg.classList.remove('hidden');
    warnMsg.textContent = `Warning: This allocation brings workload to ${total}h, exceeding ${capacity}h capacity!`;
    totalHoursEl.className = 'text-[#ba1a1a]';
  } else {
    warnMsg.classList.add('hidden');
    totalHoursEl.className = 'text-[#005da9]';
  }
}

function setupModalEvents() {
  // New Allocation Modal
  const allocModal = document.getElementById('new-allocation-modal');
  const openAllocBtn = document.getElementById('open-new-allocation-modal-btn');
  const closeAllocBtn = document.getElementById('close-allocation-modal-btn');
  const cancelAllocBtn = document.getElementById('cancel-allocation-modal-btn');
  const allocForm = document.getElementById('new-allocation-form');
  const allocFormError = document.getElementById('new-allocation-form-error');

  const empSelect = document.getElementById('alloc-modal-emp-select');
  const hoursInput = document.getElementById('alloc-modal-hours-input');

  empSelect.addEventListener('change', recalculateProjectedLoad);
  hoursInput.addEventListener('input', recalculateProjectedLoad);

  function openAlloc() {
    allocForm.reset();
    allocFormError.classList.add('hidden');
    recalculateProjectedLoad();
    allocModal.classList.remove('hidden');
  }

  function closeAlloc() {
    allocModal.classList.add('hidden');
  }

  openAllocBtn.addEventListener('click', openAlloc);
  closeAllocBtn.addEventListener('click', closeAlloc);
  cancelAllocBtn.addEventListener('click', closeAlloc);
  allocModal.addEventListener('click', (e) => {
    if (e.target === allocModal) closeAlloc();
  });

  allocForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    allocFormError.classList.add('hidden');

    const formData = new FormData(allocForm);
    const payload = {
      employeeId: Number(formData.get('employeeId')),
      projectId: Number(formData.get('projectId')),
      hoursPerWeek: Number(formData.get('hoursPerWeek')),
    };

    try {
      const res = await window.api.createAllocation(payload);
      closeAlloc();

      // Show yellow warning if capacity exceeded
      if (res.warning) {
        const toast = document.getElementById('allocation-warning-toast');
        const toastText = document.getElementById('allocation-warning-text');
        toastText.textContent = res.warning;
        toast.classList.remove('hidden');
      }

      loadAllocationData();
    } catch (err) {
      allocFormError.textContent = err.message || 'Failed to create allocation';
      allocFormError.classList.remove('hidden');
    }
  });

  // Reassignment Modal
  const reassignModal = document.getElementById('reassign-modal');
  const closeReassignBtn = document.getElementById('close-reassign-modal-btn');
  const cancelReassignBtn = document.getElementById('cancel-reassign-modal-btn');
  const reassignForm = document.getElementById('reassign-form');
  const reassignFormError = document.getElementById('reassign-form-error');

  closeReassignBtn.addEventListener('click', () => reassignModal.classList.add('hidden'));
  cancelReassignBtn.addEventListener('click', () => reassignModal.classList.add('hidden'));
  reassignModal.addEventListener('click', (e) => {
    if (e.target === reassignModal) reassignModal.classList.add('hidden');
  });

  reassignForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    reassignFormError.classList.add('hidden');

    const formData = new FormData(reassignForm);
    const payload = {
      fromAllocationId: Number(formData.get('fromAllocationId')),
      toProjectId: Number(formData.get('toProjectId')),
      hoursPerWeek: Number(formData.get('hoursPerWeek')),
      justification: formData.get('justification')?.trim(),
    };

    try {
      await window.api.createReassignmentRequest(payload);
      reassignModal.classList.add('hidden');
      alert('Reassignment request submitted for manager approval.');
      loadAllocationData();
    } catch (err) {
      reassignFormError.textContent = err.message || 'Failed to submit reassignment request';
      reassignFormError.classList.remove('hidden');
    }
  });
}

function openReassignModal(allocationId) {
  const alloc = cachedAllocations.find((a) => a.id === allocationId);
  if (!alloc) return;

  const modal = document.getElementById('reassign-modal');
  const fromAllocIdInput = document.getElementById('reassign-from-alloc-id');
  const empNameEl = document.getElementById('reassign-emp-name');
  const curProjEl = document.getElementById('reassign-current-project');
  const curHoursEl = document.getElementById('reassign-current-hours');
  const targetProjSelect = document.getElementById('reassign-target-project-select');
  const hoursInput = document.getElementById('reassign-hours-input');
  const formError = document.getElementById('reassign-form-error');

  formError.classList.add('hidden');
  fromAllocIdInput.value = alloc.id;
  empNameEl.textContent = alloc.employee?.name || '—';
  curProjEl.textContent = alloc.project?.name || '—';
  curHoursEl.textContent = `${alloc.hoursPerWeek} hrs/week`;
  hoursInput.value = alloc.hoursPerWeek;

  targetProjSelect.innerHTML = `<option value="">Select target project...</option>` +
    cachedProjects
      .filter((p) => p.id !== alloc.projectId && p.status !== 'Completed')
      .map((p) => `<option value="${p.id}">${window.api.escapeHtml(p.name)}</option>`)
      .join('');

  modal.classList.remove('hidden');
}
window.openReassignModal = openReassignModal;
