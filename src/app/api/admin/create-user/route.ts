import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// Force this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const body = await request.json();
    const { email, password, name, role, teamId, studentId, recoveryPin } = body;

    // Validate required fields
    if (!email || !password || !name || !role || !teamId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if this is Mr. Willeby's account (superadmin)
    const isMrWilleby = email.toLowerCase() === 'kaseywilleby@gmail.com';
    const finalRole = isMrWilleby ? 'superadmin' : role;

    // Create user with Firebase Auth using Admin SDK
    console.log('[User Creation] Getting Firebase Auth...');
    const authStartTime = Date.now();
    const auth = getAdminAuth();

    console.log('[User Creation] Creating Firebase Auth user...');
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });
    console.log(`[User Creation] Auth user created in ${Date.now() - authStartTime}ms`);

    // Create Firestore user document
    const userData: any = {
      id: userRecord.uid,
      name: name,
      email: email,
      role: finalRole,
      teamId: teamId,
      username: name.replace(/\s+/g, '.'),
      avatarUrl: '',
      approved: (finalRole === 'superadmin' || finalRole === 'coach') ? true : false
    };

    // Only add studentId and recoveryPin for student users (not superadmin/coach)
    if (finalRole !== 'superadmin' && finalRole !== 'coach') {
      if (studentId) {
        userData.studentId = studentId;
      }
      if (recoveryPin) {
        userData.recoveryPin = recoveryPin;
      }
    }

    console.log('[User Creation] Writing to Firestore...');
    const dbStartTime = Date.now();
    const db = getAdminDb();
    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log(`[User Creation] Firestore write completed in ${Date.now() - dbStartTime}ms`);

    console.log(`[User Creation] Total time: ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      userId: userRecord.uid,
      message: 'User created successfully'
    });

  } catch (error: any) {
    console.error('Error creating user:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
