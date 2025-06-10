import OpenAI from 'openai';
import { extractDomain, knownUnsuitableDomains } from '../analyze/utils';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    console.log("Bulk analyze API called");
    const body = await request.json();
    const { results } = body;
    
    console.log(`Received ${results?.length || 0} results for bulk analysis`);
    
    if (!results || !Array.isArray(results) || results.length === 0) {
      console.error("Invalid results data for bulk analysis");
      return Response.json({ 
        success: false, 
        error: "Invalid results data" 
      }, { status: 400 });
    }
    
    // Process results in batches to avoid overwhelming the API
    const batchSize = 5;
    const allAnalyzedResults = [];
    let processedCount = 0;
    
    // Process results in batches
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      const batchPromises = batch.map(async (result) => {
        // Skip invalid results
        if (!result || !result.title || !result.link || !result.snippet) {
          return null;
        }
        
        try {
          // Pre-filter known unsuitable domains
          const domain = extractDomain(result.link);
          const isKnownUnsuitableDomain = knownUnsuitableDomains.some(unsuitableDomain => 
            domain.includes(unsuitableDomain)
          );
          
          // For .gov and .edu domains
          const isGovEduDomain = domain.endsWith('.gov') || domain.endsWith('.edu');
          
          let analysis;
          
          if (isKnownUnsuitableDomain || isGovEduDomain) {
            // Skip OpenAI call for known unsuitable domains
            analysis = {
              suitable: false,
              businessType: isGovEduDomain ? (domain.endsWith('.gov') ? 'government site' : 'educational institution') : 'directory/review site',
              confidence: 95,
              reasoning: `This is a ${isGovEduDomain ? (domain.endsWith('.gov') ? 'government website' : 'educational institution') : 'known directory or review site'} (${domain}) which is not suitable for direct business outreach.`
            };
          } else {
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

            // Call OpenAI API
            const chatCompletion = await openai.chat.completions.create({
              messages: [{ role: 'user', content: prompt }],
              model: 'gpt-3.5-turbo',
              response_format: { type: 'json_object' },
            });

            // Parse the response
            analysis = JSON.parse(chatCompletion.choices[0].message.content);
          }
          
          // If suitable, include in results
          if (analysis.suitable) {
            return {
              ...result,
              analysis
            };
          }
          
          return null;
        } catch (error) {
          console.error(`Error analyzing result ${result.title}:`, error);
          return null;
        } finally {
          processedCount++;
        }
      });
      
      // Wait for all promises in the batch to resolve
      const batchResults = await Promise.all(batchPromises);
      
      // Filter out null results and add to the final array
      allAnalyzedResults.push(...batchResults.filter(result => result !== null));
    }
    
    return Response.json({ 
      success: true, 
      filteredResults: allAnalyzedResults,
      totalProcessed: processedCount,
      suitableCount: allAnalyzedResults.length
    });
  } catch (error) {
    console.error("Error in bulk analyze API:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
