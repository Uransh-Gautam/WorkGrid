// frontend/js/pages/approvals.js
// Logic for Manager Approvals Master-Detail Workflow.
// Supports tabs Pending / Approved / Rejected, list on left, detail panel on right, and Approve/Reject actions.

let currentTab = 'Pending'; // 'Pending' | 'Approved' | 'Rejected'
let currentRequests = [];
let selectedRequestId = null;

document.addEventListener('DOMContentLoaded', () => {
  setupTabEvents();
  loadApprovalData();
});

function setupTabEvents() {
  const tabs = [
    { id: 'tab-pending-btn', status: 'Pending' },
    { id: 'tab-approved-btn', status: 'Approved' },
    { id: 'tab-rejected-btn', status: 'Rejected' },
  ];

  tabs.forEach((t) => {
    const btn = document.getElementById(t.id);
    btn.addEventListener('click', () => {
      currentTab = t.status;
      selectedRequestId = null;

      tabs.forEach((other) => {
        const otherBtn = document.getElementById(other.id);
        if (other.status === currentTab) {
          otherBtn.className =
            'tab-btn pb-2.5 text-[14px] font-semibold text-[#005da9] border-b-2 border-[#005da9] flex items-center gap-2';
        } else {
          otherBtn.className =
            'tab-btn pb-2.5 text-[14px] font-medium text-[#787774] hover:text-[#1d1c16] flex items-center gap-2 border-b-2 border-transparent';
        }
      });

      loadApprovalData();
    });
  });
}

async function loadApprovalData() {
  const listContainer = document.getElementById('approvals-list-container');
  const detailPanel = document.getElementById('approval-detail-panel');

  listContainer.innerHTML = `<div class="p-8 text-center text-[#787774] text-[13px]">Loading ${currentTab.toLowerCase()} requests...</div>`;

  try {
    const [pendingReqs, approvedReqs, rejectedReqs] = await Promise.all([
      window.api.getApprovals('Pending'),
      window.api.getApprovals('Approved'),
      window.api.getApprovals('Rejected'),
    ]);

    document.getElementById('tab-pending-count').textContent = pendingReqs.length;
    document.getElementById('tab-approved-count').textContent = approvedReqs.length;
    document.getElementById('tab-rejected-count').textContent = rejectedReqs.length;

    let activeList = pendingReqs;
    if (currentTab === 'Approved') activeList = approvedReqs;
    if (currentTab === 'Rejected') activeList = rejectedReqs;

    currentRequests = activeList;
    renderList(activeList);

    if (activeList.length > 0) {
      const target = activeList.find((r) => r.id === selectedRequestId) || activeList[0];
      selectRequest(target.id);
    } else {
      detailPanel.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center text-[#787774] text-[13px]">
          <span class="material-symbols-outlined text-[32px] text-[#c0c7d4] mb-2">inbox</span>
          No ${currentTab.toLowerCase()} requests found.
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading approvals:', error);
    listContainer.innerHTML = `
      <div class="p-8 text-center text-[#ba1a1a] text-[13px] bg-[#fff8f7]">
        <span class="material-symbols-outlined text-[20px] mb-1">error</span><br>
        ${window.api.escapeHtml(error.message || 'Cannot reach the server or database.')}
      </div>
    `;
    detailPanel.innerHTML = `
      <div class="flex-1 flex flex-col items-center justify-center text-[#ba1a1a] text-[13px]">
        Failed to load approval data.
      </div>
    `;
  }
}

function renderList(requests) {
  const container = document.getElementById('approvals-list-container');

  if (!requests || requests.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-[#787774] text-[13px]">
        No ${currentTab.toLowerCase()} requests in this queue.
      </div>
    `;
    return;
  }

  container.innerHTML = requests
    .map((req) => {
      const isSelected = req.id === selectedRequestId;
      const empName = req.employee?.name || 'Unknown Employee';
      const fromProj = req.fromAllocation?.project?.name || 'Old Project';
      const toProj = req.toProject?.name || 'New Project';
      const dateStr = window.api.formatDate(req.createdAt);

      return `
        <div onclick="selectRequest(${req.id})"
             class="p-3.5 cursor-pointer transition-colors ${
               isSelected ? 'bg-[#f3ede4] border-l-4 border-[#005da9]' : 'hover:bg-[#F7F7F5]'
             }">
          <div class="flex items-center justify-between text-[11px] text-[#787774] mb-1">
            <span>${dateStr}</span>
            <span class="font-medium text-[#1d1c16]">${req.hoursPerWeek}h requested</span>
          </div>
          <div class="text-[13px] font-semibold text-[#1d1c16] truncate">
            ${window.api.escapeHtml(empName)}
          </div>
          <div class="text-[12px] text-[#787774] truncate mt-0.5">
            ${window.api.escapeHtml(fromProj)} &rarr; ${window.api.escapeHtml(toProj)}
          </div>
        </div>
      `;
    })
    .join('');
}

function selectRequest(id) {
  selectedRequestId = id;
  const req = currentRequests.find((r) => r.id === id);
  if (!req) return;

  renderList(currentRequests);

  const detailPanel = document.getElementById('approval-detail-panel');

  const emp = req.employee || {};
  const fromAlloc = req.fromAllocation || {};
  const fromProj = fromAlloc.project?.name || '—';
  const fromHours = fromAlloc.hoursPerWeek || 0;
  const toProj = req.toProject?.name || '—';
  const toHours = req.hoursPerWeek || 0;
  const hourDiff = toHours - fromHours;
  const diffStr = hourDiff >= 0 ? `+${hourDiff} hrs/wk` : `${hourDiff} hrs/wk`;

  const createdAtStr = window.api.formatDate(req.createdAt);
  const decidedAtStr = req.decidedAt ? window.api.formatDate(req.decidedAt) : null;

  let statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FBF3DB] text-[#492F24]">Pending Manager Approval</span>`;
  if (req.status === 'Approved') {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#DBEDDB] text-[#1C3829]">Approved</span>`;
  } else if (req.status === 'Rejected') {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFE2DD] text-[#5D1715]">Rejected</span>`;
  }

  let actionsHtml = '';
  if (req.status === 'Pending') {
    actionsHtml = `
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-[#e9e9e7] mt-auto">
        <button onclick="handleDecision(${req.id}, 'reject')"
                class="px-4 py-2 rounded-[4px] border border-[#ba1a1a] hover:bg-[#fff8f7] text-[#ba1a1a] text-[13px] font-medium transition-colors">
          Reject Request
        </button>
        <button onclick="handleDecision(${req.id}, 'approve')"
                class="px-4 py-2 rounded-[4px] bg-[#005da9] hover:bg-[#004884] text-white text-[13px] font-medium transition-colors shadow-xs">
          Approve Reassignment
        </button>
      </div>
    `;
  } else {
    actionsHtml = `
      <div class="pt-4 border-t border-[#e9e9e7] mt-auto text-[12px] text-[#787774] flex items-center justify-between">
        <span>Decision Recorded on ${decidedAtStr}</span>
        ${statusBadge}
      </div>
    `;
  }

  detailPanel.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between pb-3 border-b border-[#e9e9e7]">
        <div>
          <span class="text-[11px] font-semibold text-[#787774] uppercase">Reassignment Request #${req.id}</span>
          <h2 class="text-[18px] font-bold text-[#1d1c16]">${window.api.escapeHtml(emp.name || 'Employee')}</h2>
        </div>
        <div>${statusBadge}</div>
      </div>

      <div class="flex flex-col gap-4 mt-4 flex-1 overflow-y-auto pr-1">
        <!-- Employee Profile summary -->
        <div class="grid grid-cols-2 gap-3 p-3 rounded bg-[#f8f3ea]/50 border border-[#e9e9e7] text-[12px]">
          <div><span class="text-[#787774]">Role:</span> <span class="font-medium text-[#1d1c16]">${window.api.escapeHtml(emp.role || '—')}</span></div>
          <div><span class="text-[#787774]">Department:</span> <span class="font-medium text-[#1d1c16]">${window.api.escapeHtml(emp.department?.name || '—')}</span></div>
          <div><span class="text-[#787774]">Email:</span> <span class="text-[#1d1c16]">${window.api.escapeHtml(emp.email || '—')}</span></div>
          <div><span class="text-[#787774]">Contract Capacity:</span> <span class="font-medium text-[#1d1c16]">${emp.capacity || 40} hrs/week</span></div>
        </div>

        <!-- Shift comparison block -->
        <div class="border border-[#e9e9e7] rounded-[6px] p-4 bg-white">
          <div class="text-[12px] font-semibold text-[#787774] uppercase tracking-wider mb-3">
            Allocation Transition
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-3 rounded bg-[#F7F7F5] border border-[#e9e9e7]">
              <div class="text-[11px] text-[#787774] font-medium uppercase">Source Project</div>
              <div class="text-[14px] font-semibold text-[#1d1c16] mt-0.5">${window.api.escapeHtml(fromProj)}</div>
              <div class="text-[12px] text-[#787774] mt-1">${fromHours} hrs/week (will be closed)</div>
            </div>

            <div class="p-3 rounded bg-[#F1F7FC] border border-[#D3E5EF]">
              <div class="text-[11px] text-[#005da9] font-medium uppercase">Target Project</div>
              <div class="text-[14px] font-semibold text-[#005da9] mt-0.5">${window.api.escapeHtml(toProj)}</div>
              <div class="text-[12px] text-[#005da9] mt-1">${toHours} hrs/week (new allocation)</div>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-[#e9e9e7] flex items-center justify-between text-[12px]">
            <span class="text-[#787774]">Net Capacity Shift:</span>
            <span class="font-semibold text-[#1d1c16]">${diffStr}</span>
          </div>
        </div>

        <!-- Justification -->
        <div class="border border-[#e9e9e7] rounded-[6px] p-3.5 bg-white text-[13px]">
          <div class="text-[11px] font-semibold text-[#787774] uppercase tracking-wider mb-1">
            Requester Justification
          </div>
          <p class="text-[#1d1c16] m-0 italic">
            "${window.api.escapeHtml(req.justification || 'No justification provided.')}"
          </p>
          <div class="text-[11px] text-[#787774] mt-2">
            Submitted by ${window.api.escapeHtml(req.requestedBy?.name || 'Manager')} on ${createdAtStr}
          </div>
        </div>
      </div>

      ${actionsHtml}
    </div>
  `;
}
window.selectRequest = selectRequest;

async function handleDecision(id, action) {
  try {
    await window.api.decideApproval(id, action);
    alert(`Request #${id} successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
    loadApprovalData();
  } catch (err) {
    alert(`Failed to ${action} request: ${err.message}`);
  }
}
window.handleDecision = handleDecision;
