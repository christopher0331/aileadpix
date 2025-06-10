import { NextResponse } from 'next/server';

async function fetchWithTimeout(url, options, timeout = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Default headers that mimic a real browser
  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.google.com/',
    'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="112"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function findContactPage(baseUrl, html) {
  try {
    // Look for common contact page links
    const contactLinkRegex = /<a[^>]*href=["']([^"']*(?:contact|about|reach-us|connect)[^"']*)["'][^>]*>/gi;
    let match;
    const contactLinks = [];
    
    while ((match = contactLinkRegex.exec(html)) !== null) {
      let contactUrl = match[1].trim();
      
      // Handle relative URLs
      if (contactUrl.startsWith('/')) {
        const baseUrlObj = new URL(baseUrl);
        contactUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${contactUrl}`;
      } else if (!contactUrl.startsWith('http')) {
        // Handle URLs without leading slash
        const baseWithoutPath = baseUrl.replace(/\/([^/]+)$/, '/');
        contactUrl = `${baseWithoutPath}${contactUrl}`;
      }
      
      // Filter out external links and non-http protocols
      if (contactUrl.startsWith('http') && contactUrl.includes(new URL(baseUrl).host)) {
        contactLinks.push(contactUrl);
      }
    }
    
    return [...new Set(contactLinks)]; // Remove duplicates
  } catch (error) {
    console.error('Error finding contact page:', error);
    return [];
  }
}

function extractEmails(html) {
  // Multiple regex patterns to catch different email formats and obfuscation methods
  const patterns = [
    // Standard email pattern
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/g,
    
    // Email inside mailto: links
    /mailto:\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6})/g,
    
    // Email with HTML entities
    /([a-zA-Z0-9._%+\-]+)&#(?:46|064|0064);([a-zA-Z0-9.\-]+)\.([a-zA-Z]{2,6})/g,
    
    // Email with 'at' and 'dot' as text
    /([a-zA-Z0-9._%+\-]+)\s*(?:@|\[at\]|\(at\)|at)\s*([a-zA-Z0-9.\-]+)\s*(?:\.|\[dot\]|\(dot\)|dot)\s*([a-zA-Z]{2,6})/gi,
    
    // Email inside JavaScript or CSS (looking for strings or variables that look like emails)
    /['"][a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}['"]/g,
    
    // Email with specific data attributes (common in modern websites)
    /data-(?:email|mail|contact)=['"]([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6})['"]>/gi
  ];

  // Extract emails using all patterns
  let emails = [];
  for (const pattern of patterns) {
    const matches = html.match(pattern) || [];
    emails = [...emails, ...matches];
  }
  
  // Clean up the found emails
  return emails.map(email => {
    // Remove surrounding quotes, mailto:, and HTML tags
    return email.replace(/^['"]|['"]$|mailto:|<.*?>|&.*;/g, '')
              .replace(/\[at\]|\(at\)|\s+at\s+/i, '@')
              .replace(/\[dot\]|\(dot\)|\s+dot\s+/i, '.')
              .trim();
  }).filter(email => {
    // Filter valid emails and remove common false positives
    const validEmailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}$/i;
    const lowerEmail = email.toLowerCase();
    return validEmailRegex.test(email) && 
           !lowerEmail.includes('example.com') && 
           !lowerEmail.includes('yourdomain') && 
           !lowerEmail.includes('domain.com') &&
           !lowerEmail.includes('wordpress') &&
           !lowerEmail.includes('yoursite') &&
           !lowerEmail.includes('your-site') &&
           !lowerEmail.includes('site.com') &&
           !lowerEmail.includes('your@') &&
           !lowerEmail.includes('email@') &&
           !lowerEmail.includes('your-email') &&
           !lowerEmail.includes('your-name') &&
           !lowerEmail.includes('your.name') &&
           !lowerEmail.includes('your_name');
  });
}

function extractPhoneNumbers(html) {
  // Enhanced approach to find phone numbers in various formats and locations
  
  // First, look specifically for phone numbers in footer and contact sections before stripping HTML
  const footerContactPattern = /<(?:footer|div\s[^>]*(?:footer|contact|location|phone))\s[^>]*>([\s\S]*?)<\/(?:footer|div)>/gi;
  const footerContactSections = [];
  
  // Collect all footer and contact sections
  let footerMatch;
  while ((footerMatch = footerContactPattern.exec(html)) !== null) {
    if (footerMatch[1]) {
      footerContactSections.push(footerMatch[1]);
    }
  }
  
  // Strip out problematic HTML for general search
  const strippedHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[\s\S]*?<\/style>/gi, '')   // Remove styles
    .replace(/<[^>]*>/g, ' ')                    // Replace tags with spaces
    .replace(/&[^;]+;/g, ' ');                   // Replace HTML entities
  
  // Patterns to match phone numbers
  const phonePatterns = [
    // Format: (XXX) XXX-XXXX
    /\(\d{3}\)[\s.-]*\d{3}[\s.-]*\d{4}/g,
    
    // Format: XXX-XXX-XXXX or XXX.XXX.XXXX or XXX XXX XXXX
    /\b\d{3}[\s.-]+\d{3}[\s.-]+\d{4}\b/g,
    
    // Format with leading 1: 1-XXX-XXX-XXXX
    /\b1[\s.-]*\d{3}[\s.-]*\d{3}[\s.-]*\d{4}\b/g,
    
    // Format that might appear in footers: XXX-XXXX (assuming area code might be mentioned elsewhere)
    /\b\d{3}[\s.-]+\d{4}\b/g
  ];
  
  let allPhones = [];
  
  // First, search in footer and contact sections specifically (higher priority)
  for (const section of footerContactSections) {
    const strippedSection = section.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ');
    
    // Apply each pattern to the footer/contact sections
    for (const pattern of phonePatterns) {
      const matches = strippedSection.match(pattern) || [];
      allPhones = [...allPhones, ...matches];
    }
  }
  
  // Then search in the entire document
  for (const pattern of phonePatterns) {
    const matches = strippedHtml.match(pattern) || [];
    allPhones = [...allPhones, ...matches];
  }
  
  // Find phone numbers in tel: links (highly reliable)
  const telLinkPattern = /tel:["']?([+0-9()\s.-]{7,20})["']?/g;
  let match;
  while ((match = telLinkPattern.exec(html)) !== null) {
    if (match[1]) {
      allPhones.push(match[1]);
    }
  }
  
  // Also look for phone numbers near labels like "call us" or "phone"
  const labeledPhonePattern = /(?:call(?:\s+us)?|phone|tel|telephone|contact)(?:[^0-9]+)((?:\+?\d{1,2}[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4})/gi;
  while ((match = labeledPhonePattern.exec(strippedHtml)) !== null) {
    if (match[1]) {
      allPhones.push(match[1]);
    }
  }
  
  // Clean and extract phone numbers into a structured format
  const phoneData = allPhones.map(phone => {
    // Extract just the digits
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Discard invalid lengths (too short or too long)
    if (digitsOnly.length < 7 || digitsOnly.length > 15) return null;
    
    // Return structured data for better filtering
    return {
      original: phone.trim(),
      digits: digitsOnly,
      // Store if it's a complete number (10+ digits) or partial (7 digits)
      isComplete: digitsOnly.length >= 10
    };
  }).filter(Boolean); // Remove null values
  
  // Group by last 7 digits to identify shortened versions of the same number
  const groupedByLastSeven = {};
  
  for (const phone of phoneData) {
    // Use the last 7 digits as a key for grouping
    const lastSeven = phone.digits.slice(-7);
    
    if (!groupedByLastSeven[lastSeven]) {
      groupedByLastSeven[lastSeven] = [];
    }
    
    groupedByLastSeven[lastSeven].push(phone);
  }
  
  // For each group, prioritize complete numbers over partials
  const filteredPhones = [];
  const seenAreaCodes = new Set(); // To avoid multiple numbers with the same area code
  
  // Process each group of potentially related numbers
  Object.values(groupedByLastSeven).forEach(group => {
    // Sort by completeness (complete numbers first)
    group.sort((a, b) => {
      // Complete numbers come first
      if (a.isComplete && !b.isComplete) return -1;
      if (!a.isComplete && b.isComplete) return 1;
      // If both complete or both incomplete, longer number comes first
      return b.digits.length - a.digits.length;
    });
    
    // Take only the best number from each group (typically the complete one)
    const bestMatch = group[0];
    
    // Extract area code if available
    let areaCode = "";
    if (bestMatch.digits.length >= 10) {
      // For numbers with 11 digits (country code + area code), take digits 1-3
      // For numbers with 10 digits, take digits 0-2
      const startIndex = bestMatch.digits.length === 11 ? 1 : 0;
      areaCode = bestMatch.digits.substring(startIndex, startIndex + 3);
    }
    
    // For diversity, limit numbers with the same area code
    // But always include at least one number per area code
    if (!areaCode || !seenAreaCodes.has(areaCode) || filteredPhones.length < 2) {
      // Format the number consistently
      let formattedNumber;
      const digits = bestMatch.digits;
      
      if (digits.length === 10) {
        // Standard US number: format as (XXX) XXX-XXXX
        formattedNumber = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
      } else if (digits.length === 7) {
        // Only keep 7-digit numbers if we have no better options
        if (group.length === 1) {
          formattedNumber = `${digits.substring(0, 3)}-${digits.substring(3)}`;
        } else {
          // Skip this one, we have a better (longer) version
          return;
        }
      } else if (digits.length === 11 && digits.startsWith('1')) {
        // US number with country code: format as 1-(XXX) XXX-XXXX
        formattedNumber = `1-(${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
      } else {
        // Keep original formatting for other valid cases
        formattedNumber = bestMatch.original;
      }
      
      filteredPhones.push(formattedNumber);
      if (areaCode) {
        seenAreaCodes.add(areaCode);
      }
    }
  });
  
  // Return up to 5 phone numbers, prioritizing complete ones
  return filteredPhones.slice(0, 5);
}

function cleanBusinessName(name) {
  if (!name) return '';
  
  return name
    .replace(/\s*[|]\s*.*/i, '') // Remove everything after pipe
    .replace(/\s*[-–—]\s*.*/i, '') // Remove everything after dash
    .replace(/^\s*(home|contact us|about us|welcome to)\s*[-|:]?\s*/i, '') // Remove prefixes
    .replace(/\s*[-|:]?\s*(home|contact|about)(\s+page)?$/i, '') // Remove suffixes
    .replace(/^\s*welcome\s+to\s*/i, '') // Remove 'Welcome to'
    .trim();
}

function extractBusinessInfo(html, url) {
  // Get business name from title, meta tags, and structural elements
  let businessName = '';
  
  // Try title tag
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    businessName = cleanBusinessName(titleMatch[1]);
  }
  
  // If title is empty or very generic, try meta tags
  if (!businessName || businessName.length < 3) {
    const metaNameMatch = html.match(/<meta\s+(?:property=["']og:site_name["']|name=["'](?:application-name|apple-mobile-web-app-title|twitter:title)["'])\s+content=["']([^"']+)["'][^>]*>/i);
    if (metaNameMatch && metaNameMatch[1]) {
      businessName = cleanBusinessName(metaNameMatch[1]);
    }
  }
  
  // If still empty, try logo alt text
  if (!businessName || businessName.length < 3) {
    const logoMatch = html.match(/<img[^>]*(?:logo|brand|header)[^>]*alt=["']([^"']+)["'][^>]*>/i);
    if (logoMatch && logoMatch[1]) {
      businessName = cleanBusinessName(logoMatch[1]);
    }
  }
  
  // If still empty, try h1 in header
  if (!businessName || businessName.length < 3) {
    const h1Match = html.match(/<header[^>]*>(?:[^<]|<(?!\/header))*?<h1[^>]*>(.*?)<\/h1>/is);
    if (h1Match && h1Match[1]) {
      businessName = cleanBusinessName(h1Match[1].replace(/<[^>]*>/g, ''));
    }
  }
  
  // If still empty, fallback to domain name
  if (!businessName || businessName.length < 3) {
    try {
      const domain = new URL(url).hostname;
      businessName = domain
        .replace(/^www\./i, '')
        .replace(/\.(?:com|org|net|io|co|uk|ca|au|de|fr|info|biz)$/i, '')
        .split('.')
        .join(' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch (e) {
      console.error('Error extracting domain name:', e);
    }
  }
  
  return { businessName };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }
    
    console.log(`Scraping website: ${url}`);
    
    try {
      // Extract domain for later use
      let domain = '';
      let hostname = '';
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname.replace(/^www\./, '');
        hostname = urlObj.hostname;
      } catch (e) {
        console.error('Invalid URL format:', e);
      }
      
      // Get business name from domain if available
      let businessName = domain
        .split('.')[0]
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Initialize results
      let emails = [];
      let phones = [];
      
      // First attempt: Try to fetch the main page
      try {
        const response = await fetchWithTimeout(url, {}, 20000); // Increased timeout
        
        if (response.ok) {
          const html = await response.text();
          
          // Extract emails from the HTML
          const extractedEmails = extractEmails(html);
          // Only use emails that were actually found on the site, don't generate fake ones
          emails = extractedEmails.length > 0 ? extractedEmails : [];
          
          // Get better business name if available
          const extractedInfo = extractBusinessInfo(html, url);
          if (extractedInfo.businessName && extractedInfo.businessName.length > 3) {
            businessName = extractedInfo.businessName;
          }
          
          // Find and scrape contact pages
          const contactUrls = await findContactPage(url, html);
          
          // Scrape up to 2 contact pages (reduced to avoid too many requests)
          for (const contactUrl of contactUrls.slice(0, 2)) {
            try {
              console.log(`Scraping contact page: ${contactUrl}`);
              // Add a delay between requests to avoid being flagged as a bot
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const contactResponse = await fetchWithTimeout(contactUrl, {});
              
              if (contactResponse.ok) {
                const contactHtml = await contactResponse.text();
                
                // Extract additional emails and phones
                const contactEmails = extractEmails(contactHtml);
                const contactPhones = extractPhoneNumbers(contactHtml);
                
                // Merge results
                emails = [...emails, ...contactEmails];
                phones = [...phones, ...contactPhones];
              }
            } catch (error) {
              console.error(`Error scraping contact page ${contactUrl}:`, error);
              // Continue with other contact pages
            }
          }
        } else {
          console.error(`Failed to fetch website: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error during main page scraping:', error);
        // We'll continue and try alternative methods
      }
      
      // We no longer generate synthetic emails - only use emails actually found on websites
      // If no emails were found, we leave the emails array empty
      
      // Remove duplicates
      emails = [...new Set(emails)];
      phones = [...new Set(phones)];
      
      // Prioritize emails that match the domain name
      if (domain) {
        emails.sort((a, b) => {
          const aDomain = a.split('@')[1] || '';
          const bDomain = b.split('@')[1] || '';
          const aMatch = aDomain && aDomain.includes(domain);
          const bMatch = bDomain && bDomain.includes(domain);
          
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          businessName,
          url,
          emails,
          phones,
          scrapingStatus: emails.length > 0 ? 'success' : 'partial'
        }
      });
    } catch (error) {
      console.error('Error scraping website:', error);
      
      // Try to extract a business name from the URL even if everything else fails
      let fallbackName = '';
      try {
        const urlObj = new URL(url);
        fallbackName = urlObj.hostname
          .replace(/^www\./, '')
          .split('.')[0]
          .replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      } catch (e) {}
      
      // Return partial results even on error
      return NextResponse.json({
        success: true, // Return success even with errors to avoid breaking the UI
        data: {
          businessName: fallbackName,
          url,
          emails: [],
          phones: [],
          scrapingStatus: 'failed',
          errorMessage: `Could not scrape this website: ${error.message}`
        }
      });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ 
      success: true, // Return success even with errors to avoid breaking the UI
      data: {
        businessName: '',
        url: '',
        emails: [],
        phones: [],
        scrapingStatus: 'error',
        errorMessage: 'Invalid request format'
      }
    });
  }
}
