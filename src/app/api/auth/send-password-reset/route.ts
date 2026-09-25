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
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate password reset link
    const link = await admin.auth().generatePasswordResetLink(email);

    // In a production environment, you would send this link via email
    // For now, we'll return it in the response for testing
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)

    return NextResponse.json({
      success: true,
      message: 'Password reset link generated',
      link: link, // Remove this in production - should be sent via email
    });

  } catch (error: any) {
    console.error('Error generating password reset link:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate password reset link' },
      { status: 500 }
    );
  }
}
