import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Path to store decisions
const decisionsPath = path.join(process.cwd(), 'public', 'decisions.json');

/**
 * GET handler to retrieve saved screenshot decisions
 */
export async function GET() {
  try {
    // Check if decisions file exists
    if (!fs.existsSync(decisionsPath)) {
      // Return empty decisions if file doesn't exist
      return NextResponse.json({ decisions: {} });
    }
    
    // Read and parse the decisions file
    const rawData = fs.readFileSync(decisionsPath, 'utf-8');
    const decisions = JSON.parse(rawData);
    
    return NextResponse.json({ decisions });
  } catch (error) {
    console.error('Error reading decisions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve decisions' },
      { status: 500 }
    );
  }
}

/**
 * POST handler to save screenshot decisions
 */
export async function POST(request) {
  try {
    const { decisions } = await request.json();
    
    if (!decisions || typeof decisions !== 'object') {
      return NextResponse.json(
        { error: 'Invalid decisions data' },
        { status: 400 }
      );
    }
    
    // Make sure the public directory exists
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Save decisions to file
    fs.writeFileSync(decisionsPath, JSON.stringify(decisions, null, 2));
    
    // Calculate statistics
    const totalDecisions = Object.keys(decisions).length;
    const rebuildCount = Object.values(decisions).filter(v => v === true).length;
    const skipCount = totalDecisions - rebuildCount;
    
    return NextResponse.json({
      success: true,
      stats: {
        total: totalDecisions,
        rebuild: rebuildCount,
        skip: skipCount
      }
    });
  } catch (error) {
    console.error('Error saving decisions:', error);
    return NextResponse.json(
      { error: 'Failed to save decisions' },
      { status: 500 }
    );
  }
}
