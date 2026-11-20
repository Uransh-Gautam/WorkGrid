// backend/prisma/seed.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding WorkGrid database...');

  // 1. Clean existing records safely in order of foreign key dependency
  await prisma.allocationHistory.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();

  // 2. Departments (4 realistic engineering departments)
  const platform = await prisma.department.create({ data: { name: 'Platform Engineering' } });
  const coreProduct = await prisma.department.create({ data: { name: 'Core Product' } });
  const infra = await prisma.department.create({ data: { name: 'Infrastructure' } });
  const analytics = await prisma.department.create({ data: { name: 'Analytics' } });

  // 3. Employees (10 employees, one manager "Uransh Gautam")
  const uransh = await prisma.employee.create({
    data: {
      name: 'Uransh Gautam',
      email: 'uransh.gautam@workgrid.internal',
      role: 'Engineering Manager',
      capacity: 40,
      departmentId: platform.id,
      createdAt: new Date('2026-10-01T09:00:00Z'),
    },
  });

  const puneet = await prisma.employee.create({
    data: {
      name: 'Puneet Kumar',
      email: 'puneet.kumar@workgrid.internal',
      role: 'Senior Backend Engineer',
      capacity: 40,
      departmentId: platform.id,
      managerId: uransh.id,
      createdAt: new Date('2026-10-05T09:00:00Z'),
    },
  });

  const varun = await prisma.employee.create({
    data: {
      name: 'Varun Adwani',
      email: 'varun.adwani@workgrid.internal',
      role: 'Full Stack Engineer',
      capacity: 40,
      departmentId: coreProduct.id,
      managerId: uransh.id,
      createdAt: new Date('2026-10-08T09:00:00Z'),
    },
  });

  const shlok = await prisma.employee.create({
    data: {
      name: 'Shlok Srivastava',
      email: 'shlok.srivastava@workgrid.internal',
      role: 'DevOps & SRE',
      capacity: 40,
      departmentId: infra.id,
      managerId: uransh.id,
      createdAt: new Date('2026-10-10T09:00:00Z'),
    },
  });

  const aanya = await prisma.employee.create({
    data: {
      name: 'Aanya Verma',
      email: 'aanya.verma@workgrid.internal',
      role: 'UI/UX Systems Engineer',
      capacity: 40,
      departmentId: coreProduct.id,
      managerId: uransh.id,
      createdAt: new Date('2026-10-12T09:00:00Z'),
    },
  });

  const marcus = await prisma.employee.create({
    data: {
      name: 'Marcus Chen',
      email: 'marcus.chen@workgrid.internal',
      role: 'Security Engineer',
      capacity: 40,
      departmentId: infra.id,
      managerId: uransh.id,
      createdAt: new Date('2026-10-15T09:00:00Z'),
    },
  });

  const maya = await prisma.employee.create({
    data: {
      name: 'Maya Lin',
      email: 'maya.lin@workgrid.internal',
      role: 'Product Engineer',
      capacity: 40,
      departmentId: coreProduct.id,
      managerId: uransh.id,
      createdAt: new Date('2026-10-16T09:00:00Z'),
    },
  });

  const priya = await prisma.employee.create({
    data: {
      name: 'Priya Patel',
      email: 'priya.patel@workgrid.internal',
      role: 'API Engineer',
      capacity: 40,
      departmentId: platform.id,
      managerId: uransh.id,
      createdAt: new Date('2026-10-18T09:00:00Z'),
    },
  });

  const rohan = await prisma.employee.create({
    data: {
      name: 'Rohan Mehta',
      email: 'rohan.mehta@workgrid.internal',
      role: 'Data Analyst',
      capacity: 40,
      departmentId: analytics.id,
      managerId: uransh.id,
      createdAt: new Date('2026-10-20T09:00:00Z'),
    },
  });

  const elena = await prisma.employee.create({
    data: {
      name: 'Elena Rostova',
      email: 'elena.rostova@workgrid.internal',
      role: 'Junior Frontend Engineer',
      capacity: 40,
      departmentId: coreProduct.id,
      managerId: uransh.id,
      createdAt: new Date('2026-10-25T09:00:00Z'),
    },
  });

  // 4. Projects (5 realistic projects)
  const apollo = await prisma.project.create({
    data: { name: 'Apollo API Gateway', status: 'In Progress' },
  });
  const hermes = await prisma.project.create({
    data: { name: 'Hermes Event Broker', status: 'In Progress' },
  });
  const designSys = await prisma.project.create({
    data: { name: 'Design System Tokens', status: 'In Progress' },
  });
  const secHardening = await prisma.project.create({
    data: { name: 'Security Hardening V2', status: 'In Progress' },
  });
  const analyticsPipeline = await prisma.project.create({
    data: { name: 'Analytics Pipeline', status: 'Planning' },
  });

  // 5. Active Allocations
  // At least 2 Overloaded (>40h), 3 Free (<20h), rest Active (20-40h)
  // Overloaded 1: Puneet Kumar (24h + 20h = 44h)
  const allocPuneet1 = await prisma.allocation.create({
    data: {
      employeeId: puneet.id,
      projectId: apollo.id,
      hoursPerWeek: 24,
      status: 'Active',
      startedAt: new Date('2026-11-01T10:00:00Z'),
    },
  });
  await prisma.allocation.create({
    data: {
      employeeId: puneet.id,
      projectId: hermes.id,
      hoursPerWeek: 20,
      status: 'Active',
      startedAt: new Date('2026-11-03T10:00:00Z'),
    },
  });

  // Overloaded 2: Varun Adwani (22h + 20h = 42h)
  const allocVarun1 = await prisma.allocation.create({
    data: {
      employeeId: varun.id,
      projectId: designSys.id,
      hoursPerWeek: 22,
      status: 'Active',
      startedAt: new Date('2026-11-02T10:00:00Z'),
    },
  });
  await prisma.allocation.create({
    data: {
      employeeId: varun.id,
      projectId: apollo.id,
      hoursPerWeek: 20,
      status: 'Active',
      startedAt: new Date('2026-11-04T10:00:00Z'),
    },
  });

  // Active 1: Shlok Srivastava (36h)
  const allocShlok1 = await prisma.allocation.create({
    data: {
      employeeId: shlok.id,
      projectId: secHardening.id,
      hoursPerWeek: 36,
      status: 'Active',
      startedAt: new Date('2026-11-01T10:00:00Z'),
    },
  });

  // Active 2: Aanya Verma (32h)
  await prisma.allocation.create({
    data: {
      employeeId: aanya.id,
      projectId: designSys.id,
      hoursPerWeek: 32,
      status: 'Active',
      startedAt: new Date('2026-11-02T10:00:00Z'),
    },
  });

  // Active 3: Marcus Chen (28h)
  await prisma.allocation.create({
    data: {
      employeeId: marcus.id,
      projectId: secHardening.id,
      hoursPerWeek: 28,
      status: 'Active',
      startedAt: new Date('2026-11-01T10:00:00Z'),
    },
  });

  // Active 4: Maya Lin (30h)
  await prisma.allocation.create({
    data: {
      employeeId: maya.id,
      projectId: designSys.id,
      hoursPerWeek: 30,
      status: 'Active',
      startedAt: new Date('2026-11-02T10:00:00Z'),
    },
  });

  // Active 5: Priya Patel (24h)
  await prisma.allocation.create({
    data: {
      employeeId: priya.id,
      projectId: apollo.id,
      hoursPerWeek: 24,
      status: 'Active',
      startedAt: new Date('2026-11-03T10:00:00Z'),
    },
  });

  // Free 1: Uransh Gautam (Manager - 10h)
  await prisma.allocation.create({
    data: {
      employeeId: uransh.id,
      projectId: apollo.id,
      hoursPerWeek: 10,
      status: 'Active',
      startedAt: new Date('2026-11-01T10:00:00Z'),
    },
  });

  // Free 2: Rohan Mehta (16h)
  await prisma.allocation.create({
    data: {
      employeeId: rohan.id,
      projectId: analyticsPipeline.id,
      hoursPerWeek: 16,
      status: 'Active',
      startedAt: new Date('2026-11-04T10:00:00Z'),
    },
  });

  // Free 3: Elena Rostova (12h)
  const allocElena1 = await prisma.allocation.create({
    data: {
      employeeId: elena.id,
      projectId: designSys.id,
      hoursPerWeek: 12,
      status: 'Active',
      startedAt: new Date('2026-11-05T10:00:00Z'),
    },
  });

  // 6. Allocation History entries
  await prisma.allocationHistory.createMany({
    data: [
      {
        allocationId: allocPuneet1.id,
        employeeId: puneet.id,
        changeType: 'Created',
        details: 'Assigned 24h/wk to Apollo API Gateway',
        changedAt: new Date('2026-11-01T10:00:00Z'),
      },
      {
        allocationId: allocVarun1.id,
        employeeId: varun.id,
        changeType: 'Created',
        details: 'Assigned 22h/wk to Design System Tokens',
        changedAt: new Date('2026-11-02T10:00:00Z'),
      },
      {
        allocationId: allocShlok1.id,
        employeeId: shlok.id,
        changeType: 'Created',
        details: 'Assigned 36h/wk to Security Hardening V2',
        changedAt: new Date('2026-11-01T10:00:00Z'),
      },
      {
        allocationId: allocElena1.id,
        employeeId: elena.id,
        changeType: 'Created',
        details: 'Assigned 12h/wk to Design System Tokens',
        changedAt: new Date('2026-11-05T10:00:00Z'),
      },
    ],
  });

  // 7. 3 Pending Approval Requests
  await prisma.approvalRequest.create({
    data: {
      employeeId: puneet.id,
      fromAllocationId: allocPuneet1.id,
      toProjectId: hermes.id,
      hoursPerWeek: 20,
      justification: 'Critical need for broker throughput optimization during Q4 peak load.',
      requestedById: uransh.id,
      status: 'Pending',
      createdAt: new Date('2026-11-12T14:30:00Z'),
    },
  });

  await prisma.approvalRequest.create({
    data: {
      employeeId: elena.id,
      fromAllocationId: allocElena1.id,
      toProjectId: apollo.id,
      hoursPerWeek: 15,
      justification: 'Transitioning to API documentation and consumer onboarding tooling.',
      requestedById: uransh.id,
      status: 'Pending',
      createdAt: new Date('2026-11-12T16:15:00Z'),
    },
  });

  await prisma.approvalRequest.create({
    data: {
      employeeId: varun.id,
      fromAllocationId: allocVarun1.id,
      toProjectId: analyticsPipeline.id,
      hoursPerWeek: 18,
      justification: 'Assisting analytics team with full-stack dashboard integration.',
      requestedById: uransh.id,
      status: 'Pending',
      createdAt: new Date('2026-11-13T01:10:00Z'),
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
