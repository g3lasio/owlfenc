/**
 * Script to create test approved projects in the database
 * for testing the "Select Approved Project" functionality
 */

import { storage } from './server/storage.ts';

async function createTestProjects() {
  console.log('Creating test approved projects...');

  const testProjects = [
    {
      userId: 1,
      projectId: 'PROJ-2025-001',
      clientName: 'John Smith',
      clientEmail: 'john.smith@email.com',
      clientPhone: '(555) 123-4567',
      address: '123 Main Street, Los Angeles, CA 90210',
      projectType: 'Fence Installation',
      projectSubtype: 'Wood Privacy Fence',
      projectDescription: 'Installation of 6-foot cedar privacy fence around backyard perimeter',
      projectScope: 'Install 150 linear feet of cedar privacy fence with 2 gates',
      fenceType: 'Wood Fence',
      length: 150,
      height: 6,
      gates: [
        { type: 'Single Gate', width: 36, height: 72, hardware: 'Standard Lock' },
        { type: 'Double Gate', width: 72, height: 72, hardware: 'Premium Lock' }
      ],
      additionalDetails: 'Customer prefers natural cedar finish, requires completion before summer',
      materialsList: [
        { name: 'Cedar Fence Boards', quantity: 75, unit: 'pieces' },
        { name: 'Fence Posts', quantity: 25, unit: 'pieces' },
        { name: 'Hardware Kit', quantity: 2, unit: 'sets' }
      ],
      laborHours: 24,
      totalPrice: 850000, // $8,500.00 in cents
      status: 'approved',
      paymentStatus: 'partial',
      paymentDetails: {
        totalPaid: 255000, // $2,550.00 (30% deposit)
        history: [
          { date: new Date('2025-05-15'), amount: 255000, method: 'Credit Card' }
        ]
      },
      scheduledDate: new Date('2025-06-15'),
      createdAt: new Date('2025-05-01'),
      internalNotes: 'Priority project - customer is referral from previous client',
      clientNotes: 'Please coordinate with HOA for approval'
    },
    {
      userId: 1,
      projectId: 'PROJ-2025-002',
      clientName: 'Maria Rodriguez',
      clientEmail: 'maria.rodriguez@email.com',
      clientPhone: '(555) 987-6543',
      address: '456 Oak Avenue, Beverly Hills, CA 90212',
      projectType: 'Fence Installation',
      projectSubtype: 'Iron Decorative Fence',
      projectDescription: 'Custom wrought iron fence installation for front yard',
      projectScope: 'Install 80 linear feet of decorative iron fence with ornate gate',
      fenceType: 'Iron Fence',
      length: 80,
      height: 5,
      gates: [
        { type: 'Ornate Gate', width: 48, height: 60, hardware: 'Decorative Lock' }
      ],
      additionalDetails: 'Custom design to match existing architecture, black powder coating',
      materialsList: [
        { name: 'Wrought Iron Panels', quantity: 16, unit: 'panels' },
        { name: 'Iron Posts', quantity: 9, unit: 'pieces' },
        { name: 'Decorative Hardware', quantity: 1, unit: 'set' }
      ],
      laborHours: 32,
      totalPrice: 1200000, // $12,000.00 in cents
      status: 'approved',
      paymentStatus: 'deposit_paid',
      paymentDetails: {
        totalPaid: 360000, // $3,600.00 (30% deposit)
        history: [
          { date: new Date('2025-05-20'), amount: 360000, method: 'Bank Transfer' }
        ]
      },
      scheduledDate: new Date('2025-06-20'),
      createdAt: new Date('2025-05-10'),
      internalNotes: 'High-value project, ensure quality materials',
      clientNotes: 'Architect approval required for final design'
    },
    {
      userId: 1,
      projectId: 'PROJ-2025-003',
      clientName: 'David Wilson',
      clientEmail: 'david.wilson@email.com',
      clientPhone: '(555) 456-7890',
      address: '789 Pine Street, Santa Monica, CA 90401',
      projectType: 'Fence Installation',
      projectSubtype: 'Chain Link Commercial',
      projectDescription: 'Commercial chain link fence for business property security',
      projectScope: 'Install 200 linear feet of chain link fence with security features',
      fenceType: 'Chain Link Fence',
      length: 200,
      height: 8,
      gates: [
        { type: 'Security Gate', width: 12, height: 96, hardware: 'Security Lock System' }
      ],
      additionalDetails: 'Galvanized steel, barbed wire top, security gate with access control',
      materialsList: [
        { name: 'Chain Link Mesh', quantity: 200, unit: 'linear feet' },
        { name: 'Steel Posts', quantity: 35, unit: 'pieces' },
        { name: 'Security Hardware', quantity: 1, unit: 'system' }
      ],
      laborHours: 16,
      totalPrice: 650000, // $6,500.00 in cents
      status: 'completed',
      paymentStatus: 'paid',
      paymentDetails: {
        totalPaid: 650000, // $6,500.00 (full payment)
        history: [
          { date: new Date('2025-04-15'), amount: 195000, method: 'Check' },
          { date: new Date('2025-05-30'), amount: 455000, method: 'Bank Transfer' }
        ]
      },
      scheduledDate: new Date('2025-05-01'),
      completedDate: new Date('2025-05-28'),
      createdAt: new Date('2025-04-01'),
      internalNotes: 'Completed ahead of schedule, customer very satisfied',
      clientNotes: 'Excellent work, will recommend to other businesses'
    }
  ];

  try {
    for (const project of testProjects) {
      const createdProject = await storage.createProject(project);
      console.log(`Created project: ${createdProject.projectId} for ${createdProject.clientName}`);
    }
    
    console.log('✅ All test projects created successfully!');
    console.log('\nProjects created:');
    console.log('1. John Smith - Wood Privacy Fence ($8,500)');
    console.log('2. Maria Rodriguez - Iron Decorative Fence ($12,000)');
    console.log('3. David Wilson - Chain Link Commercial Fence ($6,500) [COMPLETED]');
    
  } catch (error) {
    console.error('❌ Error creating test projects:', error);
  }
}

// Run the script
createTestProjects().then(() => {
  console.log('\nTest data creation complete. You can now test the "Select Approved Project" feature.');
}).catch(console.error);