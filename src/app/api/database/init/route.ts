import { NextRequest, NextResponse } from 'next/server';
import databaseManager from '@/lib/database-server';

export async function POST(request: NextRequest) {
  try {
    await databaseManager.init();
    return NextResponse.json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
