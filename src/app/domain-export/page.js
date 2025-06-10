'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainNav from '../components/MainNav';

export default function DomainExportPage() {
  const [websites, setWebsites] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isGeneratingScreenshots, setIsGeneratingScreenshots] = useState(false);
  const [screenshotResult, setScreenshotResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Parse websites (split by newline, comma, or space)
      const websiteList = websites
        .split(/[\n,\s]+/)
        .map(site => site.trim())
        .filter(site => site.length > 0);

      if (websiteList.length === 0) {
        throw new Error('Please enter at least one website URL');
      }
      
      // Get contact information from all possible sources
      let contactsData = [];
      try {
        // 1. Get data from filtered contacts (CRM)
        const filteredContactsStr = localStorage.getItem('filteredContacts');
        if (filteredContactsStr) {
          const filteredContacts = JSON.parse(filteredContactsStr);
          contactsData = filteredContacts;
        }
        
        // 2. Get data from domain contacts
        const domainContactsStr = localStorage.getItem('domainContacts');
        if (domainContactsStr) {
          const domainContacts = JSON.parse(domainContactsStr);
          // Merge with existing contacts, giving preference to filtered contacts
          const existingUrls = new Set(contactsData.map(c => c.url));
          const additionalContacts = domainContacts.filter(c => !existingUrls.has(c.url));
          contactsData = [...contactsData, ...additionalContacts];
        }
        
        // 3. Get data from analysis results (which may contain contact information)
        const analysisResultsStr = localStorage.getItem('analysisResults');
        if (analysisResultsStr) {
          try {
            const analysisResults = JSON.parse(analysisResultsStr);
            for (const [key, analysis] of Object.entries(analysisResults)) {
              if (analysis && analysis.contactInfo) {
                const contact = analysis.contactInfo;
                // Check if we already have this URL
                const existingIndex = contactsData.findIndex(c => 
                  c.url && contact.url && c.url.includes(contact.url) || contact.url.includes(c.url)
                );
                
                if (existingIndex === -1) {
                  contactsData.push({
                    businessName: contact.businessName || '',
                    email: contact.email || '',
                    phone: contact.phone || '',
                    name: contact.name || '',
                    url: contact.url || '',
                    notes: contact.notes || '',
                    industry: contact.industry || ''
                  });
                }
              }
            }
          } catch (e) {
            console.error('Error parsing analysis results:', e);
          }
        }
        
        // 4. Also check previous domain exports for contact info
        // This helps ensure consistency across exports
        try {
          const response = await fetch('/api/list-domain-exports');
          if (response.ok) {
            const { files } = await response.json();
            if (files && files.length > 0) {
              // Get the most recent JSON file that's not the one we're about to create
              const jsonFile = files.find(file => file.name.endsWith('.json'));
              if (jsonFile) {
                const jsonResponse = await fetch(`/domains/${jsonFile.name}`);
                if (jsonResponse.ok) {
                  const jsonData = await jsonResponse.json();
                  if (jsonData.contactInfo) {
                    // Add any contacts we don't already have
                    const existingUrls = new Set(contactsData.map(c => c.url));
                    for (const [domain, contactInfo] of Object.entries(jsonData.contactInfo)) {
                      // Check if any of our websites contain this domain
                      const matchingWebsite = websiteList.find(website => {
                        try {
                          return website.includes(domain);
                        } catch (e) {
                          return false;
                        }
                      });
                      
                      if (matchingWebsite && !existingUrls.has(contactInfo.url)) {
                        contactsData.push(contactInfo);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('Error fetching previous domain exports:', e);
        }
        
      } catch (error) {
        console.error('Error reading contacts data from sources:', error);
      }

      // Call our API endpoint
      const response = await fetch('/api/export-domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          websites: websiteList,
          contactsData: contactsData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export domains');
      }

      setResult({
        message: `Successfully exported ${websiteList.length} domains to ${data.txtFile} and ${data.jsonFile}`,
        txtFile: data.txtFile,
        jsonFile: data.jsonFile,
        domainCount: websiteList.length
      });
      
      // Store the latest export file name for easy screenshot generation
      try {
        localStorage.setItem('latestExportFile', data.txtFile);
      } catch (e) {
        console.error('Failed to store latest export filename:', e);
      }
    } catch (err) {
      console.error('Error exporting domains:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = () => {
    if (!result || !result.txtFile) return;

    const url = `/domains/${result.txtFile}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = result.txtFile;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
  };

  // Function to generate screenshots for the latest export
  const generateScreenshots = async () => {
    setIsGeneratingScreenshots(true);
    setScreenshotResult(null);
    setError(null);
    
    try {
      // Get the latest export file name from localStorage or use the one from result
      const latestFile = localStorage.getItem('latestExportFile') || 
                         (result && result.txtFile) || 
                         null;
      
      if (!latestFile) {
        throw new Error('No domain export found. Please export domains first.');
      }
      
      const response = await fetch('/api/run-screenshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainFile: latestFile }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start screenshot generation');
      }
      
      const data = await response.json();
      
      setScreenshotResult({
        message: data.message,
        success: data.success
      });
      
    } catch (error) {
      setError(error.message);
    } finally {
      setIsGeneratingScreenshots(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Domain Export Tool</h1>
          <MainNav />
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">
              Export Domains to Text File (for ML)
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter website URLs (one per line or comma-separated) to extract and export their domains.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label htmlFor="websites" className="block text-sm font-medium text-gray-900 mb-2">
                Website URLs
              </label>
              <textarea
                id="websites"
                rows={10}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                placeholder="Enter URLs here (e.g., example.com, https://another-site.com)"
                value={websites}
                onChange={(e) => setWebsites(e.target.value)}
              />
              <p className="mt-2 text-sm text-gray-500">
                You can paste from a spreadsheet, separate with commas, or put one URL per line.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  isLoading 
                    ? 'bg-indigo-400' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isLoading ? 'Processing...' : 'Export Domains'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mx-6 mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="mx-6 mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {result.domainCount} Domains Exported
                </h3>
                <div className="space-x-2">
                  <button
                    onClick={downloadFile}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
                  >
                    Download Text File
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                Files saved on server: <br/>
                <span className="font-mono text-xs bg-gray-100 px-1 rounded">{result.txtFile}</span> and <span className="font-mono text-xs bg-gray-100 px-1 rounded">{result.jsonFile}</span>
              </p>
              
              {/* Add Generate Screenshots button */}
              <div className="mt-4 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={generateScreenshots}
                  disabled={isGeneratingScreenshots}
                  className={`w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                    ${isGeneratingScreenshots 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
                >
                  {isGeneratingScreenshots ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Screenshots...
                    </>
                  ) : 'Generate Website Screenshots for Review'}
                </button>
                <p className="mt-2 text-sm text-gray-500 text-center">
                  This will capture screenshots of the exported domains for review
                </p>
              </div>
            </div>
          )}
          
          {/* Display screenshot generation result */}
          {screenshotResult && (
            <div className={`mx-6 mb-6 p-4 ${screenshotResult.success ? 'bg-blue-50 border border-blue-200' : 'bg-yellow-50 border border-yellow-200'} rounded-md`}>
              <h3 className={`text-lg font-medium ${screenshotResult.success ? 'text-blue-800' : 'text-yellow-800'}`}>
                Screenshot Generation
              </h3>
              <p className={`mt-2 ${screenshotResult.success ? 'text-blue-700' : 'text-yellow-700'}`}>
                {screenshotResult.message}
              </p>
              {screenshotResult.success && (
                <div className="mt-3">
                  <Link 
                    href="/screenshot-review" 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md inline-flex items-center"
                  >
                    Go to Screenshot Review
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
