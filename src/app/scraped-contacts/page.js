'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MainNav from '../components/MainNav';

const ScrapedContactsPage = () => {
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [scrapedContacts, setScrapedContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Load saved contacts from localStorage
    const loadContacts = () => {
      const savedFiltered = localStorage.getItem('filteredContacts');
      const savedScraped = localStorage.getItem('scrapedContacts');
      
      if (savedFiltered) {
        setFilteredContacts(JSON.parse(savedFiltered));
      }
      
      if (savedScraped) {
        setScrapedContacts(JSON.parse(savedScraped));
      }
      
      setIsLoading(false);
    };
    
    loadContacts();
  }, []);

  const scrapeWebsite = async (url) => {
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape website');
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  };

  const scrapeAllContacts = async () => {
    if (isScraping) return; // Prevent multiple scrape operations

    setIsScraping(true);
    setError(null);
    
    // Get only contacts that haven't been scraped yet
    const contactsToScrape = filteredContacts.filter(contact => {
      return !scrapedContacts.some(scraped => scraped.url === contact.link);
    });
    
    if (contactsToScrape.length === 0) {
      setError('All contacts have already been scraped');
      setIsScraping(false);
      return;
    }
    
    setScrapingProgress({ current: 0, total: contactsToScrape.length });
    
    const newScrapedContacts = [...scrapedContacts];
    
    for (let i = 0; i < contactsToScrape.length; i++) {
      const contact = contactsToScrape[i];
      setScrapingProgress({ current: i + 1, total: contactsToScrape.length });
      
      const scrapedData = await scrapeWebsite(contact.link);
      
      if (scrapedData) {
        // Create new scraped contact with combined data
        const newContact = {
          businessName: contact.title || scrapedData.businessName,
          url: contact.link,
          emails: scrapedData.emails,
          phones: scrapedData.phones,
          scrapedAt: new Date().toISOString(),
          originalInfo: contact
        };
        
        newScrapedContacts.push(newContact);
        
        // Update localStorage after each successful scrape
        localStorage.setItem('scrapedContacts', JSON.stringify(newScrapedContacts));
        setScrapedContacts(newScrapedContacts);
      }
      
      // Add a small delay to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsScraping(false);
  };

  const removeContact = (index) => {
    const updatedContacts = [...scrapedContacts];
    updatedContacts.splice(index, 1);
    setScrapedContacts(updatedContacts);
    localStorage.setItem('scrapedContacts', JSON.stringify(updatedContacts));
  };

  const clearAllContacts = () => {
    if (confirm('Are you sure you want to clear all scraped contacts?')) {
      setScrapedContacts([]);
      localStorage.removeItem('scrapedContacts');
    }
  };
  
  // Export domains for screenshot capture
  const exportDomainsForScreenshots = async () => {
    // Debug information
    console.log('Scraped contacts:', scrapedContacts);
    
    if (scrapedContacts.length === 0) {
      setError('No contacts to export');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Collect all website URLs from scraped contacts
      // Use the url property which is the actual property used in scraped contacts
      const websites = scrapedContacts
        .filter(contact => contact.url)
        .map(contact => contact.url);
      
      // Prepare the contact data for the API
      const processedContacts = scrapedContacts.map(contact => {
        // Format the contact data properly for storage
        return {
          businessName: contact.businessName || '',
          companyName: contact.businessName || '',
          url: contact.url || '',
          // Extract first email if it exists
          email: contact.emails && contact.emails.length > 0 ? contact.emails[0] : '',
          // Extract first phone if it exists
          phone: contact.phones && contact.phones.length > 0 ? contact.phones[0] : '',
          // Extract name if it exists
          name: contact.originalInfo?.name || ''
        };
      });
      
      // Debug - log the extracted websites and contacts
      console.log('Extracted websites:', websites);
      console.log('Processed contacts:', processedContacts);
      
      if (websites.length === 0) {
        setError('No valid websites found in scraped contacts');
        setIsLoading(false);
        return;
      }
      
      // Call the API to export domains, sending both website URLs and contact data
      const response = await fetch('/api/export-domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          websites, 
          contactsData: processedContacts 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export domains');
      }
      
      const result = await response.json();
      
      // Show success message with clear instructions
      setError(null);
      const contactInfoMessage = result.hasContactInfo ? 
        ' Contact information has also been saved for use in the CRM.' : 
        '';
      
      setSuccess(`Successfully exported ${result.domainsCount} domains to ${result.filePath}.${contactInfoMessage} The domains have been formatted correctly for screenshot capture. You can now run your screenshot tool on this file.`);
      alert(`Successfully exported ${result.domainsCount} domains for screenshot capture to ${result.filePath}${contactInfoMessage}`);
    } catch (err) {
      setError(err.message || 'Failed to export domains');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md py-4 px-8 mb-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 text-white p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Scraped Contacts</h1>
          </div>
          <MainNav />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Scraped Business Contacts</h2>
              <p className="text-sm text-gray-500 mt-1">Contact information extracted from business websites</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={scrapeAllContacts}
                disabled={isScraping || filteredContacts.length === 0}
                className={`px-4 py-2 rounded-md ${
                  isScraping || filteredContacts.length === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isScraping ? 'Scraping...' : 'Scrape All New Contacts'}
              </button>
              
              {scrapedContacts.length > 0 && (
                <>
                  <button
                    onClick={exportDomainsForScreenshots}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-md ${
                      isLoading
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isLoading ? 'Exporting...' : 'Export for Screenshots'}
                  </button>
                  
                  <button
                    onClick={clearAllContacts}
                    className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100"
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>

          {isScraping && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col items-center">
                <p className="text-sm text-gray-500 mb-2">
                  Scraping website {scrapingProgress.current} of {scrapingProgress.total}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${(scrapingProgress.current / scrapingProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-600 border-b border-gray-200">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-green-50 text-green-600 border-b border-gray-200">
              {success}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : scrapedContacts.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No scraped contacts yet</h3>
              <p className="mt-1 text-sm text-gray-500">Click the "Scrape All New Contacts" button to extract data from filtered contacts.</p>
              
              {filteredContacts.length === 0 && (
                <div className="mt-6">
                  <Link 
                    href="/filtered-contacts"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Filtered Contacts First
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {scrapedContacts.map((contact, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {contact.businessName}
                    </h3>
                    <button
                      onClick={() => removeContact(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Website:</p>
                      <a 
                        href={contact.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-indigo-600 hover:text-indigo-800 truncate block"
                      >
                        {contact.url}
                      </a>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Emails:</p>
                      {contact.emails && contact.emails.length > 0 ? (
                        contact.emails.map((email, i) => (
                          <div key={i} className="flex items-center mb-1">
                            <a 
                              href={`mailto:${email}`} 
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              {email}
                            </a>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No emails found</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone Numbers:</p>
                      {contact.phones && contact.phones.length > 0 ? (
                        contact.phones.map((phone, i) => (
                          <div key={i} className="flex items-center mb-1">
                            <a 
                              href={`tel:${phone.replace(/[^0-9]/g, '')}`} 
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              {phone}
                            </a>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No phone numbers found</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Scraped:</p>
                      <p className="text-sm text-gray-800">
                        {new Date(contact.scrapedAt).toLocaleDateString()} at {new Date(contact.scrapedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ScrapedContactsPage;
