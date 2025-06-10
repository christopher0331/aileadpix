import OpenAI from 'openai';
import { extractDomain, knownUnsuitableDomains } from './utils';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { result } = body;
    
    if (!result || !result.title || !result.link || !result.snippet) {
      return Response.json({ 
        success: false, 
        error: "Invalid result data" 
      }, { status: 400 });
    }
    
    // Pre-filter known unsuitable domains
    const domain = extractDomain(result.link);
    const isKnownUnsuitableDomain = knownUnsuitableDomains.some(unsuitableDomain => 
      domain.includes(unsuitableDomain)
    );
    
    // For .gov and .edu domains
    const isGovEduDomain = domain.endsWith('.gov') || domain.endsWith('.edu');
    
    if (isKnownUnsuitableDomain || isGovEduDomain) {
      // Skip OpenAI call for known unsuitable domains
      return Response.json({
        success: true,
        analysis: {
          suitable: false,
          businessType: isGovEduDomain ? (domain.endsWith('.gov') ? 'government site' : 'educational institution') : 'directory/review site',
          confidence: 95,
          reasoning: `This is a ${isGovEduDomain ? (domain.endsWith('.gov') ? 'government website' : 'educational institution') : 'known directory or review site'} (${domain}) which is not suitable for direct business outreach.`
        }
      });
    }
    
    // Create prompt for OpenAI
    const prompt = `
You are analyzing a search result to determine if it's a suitable business for an email marketing campaign. Your job is to be VERY strict about filtering out websites that are not actual businesses we could contact.

Here's the information about the search result:
Title: ${result.title}
Website: ${result.link}
Description: ${result.snippet}

PLEASE CAREFULLY CHECK if this is a directory site, review site, or aggregator. AUTOMATICALLY REJECT the following types of sites as NOT SUITABLE:
- Review sites (like Yelp, TripAdvisor, Google Reviews, etc.)
- Business directories (like BBB.org, Yellow Pages, Angi, HomeAdvisor, etc.)
- Social media platforms (Facebook, Instagram, LinkedIn, etc.)
- Marketplace sites (Amazon, eBay, Etsy, etc.)
- News sites or blogs that are not businesses themselves
- Government websites (.gov domains)
- Educational institutions (.edu domains)

A website is only suitable if it represents an ACTUAL BUSINESS that we could contact directly, and that business must be:
1. A local or small-to-medium sized business (not a giant corporation)
2. Likely to benefit from our marketing services
3. Have its own website (not just a listing on another platform)

Examples of NOT SUITABLE sites:
- "Joe's Plumbing - Yelp" (review site)
- "Better Business Bureau: Start with Trust" (directory)
- "Top 10 Plumbers in Seattle - HomeAdvisor" (aggregator)
- "Amazon.com: Plumbing Services" (marketplace)

Examples of SUITABLE sites:
- "Joe's Plumbing & Heating - Seattle's Top Rated Plumber"
- "Westlake Dental Care - Family Dentist in Chicago"
- "Green Clean - Eco-Friendly Cleaning Services"

Respond with ONLY a JSON object in this format:
{
  "suitable": true/false,
  "businessType": "local contractor/small business/medium business/large corporation/directory site/review site/other",
  "confidence": 0-100 (your confidence in this assessment),
  "reasoning": "brief explanation of your assessment"
}
`;

    // Log attempt to call OpenAI
    console.log(`Attempting OpenAI API call for domain: ${domain}`);
    
    // Function to analyze a business website locally without OpenAI - REVERSED APPROACH
    // We now INCLUDE by default and only EXCLUDE specific non-business sites
    function localAnalysis(result) {
      const { title, link, snippet } = result;
      const domain = extractDomain(link);
      
      // Define business keywords for reference
      const businessKeywords = ['company', 'service', 'professional', 'contractor', 'business', 
        'expert', 'specialist', 'quality', 'solution', 'custom', 'family owned', 'licensed', 
        'insured', 'local', 'installation', 'repair', 'builders'];
      
      // Create a more comprehensive list of domains to exclude
      const knownUnsuitableDomains = [
        // Social media platforms
        'facebook.com', 'youtube.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'tiktok.com', 'pinterest.com',
        'reddit.com', 'tumblr.com', 'snapchat.com', 'threads.net', 'mastodon', 'bluesky.com',
        
        // E-commerce and marketplace sites
        'amazon.com', 'ebay.com', 'etsy.com', 'walmart.com', 'target.com', 'bestbuy.com', 'shopify.com',
        'aliexpress.com', 'wayfair.com', 'homedepot.com', 'lowes.com',
        
        // Tech giants and search engines
        'google.com', 'apple.com', 'microsoft.com', 'bing.com', 'yahoo.com', 'baidu.com',
        
        // Review and directory sites
        'yelp.com', 'tripadvisor.com', 'yellowpages.com', 'bbb.org', 'angieslist.com', 'thumbtack.com',
        'mapquest.com', 'homeadvisor.com', 'manta.com', 'merchantcircle.com', 'superpages.com',
        
        // Content and media sites
        'wikipedia.org', 'quora.com', 'medium.com', 'buzzfeed.com', 'cnn.com', 'nytimes.com', 'washingtonpost.com',
        'huffpost.com', 'forbes.com', 'time.com', 'wsj.com',
        
        // Job sites
        'indeed.com', 'glassdoor.com', 'monster.com', 'ziprecruiter.com', 'careerbuilder.com', 'dice.com',
        
        // Classifieds
        'craigslist.org',
        
        // Educational
        '.edu', 'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org',
        
        // Government
        '.gov', '.mil'
      ];
        
      // Additional profession-specific keywords
      const legalKeywords = ['attorney', 'lawyer', 'law firm', 'legal', 'counsel', 'litigation', 'defense',
        'practice', 'injury', 'criminal', 'family law', 'estate planning', 'divorce', 'dui',
        'law office', 'advocate', 'consultation', 'free consultation'];
        
      // Simple list of industry-specific keywords for keyword matching
      const industryKeywords = [
        // Legal industry
        'attorney', 'lawyer', 'law firm', 'legal', 'counsel', 'litigation', 'defense',
        'practice', 'injury', 'criminal', 'family law', 'estate planning', 'divorce', 'dui',
        'law office', 'advocate', 'consultation', 'free consultation',
        
        // Construction and contractors
        'fence', 'fencing', 'contractor', 'construction', 'builder', 'remodel', 'install', 'repair',
        'home improvement', 'commercial', 'residential', 'licensed', 'insured',
        
        // General business terms
        'service', 'company', 'business', 'professional', 'specialist', 'expert', 'quality',
        'affordable', 'free quote', 'estimate', 'satisfaction', 'guaranteed'
      ];
      
      // Combine all keywords for matching
      const relevantKeywords = [...businessKeywords, ...industryKeywords];
      
      // Count business keywords in title and snippet
      const titleLower = title.toLowerCase();
      const snippetLower = snippet.toLowerCase();
      const keywordMatches = relevantKeywords.filter(keyword => 
        titleLower.includes(keyword.toLowerCase()) || snippetLower.includes(keyword.toLowerCase())
      );
      
      // Check for signs of directory sites
      const directoryKeywords = ['directory', 'listings', 'reviews', 'rating', 'compare', 'find a', 
        'near me', 'in your area', 'top 10', 'best of'];
      const isDirKeyword = directoryKeywords.some(keyword => 
        titleLower.includes(keyword.toLowerCase()) || snippetLower.includes(keyword.toLowerCase())
      );
      
      // Check for actual business name patterns
      const hasBizName = /[A-Z][a-z]+(\s+[A-Z][a-z]+)*(\s+(Co|Inc|LLC|Ltd|Company|Services|Solutions|Law|Legal|Attorney|Attorneys|Group|Associates|Firm|Office|Partners))?/.test(title);
      
      // Special handling for attorney sites and common professional domains
      const isProfessionalSite = (
        domain.includes('attorney') || 
        domain.includes('lawyer') || 
        domain.includes('law') || 
        domain.includes('legal') ||
        domain.includes('advocate') ||
        (domain.includes('id') && titleLower.includes('attorney')) // Special case for youridattorney.com
      );
      
      // SUPER SIMPLE ANALYSIS - BE INCLUSIVE BY DEFAULT
      
      // 1. Check if this is explicitly on our excluded domains list
      const isExcludedDomain = knownUnsuitableDomains.some(d => domain.includes(d));
      
      // 2. Check if this is definitely a directory site
      const isDirSite = directoryKeywords.filter(keyword => 
        titleLower.includes(keyword.toLowerCase()) || snippetLower.includes(keyword.toLowerCase())
      ).length >= 2;
      
      // 3. Look for fence-specific keywords that guarantee inclusion
      const hasFenceKeywords = 
        titleLower.includes('fence') || 
        titleLower.includes('fencing') || 
        snippetLower.includes('fence installation') || 
        snippetLower.includes('fence company') ||
        snippetLower.includes('fence contractor');
      
      // INCLUSIVE BY DEFAULT: Sites are suitable unless explicitly excluded
      // Force inclusion for fence companies regardless of other checks
      const isSuitable = hasFenceKeywords || (!isExcludedDomain && !isDirSite);
      
      // Determine the business type and create a custom reasoning message
      let businessType = 'local business';
      let confidence = 80;
      let reasoning = '';
      
      if (hasFenceKeywords) {
        businessType = 'fence contractor';
        confidence = 90;
        reasoning = 'Fence company identified by specific keywords in title/description';
      } else if (isSuitable) {
        reasoning = keywordMatches.length > 0
          ? `Appears to be a legitimate business website based on keywords: ${keywordMatches.slice(0, 3).join(', ')}`
          : 'Appears to be a legitimate business website';
      } else {
        reasoning = 'Cannot confidently determine if this is a suitable business website';
      }
      
      // Construct the analysis object for the response
      const analysis = {
        suitable: isSuitable,
        businessType: isSuitable ? businessType : 'unknown',
        confidence: isSuitable ? confidence : 50,
        reasoning: reasoning
      };
      
      // Return the analysis object
      return analysis;
    }
    
    // Initialize analysis variable outside try block to ensure it's always defined
    let analysis;
    
    try {
      // Call OpenAI API with more detailed options
      const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo-0125', // Specify a specific model version
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 500 // Limit token usage
      });

      console.log('OpenAI API call successful');
      
      // Parse the response with error handling
      try {
        analysis = JSON.parse(chatCompletion.choices[0].message.content);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.log('Raw response:', chatCompletion.choices[0].message.content);
        
        // Fall back to local analysis
        analysis = localAnalysis(result);
      }
    } catch (apiError) {
      console.error('OpenAI API error:', apiError);
      
      // Check if this is a rate limit error (429)
      const isRateLimit = apiError.message && apiError.message.includes('429');
      
      if (isRateLimit) {
        console.log('Rate limit encountered, using local analysis instead');
        // Use the local analysis instead of OpenAI when rate limited
        const localResult = localAnalysis(result);
        
        return Response.json({ 
          success: true, 
          analysis: localResult,
          note: 'Analyzed locally due to OpenAI rate limits'
        });
      }
      
      // For other errors, return a simple fallback analysis
      return Response.json({ 
        success: true, 
        analysis: {
          suitable: false,
          businessType: 'unknown - API error',
          confidence: 0,
          reasoning: `OpenAI API error: ${apiError.message}`
        }
      });
    }
    
    // Return the analysis results
    return Response.json({ 
      success: true, 
      analysis 
    });
  } catch (error) {
    console.error("Error in analyze API:", error);
    console.error("Error stack:", error.stack);
    
    // Return a 200 response with error details in the body
    // This prevents the frontend from crashing while still indicating an error
    return Response.json({ 
      success: false, 
      analysis: {
        suitable: false,
        businessType: 'error',
        confidence: 0,
        reasoning: `API error: ${error.message}`
      },
      error: error.message 
    });
  }
}
