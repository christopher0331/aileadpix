// List of sites to exclude - expanded to cover more directory sites and review platforms
export const knownUnsuitableDomains = [
  // Major directories and review sites
  'yelp.com', 'yellowpages.com', 'bbb.org', 'google.com/maps', 'houzz.com', 'homeguide.com',
  'angi.com', 'angieslist.com', 'thumbtack.com', 'homeadvisor.com', 'porch.com',
  'nextdoor.com', 'birdeye.com', 'tripadvisor.com', 'trustpilot.com', 'homeservices.com',
  'expertise.com', 'findabusiness.com', 'toprated.com', 'businessrater.com', 'merchantcircle.com',
  'mapquest.com', 'foursquare.com', 'superpages.com', 'manta.com', 'local.com',
  'kudzu.com', 'customerlobby.com', 'chamberofcommerce.com', 'buildzoom.com', 
  'homestars.com', 'bark.com', 'bizrates.com', 'yext.com',
  
  // Major social platforms
  'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'pinterest.com', 
  'tiktok.com', 'youtube.com', 'reddit.com', 'quora.com', 'medium.com',
  
  // Major search engines
  'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'ask.com', 'baidu.com',
  
  // Major e-commerce platforms (not business websites)
  'amazon.com', 'ebay.com', 'walmart.com', 'etsy.com', 'shopify.com', 'bestbuy.com',
  'target.com', 'homedepot.com', 'lowes.com'
];

// Helper function to extract domain from URL
export function extractDomain(url) {
  try {
    // Handle URLs that don't start with http/https
    if (!url.startsWith('http') && !url.startsWith('https')) {
      url = 'https://' + url;
    }
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.toLowerCase();
  } catch (e) {
    console.error('Error extracting domain from URL:', url, e);
    return url; // Return the original URL if parsing fails
  }
}
