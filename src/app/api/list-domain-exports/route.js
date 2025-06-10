import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const domainsDir = path.join(process.cwd(), 'domains');
    
    // Create domains directory if it doesn't exist
    if (!fs.existsSync(domainsDir)) {
      fs.mkdirSync(domainsDir, { recursive: true });
      return NextResponse.json({
        success: true,
        files: []
      });
    }
    
    const domainFiles = fs.readdirSync(domainsDir)
      .map(file => {
        const filePath = path.join(domainsDir, file);
        const stats = fs.statSync(filePath);
        let domainCount = 0;
        
        // If it's a txt file, count domains
        if (file.endsWith('.txt')) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            domainCount = content.split('\n')
              .filter(line => line.trim().length > 0).length;
          } catch (err) {
            console.error(`Error reading domain file ${file}:`, err);
          }
        }
        
        return {
          name: file,
          path: `/domains/${file}`,
          time: stats.mtime.getTime(),
          domainCount,
          createdAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => b.time - a.time);
    
    return NextResponse.json({
      success: true,
      files: domainFiles
    });
  } catch (error) {
    console.error('Error listing domain exports:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to list domain exports: ${error.message}`
    }, { status: 500 });
  }
}
