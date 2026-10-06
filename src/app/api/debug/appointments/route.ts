import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb();

    // Try to query each collection
    const results: any = {
      timestamp: new Date().toISOString(),
      collections: {},
    };

    // Check workspaces
    const workspacesSnapshot = await db.collection('workspaces').limit(5).get();
    results.collections.workspaces = {
      count: workspacesSnapshot.size,
      docs: workspacesSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
    };

    // Check appointmentWindows
    const windowsSnapshot = await db.collection('appointmentWindows').limit(5).get();
    results.collections.appointmentWindows = {
      count: windowsSnapshot.size,
      docs: windowsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
    };

    // Check appointments
    const appointmentsSnapshot = await db.collection('appointments').limit(5).get();
    results.collections.appointments = {
      count: appointmentsSnapshot.size,
      docs: appointmentsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
    };

    // Check officerAvailability
    const availabilitySnapshot = await db.collection('officerAvailability').limit(5).get();
    results.collections.officerAvailability = {
      count: availabilitySnapshot.size,
      docs: availabilitySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
    };

    // Try a team-specific query
    const teamQuery = await db.collection('workspaces')
      .where('teamId', '==', 'cywoods')
      .limit(5)
      .get();
    results.collections.workspaces_cywoods = {
      count: teamQuery.size,
      docs: teamQuery.docs.map(doc => ({ id: doc.id, data: doc.data() })),
    };

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
