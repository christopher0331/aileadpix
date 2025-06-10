# Directory Site Filtering Implementation Guide

## Overview

This document provides technical details on how the email campaign system filters out directory, aggregator, and marketplace sites to identify genuine business websites for targeting.

## Current Implementation

The filtering system is implemented in the search process and works as follows:

### Filter Rules

```javascript
// Basic list of directory/aggregator sites to filter out
const directoryDomains = [
  'yelp.com',
  'bbb.org',
  'yellowpages.com',
  'thumbtack.com',
  'angi.com',
  'homeadvisor.com',
  'google.com',
  'facebook.com',
  'linkedin.com',
  'mapquest.com',
  'superpages.com',
  'foursquare.com',
  'tripadvisor.com',
  'indeed.com',
  'glassdoor.com',
  'craigslist.org',
  'amazon.com',
  'ebay.com',
  'houzz.com',
  'pinterest.com',
  'instagram.com',
  'twitter.com',
  'manta.com',
  'citysearch.com',
  'merchantcircle.com',
  'angieslist.com'
];

// Check if a URL is from a directory site
function isDirectorySite(url) {
  if (!url) return false;
  
  // Normalize URL
  url = url.toLowerCase();
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  
  try {
    const domain = new URL(url).hostname;
    
    // Check if domain or parent domain matches any directory site
    return directoryDomains.some(dirDomain => 
      domain === dirDomain || 
      domain.endsWith('.' + dirDomain)
    );
  } catch (error) {
    console.error('Error checking URL:', error);
    return false;
  }
}
```

## Filtering Logic

The system filters websites at multiple points:

1. **During Search Results Processing**
   - Removes known directory sites from search results
   - Preserves actual business websites

2. **Before Email Generation**
   - Validates that the target website is not a directory site
   - Prevents wasting resources on generating emails for non-targets

3. **In Domain Export Tool**
   - Normalizes domains (removes www. prefix)
   - Filters out known directory sites from the export list

## Improvement Roadmap

### Short-Term Enhancements

1. **Pattern-Based Filtering**
   - Add pattern matching for directory-like URLs
   - Example: URLs containing `/biz/`, `/listing/`, `/profile/`

2. **Domain Categorization**
   - Split filter list into categories (review sites, marketplaces, social platforms)
   - Allow selective filtering by category

### Medium-Term Enhancements

1. **ML-Based Classification**
   - Train a simple classifier to identify directory sites based on URL patterns and content
   - Implement as a pre-processing step before email generation

2. **Content-Based Analysis**
   - Analyze website content to determine if it's a directory
   - Look for patterns like multiple business listings, review systems, etc.

### Long-Term Vision

1. **Automatic Updating**
   - Periodically update the directory site list based on encountered sites
   - Learn from user feedback when sites are incorrectly filtered

2. **Business Quality Scoring**
   - Beyond filtering directories, score businesses on likelihood of being good prospects
   - Factors: website quality, business size, contact information availability

## Usage

To apply filtering in custom code:

```javascript
import { isDirectorySite } from '@/utils/filtering';

// Example usage
const websites = ['example.com', 'yelp.com/biz/some-business'];
const filteredWebsites = websites.filter(site => !isDirectorySite(site));
```

## Updating the Filter List

When new directory sites are identified:

1. Add the domain to the `directoryDomains` array
2. If there are many related subdomains, consider adding pattern matching
3. Document the reason for adding in comments if it's not obvious
