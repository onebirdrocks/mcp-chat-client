import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schemas
const AccessibilityPreferencesSchema = z.object({
  highContrast: z.boolean(),
  reducedMotion: z.boolean(),
  screenReaderAnnouncements: z.boolean(),
  keyboardNavigation: z.boolean(),
  focusVisible: z.boolean(),
  largeText: z.boolean(),
});

const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.enum(['en', 'zh']),
  autoScroll: z.boolean(),
  soundEnabled: z.boolean(),
  accessibility: AccessibilityPreferencesSchema.optional(),
});

const PreferencesUpdateSchema = z.object({
  preferences: UserPreferencesSchema.partial(),
});

// GET /api/preferences - Get user preferences
export async function GET(_request: NextRequest) {
  try {
    // In a real implementation, you might load preferences from a database
    // For now, we'll return default preferences as the client manages them
    const defaultPreferences = {
      theme: 'system',
      language: 'en',
      autoScroll: true,
      soundEnabled: false,
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReaderAnnouncements: true,
        keyboardNavigation: true,
        focusVisible: true,
        largeText: false,
      },
    };

    return NextResponse.json({
      success: true,
      preferences: defaultPreferences,
    });
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/preferences - Update user preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = PreferencesUpdateSchema.parse(body);
    
    // In a real implementation, you would save preferences to a database
    // For now, we'll just validate and return success
    console.log('Preferences update request:', validatedData);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: validatedData.preferences,
    });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid preferences data',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/preferences - Replace all user preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate complete preferences object
    const validatedPreferences = UserPreferencesSchema.parse(body);
    
    // In a real implementation, you would replace all preferences in the database
    console.log('Preferences replacement request:', validatedPreferences);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({
      success: true,
      message: 'Preferences replaced successfully',
      preferences: validatedPreferences,
    });
  } catch (error) {
    console.error('Failed to replace preferences:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid preferences data',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to replace preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/preferences - Reset preferences to defaults
export async function DELETE(_request: NextRequest) {
  try {
    const defaultPreferences = {
      theme: 'system',
      language: 'en',
      autoScroll: true,
      soundEnabled: false,
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReaderAnnouncements: true,
        keyboardNavigation: true,
        focusVisible: true,
        largeText: false,
      },
    };
    
    // In a real implementation, you would reset preferences in the database
    console.log('Preferences reset request');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({
      success: true,
      message: 'Preferences reset to defaults',
      preferences: defaultPreferences,
    });
  } catch (error) {
    console.error('Failed to reset preferences:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}