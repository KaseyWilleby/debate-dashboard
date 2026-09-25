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
    const { userId, newPassword } = body;

    // Validate required fields
    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and newPassword' },
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

    // Update user password using Firebase Admin
    await admin.auth().updateUser(userId, {
      password: newPassword,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error: any) {
    console.error('Error resetting password:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
