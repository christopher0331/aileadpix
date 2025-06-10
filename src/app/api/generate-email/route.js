import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to fetch website content
async function fetchWebsiteContent(url) {
  try {
    // Add http:// if not present
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Extract domain name for fallback content
    const domainMatch = url.match(/https?:\/\/(?:www\.)?([-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})/);
    const domain = domainMatch ? domainMatch[1] : url.replace(/https?:\/\/(?:www\.)?/, '');
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/',
        },
        timeout: 15000
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status}`);
      }

      const html = await response.text();
      
      // Extract text content by removing HTML tags
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Get first ~3000 characters as we don't need the entire page
      return textContent.substring(0, 3000);
    } catch (fetchError) {
      console.error('Error fetching website:', fetchError);
      
      // Handle SSL certificate errors with fallback content
      if (fetchError.cause?.code === 'CERT_HAS_EXPIRED' || 
          fetchError.message?.includes('certificate') ||
          fetchError.message?.includes('SSL')) {
        
        console.log(`SSL certificate error for ${url}, using domain information instead`);
        
        // Format domain name to look like a company name
        const companyName = domain
          .split('.')
          .filter(part => part !== 'com' && part !== 'net' && part !== 'org' && part !== 'io')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Return structured fallback content
        return generateFallbackContent(companyName, domain);
      }
      
      throw fetchError; // Re-throw if not a certificate error
    }
  } catch (error) {
    console.error('Error in fetchWebsiteContent:', error);
    
    // Extract domain from URL for fallback
    const domainMatch = url.match(/https?:\/\/(?:www\.)?([-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})/);
    const domain = domainMatch ? domainMatch[1] : url.replace(/https?:\/\/(?:www\.)?/, '');
    
    // Format domain name to look like a company name
    const companyName = domain
      .split('.')
      .filter(part => part !== 'com' && part !== 'net' && part !== 'org' && part !== 'io')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return generateFallbackContent(companyName, domain);
  }
}

// Generate fallback content when website can't be accessed
function generateFallbackContent(companyName, domain) {
  return `${companyName} is a business with the website ${domain}. 
  Based on their domain name, they likely provide services related to ${inferBusinessType(domain)}. 
  As a business in today's digital landscape, they likely face challenges with online visibility, 
  customer acquisition, and optimizing their digital presence for growth. 
  They probably need assistance with marketing, customer engagement, and leveraging technology 
  to streamline their operations and increase revenue.`;
}

// Infer business type from domain name
function inferBusinessType(domain) {
  const domainParts = domain.toLowerCase().split('.');
  const nameWithoutTLD = domainParts[0];
  
  // Check for specific keywords in domain
  if (nameWithoutTLD.includes('storage') || nameWithoutTLD.includes('install')) {
    return 'storage solutions and installation services';
  }
  if (nameWithoutTLD.includes('lab') || nameWithoutTLD.includes('tech')) {
    return 'technology and innovation services';
  }
  if (nameWithoutTLD.includes('market') || nameWithoutTLD.includes('digital')) {
    return 'marketing and digital services';
  }
  if (nameWithoutTLD.includes('design') || nameWithoutTLD.includes('creative')) {
    return 'design and creative services';
  }
  if (nameWithoutTLD.includes('consult')) {
    return 'consulting and advisory services';
  }
  
  // Default to generic business services
  return 'business services and solutions';
}

// Function to generate email content using OpenAI
async function generateEmailContent(websiteContent, businessName, serviceName, servicePrice, companyName, customPrompt = null) {
  let promptText;
  
  if (customPrompt) {
    // Use the custom prompt if provided, replacing variables with actual values
    promptText = customPrompt
      .replace(/\{businessName\}/g, businessName)
      .replace(/\{serviceName\}/g, serviceName)
      .replace(/\{servicePrice\}/g, servicePrice)
      .replace(/\{companyName\}/g, companyName);
  } else {
    // Use the default prompt
    promptText = `
Write a compelling, personalized cold email offering ${serviceName} for $${servicePrice}. The email should:

1. Include a personalized opening that shows you've researched their business (based on the website content)
2. Mention a specific challenge or opportunity you've identified that your service can help with
3. Briefly explain your ${serviceName} offering and why it's valuable for ${businessName}
4. Include the price point ($${servicePrice}) with a clear, non-pushy call to action
5. Close professionally

The email should be no more than 150 words, concise, conversational, and focused on value rather than features.
Format the response as HTML with proper paragraph breaks. Sign the email as a representative of ${companyName}.

DO NOT mention that you scraped their website or use language that sounds creepy or invasive.
Make it sound natural and compelling.
`;
  }
  
  // Prepend the website content context to either the custom or default prompt
  const prompt = `
You're crafting a personalized cold email to ${businessName}. 
Here's information about their business extracted from their website:

"""
${websiteContent}
"""

${promptText}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a skilled cold email copywriter who specializes in writing highly personalized, effective cold emails that get responses. You write emails that are concise, personalized, and focused on the recipient's needs." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to generate email: ${error.message}`);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      websiteUrl, 
      businessName, 
      serviceName = "Digital Marketing Services", 
      servicePrice = 189, 
      companyName = "Your Marketing Agency",
      customPrompt = null
    } = body;

    if (!websiteUrl || !businessName) {
      return NextResponse.json(
        { error: 'Website URL and business name are required' },
        { status: 400 }
      );
    }

    // Fetch website content
    const websiteContent = await fetchWebsiteContent(websiteUrl);
    
    // Generate email using OpenAI
    let emailContent = await generateEmailContent(
      websiteContent, 
      businessName, 
      serviceName, 
      servicePrice, 
      companyName,
      customPrompt
    );

    // Ensure the email has proper styling for high contrast
    emailContent = emailContent.replace(/<p>/g, '<p style="color: #000000; font-size: 1rem; margin-bottom: 1rem; line-height: 1.6;">');
    emailContent = emailContent.replace(/<a /g, '<a style="color: #2563eb; text-decoration: underline; font-weight: 500;" ');
    
    // Add a wrapper with additional styling if not already present
    if (!emailContent.includes('<div style="color: #000000;')) {
      emailContent = `<div style="color: #000000; font-family: sans-serif;">${emailContent}</div>`;
    }

    return NextResponse.json({ email: emailContent });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while generating the email' },
      { status: 500 }
    );
  }
}
