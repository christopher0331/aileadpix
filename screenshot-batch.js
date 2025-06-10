/**
 * screenshot-batch.js
 *
 * Usage:
 *   $ node screenshot-batch.js [domain-file-name]
 *
 * Examples:
 *   $ node screenshot-batch.js                       # uses most recent file in /domains
 *   $ node screenshot-batch.js domains-2025-06-03.txt # uses specific file
 *
 * Expects:
 *   - /domains/ directory with domain files (one domain per line, e.g. "example.com")
 *   - public/screenshots/  (directory; script will create it if missing)
 *
 * Output:
 *   - public/screenshots/<domain>.png
 *   - public/manifest.json  (records [{ domain, file }...])
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// 1. Load domains from the specified file or most recent file in the /domains directory
let domains = [];
const domainsDir = path.join(__dirname, 'domains');

// Check if the domains directory exists
if (!fs.existsSync(domainsDir)) {
  console.error('ERROR: /domains directory not found!');
  console.error('Please create the directory and export domains first.');
  process.exit(1);
}

// Check for command line argument for specific domain file
const specifiedFile = process.argv[2];
let domainFilePath;

if (specifiedFile) {
  // User specified a file to use
  domainFilePath = path.join(domainsDir, specifiedFile);
  
  if (!fs.existsSync(domainFilePath)) {
    console.error(`ERROR: Specified file not found: ${domainFilePath}`);
    console.error('Available domain files:');
    
    const availableFiles = fs.readdirSync(domainsDir)
      .filter(file => file.endsWith('.txt'));
    
    if (availableFiles.length === 0) {
      console.error('  No domain files found in /domains directory');
    } else {
      availableFiles.forEach(file => console.error(`  - ${file}`));
    }
    
    process.exit(1);
  }
  
  console.log(`Using specified domain file: ${specifiedFile}`);
} else {
  // No file specified, use most recent
  const domainFiles = fs.readdirSync(domainsDir)
    .filter(file => file.endsWith('.txt'))
    .map(file => ({ 
      name: file,
      path: path.join(domainsDir, file),
      time: fs.statSync(path.join(domainsDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Sort by most recent first
  
  if (domainFiles.length === 0) {
    console.error('ERROR: No domain files found in the /domains directory.');
    console.error('Please run the domain export tool first.');
    process.exit(1);
  }
  
  // Use the most recent file
  domainFilePath = domainFiles[0].path;
  console.log(`Using most recent domain file: ${domainFiles[0].name}`);
}

// Read domains from the selected file
try {
  domains = fs.readFileSync(domainFilePath, 'utf-8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  
  console.log(`Loaded ${domains.length} domains from ${path.basename(domainFilePath)}`);
  
  if (domains.length === 0) {
    console.error('ERROR: The domain file is empty!');
    process.exit(1);
  }
} catch (error) {
  console.error(`ERROR reading domain file: ${error.message}`);
  process.exit(1);
}

// 2. Ensure output folder exists
const outDir = path.join(__dirname, 'public', 'screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Process domains in chunks to avoid memory issues
const CHUNK_SIZE = 200;

// Function to process a chunk of domains
async function processChunk(chunk, startIndex) {
  // Launch Puppeteer once per chunk with SSL error handling
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1024, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list'
    ]
  });
  const page = await browser.newPage();
  
  const chunkManifest = [];

  for (let i = 0; i < chunk.length; i++) {
    const domain = chunk[i];
    const url = domain.startsWith('http') ? domain : `http://${domain}`;
    const safeFileName = domain.replace(/[:\/\.\?#]/g, '_');
    const screenshotPath = path.join(outDir, `${safeFileName}.png`);

    try {
      console.log(`Processing ${startIndex + i + 1}/${domains.length}: ${domain}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      // wait a half-second in case lazy-load elements pop in
      // Use setTimeout instead of waitForTimeout
      await new Promise(resolve => setTimeout(resolve, 500));

      // Take screenshot of above-the-fold content only (not full page)
      await page.screenshot({ 
        path: screenshotPath, 
        clip: { x: 0, y: 0, width: 1024, height: 800 } 
      });
      
      console.log(`✅ Captured: ${domain}`);
      chunkManifest.push({ 
        domain, 
        file: `screenshots/${path.basename(screenshotPath)}`,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn(`⚠️ Failed to capture ${domain}: ${err.message}`);
      // Add to manifest with error flag
      chunkManifest.push({ 
        domain, 
        file: null,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  await browser.close();
  return chunkManifest;
}

// Main execution function
(async () => {
  console.log(`Starting screenshot capture for ${domains.length} domains`);
  console.log(`Processing in chunks of ${CHUNK_SIZE}`);
  
  // Read existing manifest if it exists
  let fullManifest = [];
  const manifestPath = path.join(__dirname, 'public', 'manifest.json');
  
  if (fs.existsSync(manifestPath)) {
    try {
      fullManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log(`Loaded existing manifest with ${fullManifest.length} entries`);
    } catch (err) {
      console.warn(`Failed to parse existing manifest: ${err.message}`);
      // Continue with empty manifest
    }
  }
  
  // Process domains in chunks
  for (let start = 0; start < domains.length; start += CHUNK_SIZE) {
    const chunk = domains.slice(start, start + CHUNK_SIZE);
    console.log(`\nProcessing chunk ${Math.floor(start/CHUNK_SIZE) + 1}/${Math.ceil(domains.length/CHUNK_SIZE)}`);
    
    const chunkManifest = await processChunk(chunk, start);
    
    // Add new results to full manifest
    // If domain already exists in manifest, replace its entry
    chunkManifest.forEach(entry => {
      const existingIndex = fullManifest.findIndex(e => e.domain === entry.domain);
      if (existingIndex >= 0) {
        fullManifest[existingIndex] = entry;
      } else {
        fullManifest.push(entry);
      }
    });
    
    // Write updated manifest after each chunk
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(fullManifest, null, 2)
    );
    
    console.log(`Updated manifest with ${chunkManifest.length} new/updated entries`);
  }

  console.log(`\n✅ Done. Screenshots: ${fullManifest.filter(e => e.file).length}. Manifest written.`);
  console.log(`Failed: ${fullManifest.filter(e => !e.file).length}`);
})();
