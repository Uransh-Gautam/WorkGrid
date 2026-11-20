// frontend/js/pages/dashboard.js
// Logic for the Executive Dashboard view.
// Loads active projects, free & overloaded employees, workload table, and pending approvals.

document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
  const statActiveProjects = document.getElementById('stat-active-projects');
  const statFreeEmployees = document.getElementById('stat-free-employees');
  const statOverloadedEmployees = document.getElementById('stat-overloaded-employees');
  const workloadContainer = document.getElementById('workload-container');
  const workloadCount = document.getElementById('workload-count');
  const pendingContainer = document.getElementById('pending-approvals-container');
  const pendingCount = document.getElementById('pending-approvals-count');

  try {
    const data = await window.api.getDashboard();

    // 1. Stat Summary Cards
    statActiveProjects.innerHTML = `<span class="text-[28px] font-bold text-[#1d1c16]">${data.activeProjects || 0}</span>`;

    const freeEmps = (data.workload || []).filter((e) => e.workloadStatus === 'Free');
    const freeNames = freeEmps.map((e) => e.name.split(' ')[0]).slice(0, 3).join(', ');
    statFreeEmployees.innerHTML = `
      <div class="flex items-baseline justify-between">
        <span class="text-[28px] font-bold text-[#1d1c16]">${data.freeEmployees || 0}</span>
        <span class="text-[12px] text-[#787774] truncate max-w-[140px]">${window.api.escapeHtml(freeNames) || 'None'}</span>
      </div>
    `;

    const overloadedEmps = (data.workload || []).filter((e) => e.workloadStatus === 'Overloaded');
    const overloadedNames = overloadedEmps.map((e) => e.name.split(' ')[0]).slice(0, 3).join(', ');
    statOverloadedEmployees.innerHTML = `
      <div class="flex items-baseline justify-between">
        <span class="text-[28px] font-bold text-[#1d1c16]">${data.overloadedEmployees || 0}</span>
        <span class="text-[12px] text-[#ba1a1a] truncate max-w-[140px]">${window.api.escapeHtml(overloadedNames) || 'None'}</span>
      </div>
    `;

    // 2. Workload Table
    const employees = data.workload || [];
    workloadCount.textContent = employees.length;

    if (employees.length === 0) {
      workloadContainer.innerHTML = `
        <div class="p-8 text-center text-[#787774] text-[13px]">
          No employee records found in the database.
        </div>
      `;
    } else {
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
                <span class="truncate">${window.api.escapeHtml(emp.name)}</span>
              </td>
              <td class="px-3.5 border-r border-[#e9e9e7] text-[#787774] text-[13px]">
                ${window.api.escapeHtml(emp.department ? emp.department.name : '—')}
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

      workloadContainer.innerHTML = `
        <table class="w-full text-left border-collapse">
          <thead class="bg-[#F7F7F5] border-b border-[#e9e9e7] text-[12px] font-medium text-[#787774]">
            <tr class="h-8">
              <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/4">Employee</th>
              <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/5">Department</th>
              <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/3">Allocation Bar</th>
              <th class="px-3.5 font-normal text-right w-1/6">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e9e9e7] text-[13px]">
            ${rows}
          </tbody>
        </table>
      `;
    }

    // 3. Pending Approvals
    const approvals = data.pendingApprovals || [];
    pendingCount.textContent = approvals.length;

    if (approvals.length === 0) {
      pendingContainer.innerHTML = `
        <div class="p-6 text-center text-[#787774] text-[13px]">
          No pending approvals at this time. All clear!
        </div>
      `;
    } else {
      pendingContainer.innerHTML = approvals
        .map((req) => {
          const empName = req.employee?.name || 'Unknown Employee';
          const fromProj = req.fromAllocation?.project?.name || 'Source Project';
          const fromHours = req.fromAllocation?.hoursPerWeek || 0;
          const toProj = req.toProject?.name || 'Target Project';
          const toHours = req.hoursPerWeek;
          const dateStr = window.api.formatDate(req.createdAt);

          return `
            <div class="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#F7F7F5] transition-colors">
              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-[18px] text-[#787774] mt-0.5">swap_horiz</span>
                <div class="flex flex-col gap-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-1.5 text-[13px]">
                    <span class="text-[#1d1c16] font-semibold">Reassign ${window.api.escapeHtml(empName)}</span>
                    <span class="text-[#787774]">from</span>
                    <span class="text-[12px] bg-[#F1F1EF] px-1.5 py-0.5 rounded text-[#1d1c16] border border-[#e9e9e7]">
                      ${window.api.escapeHtml(fromProj)} (${fromHours}h)
                    </span>
                    <span class="text-[#787774]">to</span>
                    <span class="text-[12px] bg-[#F1F1EF] px-1.5 py-0.5 rounded text-[#1d1c16] border border-[#e9e9e7]">
                      ${window.api.escapeHtml(toProj)} (${toHours}h)
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-[11px] text-[#787774]">
                    <span class="px-1.5 py-0.2 rounded bg-[#FBF3DB] text-[#492F24] font-medium">Pending review</span>
                    <span>•</span>
                    <span>Submitted ${dateStr}</span>
                    ${req.justification ? `<span>•</span><span class="truncate max-w-xs italic">"${window.api.escapeHtml(req.justification)}"</span>` : ''}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 self-end md:self-center shrink-0">
                <button onclick="handleQuickDecision(${req.id}, 'reject')"
                        class="px-2.5 py-1 rounded-[4px] border border-[#e9e9e7] hover:bg-[#EFEFED] text-[#5D1715] text-[12px] font-medium transition-colors">
                  Reject
                </button>
                <button onclick="handleQuickDecision(${req.id}, 'approve')"
                        class="px-2.5 py-1 rounded-[4px] bg-[#005da9] hover:bg-[#004884] text-white text-[12px] font-medium transition-colors shadow-xs">
                  Approve
                </button>
              </div>
            </div>
          `;
        })
        .join('');
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
    const errorMsg = error.message || 'Cannot reach the server or database.';

    statActiveProjects.innerHTML = `<span class="text-[13px] text-[#ba1a1a]">Unavailable</span>`;
    statFreeEmployees.innerHTML = `<span class="text-[13px] text-[#ba1a1a]">Unavailable</span>`;
    statOverloadedEmployees.innerHTML = `<span class="text-[13px] text-[#ba1a1a]">Unavailable</span>`;

    workloadContainer.innerHTML = `
      <div class="p-8 text-center text-[#ba1a1a] text-[13px] bg-[#fff8f7]">
        <span class="material-symbols-outlined text-[20px] mb-1">error</span><br>
        ${window.api.escapeHtml(errorMsg)}
      </div>
    `;

    pendingContainer.innerHTML = `
      <div class="p-6 text-center text-[#ba1a1a] text-[13px] bg-[#fff8f7]">
        ${window.api.escapeHtml(errorMsg)}
      </div>
    `;
  }
}

async function handleQuickDecision(id, action) {
  try {
    await window.api.decideApproval(id, action);
    initDashboard();
  } catch (err) {
    alert(`Failed to ${action} request: ${err.message}`);
  }
}
window.handleQuickDecision = handleQuickDecision;
