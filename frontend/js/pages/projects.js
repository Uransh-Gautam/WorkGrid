// frontend/js/pages/projects.js
// Logic for the Projects portfolio page.
// Renders active projects, headcounts, hours, and handles the New Project modal.

document.addEventListener('DOMContentLoaded', () => {
  setupModalEvents();
  loadProjectList();
});

async function loadProjectList() {
  const container = document.getElementById('projects-table-container');

  try {
    const projects = await window.api.getProjects();

    if (!projects || projects.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-[#787774] text-[13px]">
          No projects registered yet. Click "New project" to create one.
        </div>
      `;
      return;
    }

    const rows = projects
      .map((p) => {
        let statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#D3E5EF] text-[#183347]">In Progress</span>`;
        if (p.status === 'Planning') {
          statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FBF3DB] text-[#492F24]">Planning</span>`;
        } else if (p.status === 'Completed') {
          statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#E3E2E0] text-[#32302C]">Completed</span>`;
        }

        const people = p.peopleCount || 0;
        const hours = p.hoursUsed || 0;

        return `
          <tr class="h-10 hover:bg-[#F7F7F5] transition-colors">
            <td class="py-2.5 px-3.5 border-r border-[#e9e9e7] font-medium text-[#1d1c16]">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-[#787774]">folder</span>
                <span>${window.api.escapeHtml(p.name)}</span>
              </div>
            </td>
            <td class="py-2.5 px-3.5 border-r border-[#e9e9e7]">
              ${statusBadge}
            </td>
            <td class="py-2.5 px-3.5 border-r border-[#e9e9e7] text-[#787774] text-[13px]">
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[15px]">group</span>
                <span>${people} ${people === 1 ? 'person' : 'people'}</span>
              </span>
            </td>
            <td class="py-2.5 px-3.5 text-right font-medium text-[#1d1c16] text-[13px]">
              ${hours} hrs/week
            </td>
          </tr>
        `;
      })
      .join('');

    container.innerHTML = `
      <table class="w-full text-left border-collapse">
        <thead class="bg-[#F7F7F5] border-b border-[#e9e9e7] text-[12px] font-medium text-[#787774]">
          <tr class="h-8">
            <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-2/5">Project name</th>
            <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/5">Status</th>
            <th class="px-3.5 font-normal border-r border-[#e9e9e7] w-1/5">Number of people</th>
            <th class="px-3.5 font-normal text-right w-1/5">Hours used</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#e9e9e7] text-[13px]">
          ${rows}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading projects:', error);
    container.innerHTML = `
      <div class="p-8 text-center text-[#ba1a1a] text-[13px] bg-[#fff8f7]">
        <span class="material-symbols-outlined text-[20px] mb-1">error</span><br>
        ${window.api.escapeHtml(error.message || 'Cannot reach the server or database.')}
      </div>
    `;
  }
}

function setupModalEvents() {
  const modal = document.getElementById('new-project-modal');
  const openBtn = document.getElementById('open-new-project-modal-btn');
  const closeBtn = document.getElementById('close-project-modal-btn');
  const cancelBtn = document.getElementById('cancel-project-modal-btn');
  const form = document.getElementById('new-project-form');
  const formError = document.getElementById('new-project-form-error');

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
      status: formData.get('status'),
    };

    try {
      await window.api.createProject(payload);
      close();
      loadProjectList();
    } catch (err) {
      formError.textContent = err.message || 'Failed to create project';
      formError.classList.remove('hidden');
    }
  });
}
