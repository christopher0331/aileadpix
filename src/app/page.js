'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
  </div>
);

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('California, United States');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notSuitableList, setNotSuitableList] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeTab, setActiveTab] = useState('search');
  const [resultCount, setResultCount] = useState(0);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  const [analyzingIndex, setAnalyzingIndex] = useState(null);
  const [analysisResults, setAnalysisResults] = useState({});
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ processed: 0, suitable: 0 });
  const [showNotSuitableModal, setShowNotSuitableModal] = useState(false);

  // Load recent searches and filtered contacts from localStorage on component mount
  useEffect(() => {
    // Initialize localStorage for filtered contacts if needed
    if (!localStorage.getItem('filteredContacts')) {
      localStorage.setItem('filteredContacts', JSON.stringify([]));      
    }
    
    // Load search history
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setRecentSearches(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error parsing search history:', e);
      }
    }
    
    // Initialize or load not suitable list
    const savedNotSuitable = localStorage.getItem('notSuitableList');
    if (savedNotSuitable) {
      try {
        setNotSuitableList(JSON.parse(savedNotSuitable));
      } catch (e) {
        console.error('Error parsing not suitable list:', e);
        // Initialize with default domains if we can't parse existing list
        const defaultList = ['homeguide.com', 'owenscroning.com'];
        localStorage.setItem('notSuitableList', JSON.stringify(defaultList));
        setNotSuitableList(defaultList);
      }
    } else {
      // First time initializing - set default list
      const defaultList = ['homeguide.com', 'owenscroning.com'];
      localStorage.setItem('notSuitableList', JSON.stringify(defaultList));
      setNotSuitableList(defaultList);
    }
  }, []);

  const saveSearch = (term, loc) => {
    const newSearch = { term, location: loc, timestamp: new Date().toISOString() };
    const updatedSearches = [newSearch, ...recentSearches.slice(0, 4)]; // Keep only the 5 most recent
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setActiveTab('results');
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchTerm, location }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results || []);
        setResultCount(data.resultCount || 0);
        setCurrentPage(1); // Reset to first page when new search results come in
        console.log(`Search results: ${data.resultCount} found`);
        saveSearch(searchTerm, location);
        
        // Process up to 150 search results
        const resultsToProcess = data.results.slice(0, 150);
        console.log(`Starting batch analysis of ${resultsToProcess.length} search results...`);
        setBulkProgress({ processed: 0, suitable: 0 });
        
        // Function to process results in batches to avoid overwhelming the API
        const processBatch = async (allResults, batchSize = 5, startIndex = 0) => {
          if (startIndex >= allResults.length) {
            console.log('Batch processing complete!');
            return;
          }
          
          // Get the current batch
          const endIndex = Math.min(startIndex + batchSize, allResults.length);
          const currentBatch = allResults.slice(startIndex, endIndex);
          
          console.log(`Processing batch ${Math.floor(startIndex / batchSize) + 1}: items ${startIndex + 1} to ${endIndex}`);
          
          let suitableInBatch = 0;
          
          // Process each result in the batch
          const batchPromises = currentBatch.map(async (result, idx) => {
            const index = startIndex + idx;
            console.log(`Analyzing result ${index + 1}/${allResults.length}: ${result.title}`);
            
            try {
              const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ result }),
              });
              
              // Even if response is not ok, we'll try to parse the response
              // The API now returns a 200 status with error details in the body
              const analysisData = await response.json();
              
              if (!response.ok) {
                console.warn(`Warning: Non-200 status (${response.status}) for ${result.title}`);
              }
              
              if (!analysisData.success) {
                console.error(`Analysis failed for ${result.title}: ${analysisData.error || 'Unknown error'}`);
              }
              
              // If we have analysis data, even with errors, we can still use it
              // Our updated API always provides a fallback analysis object
              const isSuitable = analysisData.success && analysisData.analysis?.suitable;
              
              console.log(`Analysis complete for ${result.title}:`, isSuitable ? 'SUITABLE' : 'NOT SUITABLE');
              
              if (isSuitable) {
                // Add to filtered contacts if suitable
                addToFilteredContacts(result, analysisData.analysis);
                suitableInBatch++;
              }
              
              // Update the analysis results state for UI
              setAnalysisResults(prev => ({
                ...prev,
                [index]: analysisData.analysis
              }));
              
              return analysisData;
            } catch (err) {
              console.error(`Error analyzing result ${index}:`, err);
              return null;
            }
          });
          
          // Wait for all batch promises to complete
          await Promise.all(batchPromises);
          
          // Update progress
          setBulkProgress(prev => {
            const newProcessed = prev.processed + currentBatch.length;
            const newSuitable = prev.suitable + suitableInBatch;
            console.log(`Progress: ${newProcessed}/${allResults.length} processed, ${newSuitable} suitable`);
            return {
              processed: newProcessed,
              suitable: newSuitable
            };
          });
          
          // Process the next batch after a short delay
          setTimeout(() => {
            processBatch(allResults, batchSize, endIndex);
          }, 1000); // 1 second delay between batches to avoid rate limits
        };
        
        // Start batch processing with limited results
        processBatch(resultsToProcess);
      } else {
        setError(data.error || 'Failed to fetch results');
      }
    } catch (err) {
      setError('An error occurred while fetching results');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const analyzeBulkResults = async (resultsToAnalyze) => {
    console.log('Starting bulk analysis...');
    setBulkAnalyzing(true);
    setBulkProgress({ processed: 0, suitable: 0 });
    
    // Clone the results array to avoid any reference issues
    const resultsForAnalysis = [...resultsToAnalyze];
    
    try {
      console.log(`Sending ${resultsForAnalysis.length} results to bulk-analyze endpoint`);
      const response = await fetch('/api/bulk-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ results: resultsForAnalysis }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Bulk analysis response received:', data);
      
      if (data.success) {
        // Update progress info
        console.log(`Analysis complete: ${data.totalProcessed} processed, ${data.suitableCount} suitable`);
        setBulkProgress({
          processed: data.totalProcessed,
          suitable: data.suitableCount
        });
        
        // Add suitable results to filtered contacts
        if (data.filteredResults && data.filteredResults.length > 0) {
          console.log(`Adding ${data.filteredResults.length} suitable results to contacts`);
          
          // Get current contacts from localStorage to ensure we have the latest
          const currentContactsJson = localStorage.getItem('filteredContacts');
          const currentContacts = currentContactsJson ? JSON.parse(currentContactsJson) : [];
          
          const newContacts = data.filteredResults.map(result => {
            // Handle case where analysis might be missing or undefined
            const analysis = result.analysis || {};
            return {
              ...result,
              businessType: analysis.businessType || 'local business',
              confidence: analysis.confidence || 70,
              reasoning: analysis.reasoning || 'Analysis data not available',
              addedAt: new Date().toISOString()
            };
          });
          
          // Update filtered contacts (avoiding duplicates by URL)
          const updatedContacts = [...currentContacts];
          let addedCount = 0;
          
          newContacts.forEach(newContact => {
            // Check if this contact already exists by URL
            const isDuplicate = updatedContacts.some(existingContact => 
              existingContact.link === newContact.link
            );
            
            if (!isDuplicate) {
              updatedContacts.push(newContact);
              addedCount++;
            }
          });
          
          if (addedCount > 0) {
            console.log(`${addedCount} new contacts added to filtered contacts`);
            setFilteredContacts(updatedContacts);
            localStorage.setItem('filteredContacts', JSON.stringify(updatedContacts));
            
            // Show notification
            if (addedCount === 1) {
              alert(`1 new suitable business added to your filtered contacts!`);
            } else {
              alert(`${addedCount} new suitable businesses added to your filtered contacts!`);
            }
          } else {
            console.log('No new contacts added (all were duplicates)');
          }
        } else {
          console.log('No suitable results found from analysis');
        }
      } else {
        console.error('Bulk analysis error:', data.error);
        alert('Error during bulk analysis: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error during bulk analysis:', err);
      alert('Error during bulk analysis: ' + err.message);
    } finally {
      setBulkAnalyzing(false);
    }
  };

    const handleRecentSearchClick = (search) => {
    setSearchTerm(search.term);
    setLocation(search.location);
    setActiveTab('search');
  };
  
  const analyzeResult = async (result, index) => {
    setAnalyzingIndex(index);
    
    try {
      // Extract domain from URL
      const urlObj = new URL(result.link);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Check if domain is in our not suitable list
      if (notSuitableList.some(notSuitableDomain => domain.includes(notSuitableDomain))) {
        // Manually mark as not suitable without calling the API
        setAnalysisResults(prev => ({
          ...prev,
          [index]: {
            suitable: false,
            businessType: 'Blacklisted Domain',
            reasoning: 'This domain has been manually marked as not suitable for outreach.'
          }
        }));
        setAnalyzingIndex(null);
        return;
      }
      
      // Proceed with normal analysis if not in our manual list
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ result }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAnalysisResults(prev => ({
          ...prev,
          [index]: data.analysis
        }));
      } else {
        console.error('Analysis error:', data.error);
      }
    } catch (err) {
      console.error('Error analyzing result:', err);
    } finally {
      setAnalyzingIndex(null);
    }
  };
  
  const markAsNotSuitable = (result) => {
    try {
      // Extract domain from URL
      const urlObj = new URL(result.link);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Check if already in the list
      if (notSuitableList.some(item => item === domain)) {
        alert(`${domain} is already in the Not Suitable list`);
        return;
      }
      
      // Add to notSuitableList
      const updatedList = [...notSuitableList, domain];
      setNotSuitableList(updatedList);
      
      // Save to localStorage
      localStorage.setItem('notSuitableList', JSON.stringify(updatedList));
      
      alert(`Added ${domain} to the Not Suitable list. This domain will now be automatically rejected.`);
      
      // Reset analysis for any current results with this domain
      const updatedAnalysisResults = {};
      for (const [key, analysis] of Object.entries(analysisResults)) {
        const resultIndex = parseInt(key);
        const result = results[resultIndex];
        
        if (result) {
          try {
            const resultDomain = new URL(result.link).hostname.replace('www.', '');
            if (resultDomain === domain) {
              updatedAnalysisResults[key] = {
                suitable: false,
                businessType: 'Blacklisted Domain',
                reasoning: 'This domain has been manually marked as not suitable for outreach.'
              };
            } else {
              updatedAnalysisResults[key] = analysis;
            }
          } catch (e) {
            updatedAnalysisResults[key] = analysis;
          }
        }
      }
      
      setAnalysisResults(updatedAnalysisResults);
      
    } catch (error) {
      console.error('Error marking as not suitable:', error);
      alert('Could not add domain to Not Suitable list. Please check the console for errors.');
    }
  };
  
  const removeFromNotSuitable = (domain) => {
    const updatedList = notSuitableList.filter(item => item !== domain);
    setNotSuitableList(updatedList);
    localStorage.setItem('notSuitableList', JSON.stringify(updatedList));
  };
  
  const addManualNotSuitableDomain = (event) => {
    event.preventDefault();
    const domainInput = document.getElementById('manual-domain');
    const domain = domainInput.value.trim().toLowerCase();
    
    if (!domain) {
      alert('Please enter a domain');
      return;
    }
    
    if (notSuitableList.includes(domain)) {
      alert(`${domain} is already in the Not Suitable list`);
      return;
    }
    
    const updatedList = [...notSuitableList, domain];
    setNotSuitableList(updatedList);
    localStorage.setItem('notSuitableList', JSON.stringify(updatedList));
    
    // Clear the input
    domainInput.value = '';
  };

  const addToFilteredContacts = (result, analysis) => {
    console.log('Adding to filtered contacts:', result.title);
    console.log('Analysis data:', analysis);
    
    // Force re-read from localStorage to get most current data
    const currentData = localStorage.getItem('filteredContacts');
    let currentContacts = [];
    
    if (currentData) {
      try {
        currentContacts = JSON.parse(currentData);
        console.log(`Read ${currentContacts.length} contacts from localStorage`);
      } catch (error) {
        console.error('Error parsing localStorage data:', error);
        // If localStorage is corrupted, start fresh
        currentContacts = [];
      }
    } else {
      console.log('No existing contacts in localStorage');
    }
    
    // Check if this result is already in currentContacts
    const isDuplicate = currentContacts.some(contact => {
      const isDup = contact.link === result.link;
      if (isDup) console.log(`Found duplicate: ${result.title} with link ${result.link}`);
      return isDup;
    });
    
    if (isDuplicate) {
      console.log(`Skipping duplicate: ${result.title}`);
      return; // Skip duplicates
    }
    
    const newContact = {
      ...result,
      businessType: analysis.businessType || 'Business',
      confidence: analysis.confidence || 'High',
      reasoning: analysis.reasoning || 'Suitable business',
      addedAt: new Date().toISOString()
    };
    
    console.log('Adding new contact object:', newContact.title);
    
    // Use the current contacts from localStorage directly
    const updatedContacts = [...currentContacts, newContact];
    
    // Update React state for UI consistency
    setFilteredContacts(updatedContacts);
    
    // Explicitly log the size of what we're saving
    const contactsJson = JSON.stringify(updatedContacts);
    console.log(`Saving ${updatedContacts.length} contacts to localStorage (${contactsJson.length} bytes)`);
    
    try {
      localStorage.setItem('filteredContacts', contactsJson);
      console.log(`Successfully saved contact "${newContact.title}" to localStorage`);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
    // Don't show alerts during bulk processing, it's disruptive
    // alert(`Added ${result.title} to filtered contacts!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 shadow-lg mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-full">
              <EmailIcon />
            </div>
            <h1 className="text-2xl font-semibold text-white">Email Finder</h1>
          </div>
          <nav className="flex items-center space-x-4 text-gray-200">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-2 rounded-md text-sm ${activeTab === 'search' ? 'bg-white text-gray-900' : 'hover:bg-gray-700 hover:text-white'}`}
            >
              Search
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-2 rounded-md text-sm ${activeTab === 'history' ? 'bg-white text-gray-900' : 'hover:bg-gray-700 hover:text-white'}`}
            >
              History
            </button>
            <Link
              href="/filtered-contacts"
              className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-gray-700 hover:text-white"
            >
              <span>Filtered Contacts</span>
              {filteredContacts.length > 0 && (
                <span className="ml-1.5 flex items-center justify-center w-5 h-5 bg-indigo-500 text-white text-xs font-medium rounded-full">
                  {filteredContacts.length}
                </span>
              )}
            </Link>
            <Link
              href="/scraped-contacts"
              className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-gray-700 hover:text-white"
            >
              <span>Scraped Contacts</span>
            </Link>
            <Link
              href="/email-campaign"
              className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-gray-700 hover:text-white"
            >
              <span>Email Campaign</span>
            </Link>
            <Link
              href="/screenshot-review"
              className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-gray-700 hover:text-white"
            >
              <span>Screenshot Review</span>
            </Link>
            <Link
              href="/crm"
              className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-gray-700 hover:text-white"
            >
              <span>CRM</span>
            </Link>
            <Link
              href="/domain-export"
              className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-gray-700 hover:text-white"
            >
              <span>Domain Export</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Not Suitable Domains Modal */}
        {showNotSuitableModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Not Suitable Domains</h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          These domains will be automatically rejected during analysis. They will never get past the first screening.  
                        </p>
                        
                        {/* List of domains */}
                        <div className="mt-4 max-h-60 overflow-y-auto">
                          {notSuitableList.length === 0 ? (
                            <p className="text-sm text-gray-500 py-2">No domains in the Not Suitable list.</p>
                          ) : (
                            <ul className="divide-y divide-gray-200">
                              {notSuitableList.map((domain) => (
                                <li key={domain} className="py-2 flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-900">{domain}</span>
                                  <button
                                    onClick={() => removeFromNotSuitable(domain)}
                                    className="ml-2 text-xs text-red-600 hover:text-red-800"
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        
                        {/* Add domain form */}
                        <form onSubmit={addManualNotSuitableDomain} className="mt-4">
                          <div className="flex">
                            <input
                              id="manual-domain"
                              type="text"
                              placeholder="Enter domain (e.g., example.com)"
                              className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Add
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => setShowNotSuitableModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Search Form Tab */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Find Business Emails</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700">
                    Search Term
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <SearchIcon />
                    </div>
                    <input
                      id="searchTerm"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="marketing agencies, law firms, etc."
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 bg-gray-50 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-600 font-medium"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Enter industry, company type, or specific business</p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <LocationIcon />
                    </div>
                    <input
                      id="location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State, or Country"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 bg-gray-50 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-600 font-medium"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Specify the geographic area to search</p>
                </div>
              </div>
              
              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white text-lg font-medium rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Searching...' : 'Find Emails'}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tips Section */}
            <div className="mt-12 bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-800 mb-4">Search Tips</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• Use specific industry terms for better results ("digital marketing agencies" instead of just "marketing")</li>
                <li>• Include location details like city and state for more precise targeting</li>
                <li>• Try different combinations of search terms to expand your results</li>
                <li>• Search results will show top 10 matches from Google search</li>
              </ul>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Search Results</h2>
                <p className="text-sm text-gray-500 mt-1">Found {resultCount} results for "{searchTerm}" in {location}</p>
              </div>
              <button 
                onClick={() => setShowNotSuitableModal(true)}
                className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 hover:bg-red-200"
              >
                Manage Not Suitable List
              </button>
              {bulkAnalyzing ? (
                <div className="flex items-center">
                  <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-600">Analyzing {bulkProgress.processed}/{resultCount}</span>
                </div>
              ) : bulkProgress.suitable > 0 ? (
                <div className="text-sm text-green-600">
                  <span className="font-medium">{bulkProgress.suitable}</span> suitable businesses found and added to contacts
                </div>
              ) : null}
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="p-6 text-center text-red-500">{error}</div>
            ) : results.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms or location for more results.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setActiveTab('search')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    New Search
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-gray-200">
                  {/* Paginate the results */}
                  {results
                    .slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)
                    .map((result, index) => (
                    <div key={index} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {result.title}
                      </h3>
                      <p className="text-gray-600 mb-3">{result.snippet}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <a 
                          href={result.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                        >
                          <LinkIcon />
                          Visit Website
                        </a>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-500 text-xs">{result.link.split('/')[2]}</span>
                        
                        {/* Analyze button */}
                        <button 
                          onClick={() => analyzeResult(result, index + (currentPage - 1) * resultsPerPage)}
                          className={`ml-2 px-3 py-1 text-xs rounded-full ${analyzingIndex === index + (currentPage - 1) * resultsPerPage
                            ? 'bg-yellow-100 text-yellow-800'
                            : analysisResults[index + (currentPage - 1) * resultsPerPage]
                              ? (analysisResults[index + (currentPage - 1) * resultsPerPage].suitable 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800')
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          disabled={analyzingIndex === index + (currentPage - 1) * resultsPerPage}
                        >
                          {analyzingIndex === index + (currentPage - 1) * resultsPerPage 
                            ? 'Analyzing...' 
                            : analysisResults[index + (currentPage - 1) * resultsPerPage] 
                              ? (analysisResults[index + (currentPage - 1) * resultsPerPage].suitable 
                                  ? 'Suitable ✓' 
                                  : 'Not Suitable ✗')
                              : 'Analyze'}
                        </button>
                        
                        {/* Add to contacts button */}
                        {analysisResults[index + (currentPage - 1) * resultsPerPage] && 
                         analysisResults[index + (currentPage - 1) * resultsPerPage].suitable && (
                          <button 
                            onClick={() => addToFilteredContacts(result, analysisResults[index + (currentPage - 1) * resultsPerPage])}
                            className="ml-2 px-3 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                          >
                            Add to Contacts
                          </button>
                        )}
                        
                        {/* Mark as Not Suitable button */}
                        {analysisResults[index + (currentPage - 1) * resultsPerPage] && (
                          <button 
                            onClick={() => markAsNotSuitable(result)}
                            className="ml-2 px-3 py-1 text-xs rounded-full bg-red-100 text-red-800 hover:bg-red-200"
                            title="Add domain to the permanent Not Suitable list"
                          >
                            Mark Not Suitable
                          </button>
                        )}
                      </div>
                      
                      {/* Analysis result */}
                      {analysisResults[index + (currentPage - 1) * resultsPerPage] && (
                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          <span className="font-medium">Analysis:</span> {analysisResults[index + (currentPage - 1) * resultsPerPage].businessType} - 
                          <span className="text-gray-500">{analysisResults[index + (currentPage - 1) * resultsPerPage].reasoning}</span>
                          <div className="mt-1 text-xs text-gray-500">Confidence: {analysisResults[index + (currentPage - 1) * resultsPerPage].confidence}%</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Pagination controls */}
                {resultCount > resultsPerPage && (
                  <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(resultCount / resultsPerPage)))}
                        disabled={currentPage >= Math.ceil(resultCount / resultsPerPage)}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{Math.min((currentPage - 1) * resultsPerPage + 1, resultCount)}</span> to{' '}
                          <span className="font-medium">{Math.min(currentPage * resultsPerPage, resultCount)}</span> of{' '}
                          <span className="font-medium">{resultCount}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {/* Page number buttons - show up to 5 pages */}
                          {Array.from({ length: Math.min(5, Math.ceil(resultCount / resultsPerPage)) }, (_, i) => {
                            // If we have more than 5 pages, we need to adjust which ones we show
                            const totalPages = Math.ceil(resultCount / resultsPerPage);
                            let pageNum;
                            
                            if (totalPages <= 5) {
                              // If 5 or fewer pages, show all pages 1 through 5
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              // If on pages 1-3, show pages 1-5
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              // If on last 3 pages, show last 5 pages
                              pageNum = totalPages - 4 + i;
                            } else {
                              // Otherwise show 2 before and 2 after current page
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                aria-current={currentPage === pageNum ? "page" : undefined}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === pageNum
                                  ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                  : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(resultCount / resultsPerPage)))}
                            disabled={currentPage >= Math.ceil(resultCount / resultsPerPage)}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-800">Recent Searches</h2>
            </div>

            {recentSearches.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No search history</h3>
                <p className="mt-1 text-sm text-gray-500">Your recent searches will appear here.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setActiveTab('search')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Start Searching
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentSearches.map((search, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer" onClick={() => handleRecentSearchClick(search)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{search.term}</h3>
                        <p className="text-sm text-gray-500">Location: {search.location}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(search.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Email Finder Tool. Search powered by SerpAPI.
          </p>
        </div>
      </footer>
    </div>
  );
}
