import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

// Helper function to extract domain from URL
function extractDomain(url) {
  try {
    // Ensure URL has a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return url; // Return original if parsing fails
  }
}

// Clean and normalize domain list to match the format expected by screenshot system
function processDomains(urls) {
  const allDomains = new Set();
  
  for (const url of urls) {
    if (!url.trim()) continue; // Skip empty entries
    
    try {
      const domain = extractDomain(url.trim());
      if (domain && domain !== 'localhost' && !domain.includes('127.0.0.1')) {
        // Remove www. prefix - screenshot system uses domains without www
        const normalizedDomain = domain.startsWith('www.') ? domain.substring(4) : domain;
        allDomains.add(normalizedDomain);
      }
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
    }
  }
  
  return Array.from(allDomains).sort();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { websites, contactsData } = body;
    
    if (!websites || !Array.isArray(websites) || websites.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of website URLs' },
        { status: 400 }
      );
    }
    
    // Process and normalize domains
    const domainList = processDomains(websites);
    
    // Create domains directory if it doesn't exist
    const domainsDir = path.join(process.cwd(), 'domains');
    if (!fs.existsSync(domainsDir)) {
      fs.mkdirSync(domainsDir, { recursive: true });
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filenameBase = `domains-${timestamp}`;
    const txtFilename = `${filenameBase}.txt`;
    const jsonFilename = `${filenameBase}.json`;
    
    const txtFilePath = path.join(domainsDir, txtFilename);
    const jsonFilePath = path.join(domainsDir, jsonFilename);
    
    // Write domains to text file (for backward compatibility with screenshot process)
    fs.writeFileSync(txtFilePath, domainList.filter(domain => domain.trim()).join('\n'));
    
    // Create a mapping of domains to their full contact information
    const contactInfoMap = {};
    
    // If contactsData was provided, use it to build the map
    if (contactsData && Array.isArray(contactsData)) {
      contactsData.forEach(contact => {
        if (contact.url) {
          try {
            const domain = extractDomain(contact.url.trim());
            const normalizedDomain = domain.startsWith('www.') ? domain.substring(4) : domain;
            
            contactInfoMap[normalizedDomain] = {
              businessName: contact.businessName || contact.companyName || '',
              email: contact.email || '',
              phone: contact.phone || '',
              name: contact.name || '',
              url: contact.url || '',
              notes: contact.notes || '',
              industry: contact.industry || ''
            };
          } catch (error) {
            console.error(`Error processing contact for ${contact.url}:`, error);
          }
        }
      });
    }
    
    // Write extended information to JSON file
    fs.writeFileSync(jsonFilePath, JSON.stringify({
      domains: domainList,
      timestamp: new Date().toISOString(),
      contactInfo: contactInfoMap
    }, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      domainsCount: domainList.length,
      filePath: `/domains/${txtFilename}`,
      jsonFilePath: `/domains/${jsonFilename}`,
      domains: domainList,
      hasContactInfo: Object.keys(contactInfoMap).length > 0
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export domains' },
      { status: 500 }
    );
  }
}
