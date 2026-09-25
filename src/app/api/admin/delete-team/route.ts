import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { teamId, token } = await request.json();

    if (!teamId || !token) {
      return NextResponse.json(
        { error: 'Team ID and authentication token are required' },
        { status: 400 }
      );
    }

    // Verify the user is a superadmin
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only superadmins can delete teams' },
        { status: 403 }
      );
    }

    // Get all users associated with this team
    const usersSnapshot = await adminDb
      .collection('users')
      .where('teamId', '==', teamId)
      .get();

    // Delete all users in batches (Firestore has a limit of 500 operations per batch)
    const batch = adminDb.batch();
    let operationCount = 0;
    const batches: FirebaseFirestore.WriteBatch[] = [batch];

    usersSnapshot.docs.forEach((doc) => {
      if (operationCount >= 500) {
        batches.push(adminDb.batch());
        operationCount = 0;
      }
      batches[batches.length - 1].delete(doc.ref);
      operationCount++;
    });

    // Delete the team document
    if (operationCount >= 500) {
      batches.push(adminDb.batch());
      operationCount = 0;
    }
    const teamRef = adminDb.collection('teams').doc(teamId);
    batches[batches.length - 1].delete(teamRef);

    // Commit all batches
    await Promise.all(batches.map(b => b.commit()));

    return NextResponse.json({
      success: true,
      message: `Team and ${usersSnapshot.size} associated users deleted successfully`,
      deletedUsersCount: usersSnapshot.size,
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete team' },
      { status: 500 }
    );
  }
}
