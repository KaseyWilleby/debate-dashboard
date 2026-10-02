import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// Force this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Starting to seed appointment collections...');
    const db = getAdminDb();

    // Get teamId from request body (default to cywoods if not provided)
    const body = await request.json().catch(() => ({}));
    const teamId = body.teamId || 'cywoods';

    // 1. Create a sample workspace
    console.log('Creating sample workspace...');
    const workspaceRef = db.collection('workspaces').doc();
    await workspaceRef.set({
      name: 'Main Office',
      description: 'Primary coaching office for appointments',
      teamId: teamId,
      capacity: 4,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
    });
    console.log('✅ Created workspace:', workspaceRef.id);

    // 2. Create a sample appointment window
    console.log('Creating sample appointment window...');
    const windowRef = db.collection('appointmentWindows').doc();
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    await windowRef.set({
      name: 'Weekly Office Hours',
      workspaceId: workspaceRef.id,
      teamId: teamId,
      startDate: today.toISOString(),
      endDate: nextWeek.toISOString(),
      startTime: '14:00', // 2:00 PM
      endTime: '17:00',   // 5:00 PM
      slotDuration: 30,   // 30 minutes
      daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
    });
    console.log('✅ Created appointment window:', windowRef.id);

    // 3. Create placeholder for appointments collection
    console.log('Creating appointments collection placeholder...');
    const appointmentRef = db.collection('appointments').doc('_placeholder');
    await appointmentRef.set({
      isPlaceholder: true,
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Created appointments collection');

    // 4. Create placeholder for officerAvailability collection
    console.log('Creating officerAvailability collection placeholder...');
    const availRef = db.collection('officerAvailability').doc('_placeholder');
    await availRef.set({
      isPlaceholder: true,
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Created officerAvailability collection');

    console.log('🎉 Successfully seeded all appointment collections!');

    return NextResponse.json({
      success: true,
      message: 'Appointment collections seeded successfully',
      collections: {
        workspaces: { created: 1, id: workspaceRef.id },
        appointmentWindows: { created: 1, id: windowRef.id },
        appointments: { created: 1, note: 'Placeholder document - can be deleted later' },
        officerAvailability: { created: 1, note: 'Placeholder document - can be deleted later' },
      }
    });

  } catch (error: any) {
    console.error('❌ Error seeding collections:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed collections' },
      { status: 500 }
    );
  }
}
