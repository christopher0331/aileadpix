# Email Campaign Generator - System Documentation

## Overview

This Next.js application provides an end-to-end solution for generating personalized cold emails based on website content. It incorporates website scraping, content analysis, AI-powered email generation, and domain management tools for email marketing campaigns.

## System Architecture

### Directory Structure

```
/email-campaign/
├── src/
│   ├── app/
│   │   ├── api/                 # Backend API endpoints
│   │   │   ├── generate-email/  # Email generation API
│   │   │   ├── export-domains/  # Domain extraction API
│   │   │   └── search/          # Business search API
│   │   ├── email-campaign/      # Email campaign generator UI
│   │   ├── domain-export/       # Domain export tool UI
│   │   ├── scraped-contacts/    # Scraped contacts display UI
│   │   └── page.js              # Main application page/search UI
│   └── components/              # Reusable React components
├── domains/                     # Storage for exported domain lists
├── public/                      # Static assets
└── .env.local                   # Environment variables
```

## Core Features & Implementation

### 1. Business Search & Filtering

**Directory:** `/src/app/page.js` & `/src/app/api/search/route.js`

- **Functionality:** Search for businesses by keyword and location
- **Implementation:** Uses search APIs to find relevant businesses
- **Filtering:** Removes directory sites (Yelp, BBB, etc.)
- **Data Flow:** Search results → Filtered list → Local storage

### 2. Email Campaign Generator

**Directory:** `/src/app/email-campaign/page.js` & `/src/app/api/generate-email/route.js`

- **Functionality:** Generates personalized cold emails using website content analysis
- **Implementation:**
  - Scrapes target website content
  - Uses OpenAI to generate personalized emails
  - Provides editable UI for final refinement
- **Customization:** Allows editing service name, price, company name
- **Prompt Editing:** Customizable AI instructions for different email styles

### 3. Domain Export Tool

**Directory:** `/src/app/domain-export/page.js` & `/src/app/api/export-domains/route.js`

- **Functionality:** Extracts domains from URLs and exports to text files
- **Implementation:**
  - Processes URLs to extract clean domain names
  - Normalizes domains (removes www. prefix)
  - Stores in `/domains` directory as text files
  - Provides downloadable output for ML training

### 4. Contact Management

**Directory:** `/src/app/scraped-contacts/page.js`

- **Functionality:** Displays and manages scraped contact information
- **Implementation:** Loads contacts from local storage for review

## API Endpoints

### `/api/generate-email`

- **Method:** POST
- **Payload:** `{ websiteUrl, businessName, serviceName, servicePrice, companyName, customPrompt }`
- **Response:** Generated email content in HTML format
- **Error Handling:** Includes fallbacks for SSL certificate issues

### `/api/export-domains`

- **Method:** POST
- **Payload:** `{ websites: [] }` (array of website URLs)
- **Response:** `{ success, domainsCount, filePath, domains }`
- **Storage:** Creates timestamped text files in `/domains` directory

### `/api/search`

- **Method:** POST
- **Payload:** `{ searchTerm, location }`
- **Response:** Array of business listings with metadata

## Configuration & Environment

### Required Environment Variables

- `OPENAI_API_KEY`: For AI-powered email generation

## Workflow Sequence

1. **Search**: Find businesses using search terms and location
2. **Filter**: Remove directory sites and irrelevant results
3. **Generate**: Create personalized emails based on website content
4. **Edit**: Refine email content manually if needed
5. **Export**: Extract domains for ML applications

## Future Enhancements

- Enhanced filtering system for more accurate business targeting
- Batch email generation for multiple prospects
- Email sending infrastructure with proper authentication
- Domain warming integration
- Analytics for tracking email performance

## Getting Started

To run the development server:

```bash
npm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000)
