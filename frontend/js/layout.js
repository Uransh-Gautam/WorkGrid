// frontend/js/layout.js
// Shared Layout: Injects the navigation sidebar and top header dynamically on every page.
// Adheres to DRY (Don't Repeat Yourself) principle.

(function () {
  function getActivePage() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('employee')) return 'employees';
    if (path.includes('project')) return 'projects';
    if (path.includes('allocation')) return 'allocations';
    if (path.includes('approval')) return 'approvals';
    return 'dashboard';
  }

  function getPageUrl(target) {
    // Both clean paths (/employees) and file paths (employees.html) work with Express static serving
    if (window.location.protocol.startsWith('http')) {
      return `/${target}.html`;
    }
    return `${target}.html`;
  }

  function injectLayout() {
    const active = getActivePage();

    // 1. Sidebar Navigation
    const sidebar = document.createElement('aside');
    sidebar.className =
      'fixed left-0 top-0 h-full w-[240px] bg-[#f8f3ea] border-r border-[#c0c7d4]/30 z-40 flex flex-col justify-between select-none';

    sidebar.innerHTML = `
      <div class="flex flex-col">
        <!-- Logo / Workspace Name -->
        <div class="px-3 py-3 mx-2 my-2 rounded-[4px] flex items-center justify-between select-none">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-6 h-6 rounded-[3px] bg-[#005da9] flex items-center justify-center text-white text-[12px] font-semibold leading-none shadow-sm">
              W
            </div>
            <span class="text-[14px] tracking-tight text-[#1d1c16] font-semibold truncate">
              WorkGrid
            </span>
          </div>
        </div>

        <!-- Navigation Links (Exactly 5 scope pages) -->
        <nav class="flex flex-col gap-1 px-2 pt-2">
          <div class="px-2.5 pb-1 pt-1 text-[11px] font-semibold text-[#787774] tracking-wider uppercase">
            Workforce Features
          </div>

          <!-- 1. Dashboard -->
          <a href="${getPageUrl('dashboard')}"
             class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-[13.5px] transition-colors ${
               active === 'dashboard'
                 ? 'bg-[#EFEFED] text-[#1d1c16] font-semibold shadow-xs'
                 : 'text-[#5A5A58] hover:bg-[#EFEFED]/80 hover:text-[#1d1c16]'
             }">
            <span class="material-symbols-outlined text-[18px] ${active === 'dashboard' ? 'text-[#1d1c16]' : 'text-[#787774]'}">grid_view</span>
            <span>Dashboard</span>
          </a>

          <!-- 2. Employees -->
          <a href="${getPageUrl('employees')}"
             class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-[13.5px] transition-colors ${
               active === 'employees'
                 ? 'bg-[#EFEFED] text-[#1d1c16] font-semibold shadow-xs'
                 : 'text-[#5A5A58] hover:bg-[#EFEFED]/80 hover:text-[#1d1c16]'
             }">
            <span class="material-symbols-outlined text-[18px] ${active === 'employees' ? 'text-[#1d1c16]' : 'text-[#787774]'}">badge</span>
            <span>Employees</span>
          </a>

          <!-- 3. Projects -->
          <a href="${getPageUrl('projects')}"
             class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-[13.5px] transition-colors ${
               active === 'projects'
                 ? 'bg-[#EFEFED] text-[#1d1c16] font-semibold shadow-xs'
                 : 'text-[#5A5A58] hover:bg-[#EFEFED]/80 hover:text-[#1d1c16]'
             }">
            <span class="material-symbols-outlined text-[18px] ${active === 'projects' ? 'text-[#1d1c16]' : 'text-[#787774]'}">folder_open</span>
            <span>Projects</span>
          </a>

          <!-- 4. Allocations -->
          <a href="${getPageUrl('allocations')}"
             class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-[13.5px] transition-colors ${
               active === 'allocations'
                 ? 'bg-[#EFEFED] text-[#1d1c16] font-semibold shadow-xs'
                 : 'text-[#5A5A58] hover:bg-[#EFEFED]/80 hover:text-[#1d1c16]'
             }">
            <span class="material-symbols-outlined text-[18px] ${active === 'allocations' ? 'text-[#1d1c16]' : 'text-[#787774]'}">tune</span>
            <span>Allocations</span>
          </a>

          <!-- 5. Approvals -->
          <a href="${getPageUrl('approvals')}"
             class="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-[13.5px] transition-colors ${
               active === 'approvals'
                 ? 'bg-[#EFEFED] text-[#1d1c16] font-semibold shadow-xs'
                 : 'text-[#5A5A58] hover:bg-[#EFEFED]/80 hover:text-[#1d1c16]'
             }">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-[18px] ${active === 'approvals' ? 'text-[#1d1c16]' : 'text-[#787774]'}">check_circle</span>
              <span>Approvals</span>
            </div>
            <span id="sidebar-approvals-badge" class="hidden px-1.5 py-0.2 rounded text-[11px] font-semibold bg-[#FFE2DD] text-[#5D1715]">
              0
            </span>
          </a>
        </nav>
      </div>

      <!-- Current User Footer in Sidebar -->
      <div class="p-2 border-t border-[#c0c7d4]/30 mb-1">
        <div class="flex items-center gap-2.5 p-2 rounded-[4px] bg-[#f3ede4]/60">
          <div class="w-7 h-7 rounded-full bg-[#005da9] text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
            UG
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-[13px] text-[#1d1c16] font-medium truncate leading-tight">
              Uransh Gautam
            </span>
            <span class="text-[11px] text-[#787774] truncate leading-tight">
              Manager
            </span>
          </div>
        </div>
      </div>
    `;

    // 2. Top Header Bar
    const header = document.createElement('header');
    header.className =
      'fixed top-0 left-[240px] right-0 h-14 bg-white/95 backdrop-blur-sm border-b border-[#c0c7d4]/30 z-30 flex items-center justify-between px-6';

    const pageLabels = {
      dashboard: 'Executive Dashboard',
      employees: 'Workforce & Capacity',
      projects: 'Project Portfolio',
      allocations: 'Resource Allocations',
      approvals: 'Manager Approvals',
    };

    header.innerHTML = `
      <div class="flex items-center gap-2 text-[13px] text-[#787774]">
        <span>WorkGrid</span>
        <span class="text-[#c0c7d4]">/</span>
        <span class="text-[#1d1c16] font-medium">${pageLabels[active] || 'Workspace'}</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 py-1 px-2.5 rounded bg-[#f8f3ea] border border-[#c0c7d4]/30">
          <div class="w-5 h-5 rounded-full bg-[#005da9] text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
            UG
          </div>
          <span class="text-[13px] text-[#1d1c16] font-medium">Uransh Gautam, Manager</span>
        </div>
      </div>
    `;

    // Remove duplicates if already injected
    document.querySelector('aside')?.remove();
    document.querySelector('header')?.remove();

    document.body.prepend(header);
    document.body.prepend(sidebar);

    // Dynamic approvals count badge
    if (window.api && window.api.getApprovals) {
      window.api.getApprovals('Pending')
        .then((items) => {
          const badge = document.getElementById('sidebar-approvals-badge');
          if (badge && Array.isArray(items) && items.length > 0) {
            badge.textContent = items.length;
            badge.classList.remove('hidden');
          }
        })
        .catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectLayout);
  } else {
    injectLayout();
  }
})();
