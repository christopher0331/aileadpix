import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request) {
  try {
    const data = await request.json();
    const { domainFile, listOnly } = data;
    
    // If listOnly is true, return a list of available domain files
    if (listOnly) {
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
        .filter(file => file.endsWith('.txt'))
        .map(file => {
          const filePath = path.join(domainsDir, file);
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf-8');
          const domainCount = content.split('\n')
            .filter(line => line.trim().length > 0).length;
            
          return {
            name: file,
            path: filePath,
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
    }
    
    // Get the most recent domain file if none is specified
    let fileToUse = domainFile;
    if (!fileToUse) {
      const domainsDir = path.join(process.cwd(), 'domains');
      const domainFiles = fs.readdirSync(domainsDir)
        .filter(file => file.endsWith('.txt'))
        .map(file => ({
          name: file,
          path: path.join(domainsDir, file),
          time: fs.statSync(path.join(domainsDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      if (domainFiles.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No domain files found in the domains directory'
        }, { status: 400 });
      }
      
      fileToUse = domainFiles[0].name;
    }
    
    // Execute the screenshot-batch.js script with the domain file
    const command = fileToUse 
      ? `node ${path.join(process.cwd(), 'screenshot-batch.js')} ${fileToUse}`
      : `node ${path.join(process.cwd(), 'screenshot-batch.js')}`;
    
    // Execute the command (non-blocking)
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running screenshot batch: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Screenshot batch stderr: ${stderr}`);
      }
      console.log(`Screenshot batch stdout: ${stdout}`);
    });
    
    return NextResponse.json({
      success: true,
      message: `Screenshot generation started for ${fileToUse || 'most recent domain file'}. This will run in the background.`
    });
    
  } catch (error) {
    console.error('Error running screenshot batch:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to run screenshot batch: ${error.message}`
    }, { status: 500 });
  }
}
