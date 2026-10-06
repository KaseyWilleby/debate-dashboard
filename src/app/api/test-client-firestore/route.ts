import { NextResponse } from 'next/server';

// This uses client-side Firebase SDK on the server to mimic what the browser does
export async function GET() {
  try {
    // Import client-side Firebase SDK
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, collection, getDocs, query, limit } = await import('firebase/firestore');

    // Use the same config as the client
    const firebaseConfig = {
      projectId: "debate-dashboard",
      appId: "1:1029624329741:web:f064242d9f0ec880ea4744",
      storageBucket: "debate-dashboard.firebasestorage.app",
      apiKey: "AIzaSyBauNWN3vrIV5JdK6_MVzJwR-d2pnBUYz8",
      authDomain: "debate-dashboard.firebaseapp.com",
      messagingSenderId: "1029624329741",
      measurementId: "G-F77FZFJJ3R"
    };

    let app;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig, 'client-test');
    } else {
      app = getApps().find(a => a.name === 'client-test') || initializeApp(firebaseConfig, 'client-test');
    }

    const firestore = getFirestore(app);

    // Try to query appointments collection
    const appointmentsRef = collection(firestore, 'appointments');
    const q = query(appointmentsRef, limit(5));
    const snapshot = await getDocs(q);

    return NextResponse.json({
      success: true,
      count: snapshot.size,
      message: 'Client SDK can access appointments from server',
      docs: snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      stack: error.stack,
    }, { status: 500 });
  }
}
