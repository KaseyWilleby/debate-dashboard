import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Force this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not configured. Please add credentials to .env file.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, studentId, name, pin, newPassword } = body;

    // Validate required fields
    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and new password are required' },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Search for user in Firestore by email
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // Verify the user is a student (not superadmin or coach)
    if (userData.role === 'superadmin' || userData.role === 'coach') {
      return NextResponse.json(
        { error: 'This recovery method is only available for student accounts. Please use email recovery or contact your coach.' },
        { status: 403 }
      );
    }

    // Verify credentials - either PIN OR (studentId + name)
    let isVerified = false;

    if (pin && userData.recoveryPin) {
      // Method 1: Verify with PIN
      if (pin === userData.recoveryPin) {
        isVerified = true;
      }
    } else if (studentId && name) {
      // Method 2: Verify with student ID and name
      const nameMatch = userData.name?.toLowerCase() === name.toLowerCase();
      const idMatch = userData.studentId === studentId;

      if (nameMatch && idMatch) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      return NextResponse.json(
        { error: 'Verification failed. Please check your information and try again.' },
        { status: 401 }
      );
    }

    // Reset password using Firebase Admin
    await admin.auth().updateUser(userDoc.id, {
      password: newPassword,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error: any) {
    console.error('Error recovering password:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to recover password' },
      { status: 500 }
    );
  }
}
