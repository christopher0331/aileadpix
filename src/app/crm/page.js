'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import MainNav from '../components/MainNav';

export default function CRMPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, approved, rejected

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // 1. Load scraped contacts from localStorage
        const savedScrapedContacts = localStorage.getItem('scrapedContacts');
        const scrapedContacts = savedScrapedContacts ? JSON.parse(savedScrapedContacts) : [];
        
        // 2. Load screenshot decisions from API
        const decisionsResponse = await fetch('/api/screenshot-decisions');
        if (!decisionsResponse.ok) {
          throw new Error('Failed to load screenshot decisions');
        }
        const { decisions } = await decisionsResponse.json();
        
        // 3. Load screenshot manifest
        const manifestResponse = await fetch('/manifest.json');
        if (!manifestResponse.ok) {
          throw new Error('Failed to load screenshot manifest');
        }
        const manifest = await manifestResponse.json();
        
        // 4. List domain files to find JSON contact information
        const domainFilesResponse = await fetch('/api/run-screenshots', {
          method: 'GET'
        });
        
        let contactInfoFromFiles = {};
        
        if (domainFilesResponse.ok) {
          const { domainFiles } = await domainFilesResponse.json();
          
          // Look for matching JSON files
          const jsonFiles = domainFiles.filter(file => file.endsWith('.json'));
          
          // Load contact information from each JSON file
          for (const jsonFile of jsonFiles) {
            try {
              const response = await fetch(`/domains/${jsonFile}`);
              if (response.ok) {
                const data = await response.json();
                if (data.contactInfo) {
                  // Merge the contact info from this file
                  contactInfoFromFiles = {...contactInfoFromFiles, ...data.contactInfo};
                }
              }
            } catch (error) {
              console.error(`Error loading contact info from ${jsonFile}:`, error);
            }
          }
        }
        
        // 5. Combine all data sources
        const combinedData = [];
        
        // First add data from scraped contacts
        scrapedContacts.forEach(contact => {
          const domain = contact.url ? new URL(contact.url).hostname.replace('www.', '') : '';
          const decision = decisions ? decisions[domain] : undefined;
          const screenshotInfo = manifest ? manifest.find(item => item.domain === domain) : null;
          
          combinedData.push({
            ...contact,
            domain,
            approved: decision,
            screenshotPath: screenshotInfo?.file || null,
            // Format email and phone
            email: contact.emails && contact.emails.length > 0 ? contact.emails[0] : '',
            phone: contact.phones && contact.phones.length > 0 ? contact.phones[0] : '',
            // Add business name if available, otherwise use domain or email
            businessName: contact.businessName || contact.companyName || domain || contact.email?.split('@')[1] || 'Unknown',
            name: contact.originalInfo?.name || ''
          });
        });
        
        // Then add any domains from the contact info files that aren't in scraped contacts
        Object.entries(contactInfoFromFiles).forEach(([domain, contactInfo]) => {
          // Check if this domain is already in combinedData
          const existingIndex = combinedData.findIndex(c => c.domain === domain);
          
          if (existingIndex >= 0) {
            // Merge with existing entry, prioritizing scraped contact data
            combinedData[existingIndex] = {
              ...contactInfo,
              ...combinedData[existingIndex],
              // If businessName wasn't set, use it from contactInfo
              businessName: combinedData[existingIndex].businessName === domain ? 
                            contactInfo.businessName || domain : 
                            combinedData[existingIndex].businessName
            };
          } else {
            // Add new entry from contact info
            const decision = decisions ? decisions[domain] : undefined;
            const screenshotInfo = manifest ? manifest.find(item => item.domain === domain) : null;
            
            combinedData.push({
              ...contactInfo,
              domain,
              approved: decision,
              screenshotPath: screenshotInfo?.file || null,
              businessName: contactInfo.businessName || contactInfo.companyName || domain || 'Unknown',
              // Ensure these fields exist
              emails: [],
              phones: []
            });
          }
        });
        
        setContacts(combinedData);
      } catch (err) {
        console.error('Error loading CRM data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  // Filter contacts based on search term and filter selection
  const filteredContacts = contacts.filter(contact => {
    // First filter by approval status
    if (filterBy === 'approved' && contact.approved !== true) return false;
    if (filterBy === 'rejected' && contact.approved !== false) return false;
    if (filterBy === 'pending' && contact.approved !== undefined) return false;
    
    // Then filter by search term
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (contact.businessName && contact.businessName.toLowerCase().includes(searchLower)) ||
      (contact.domain && contact.domain.toLowerCase().includes(searchLower)) ||
      (contact.email && contact.email.toLowerCase().includes(searchLower)) ||
      (contact.phone && contact.phone.includes(searchLower)) ||
      (contact.name && contact.name.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading CRM data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">Error Loading Data</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            href="/"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md py-4 px-8 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 text-white p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Campaign CRM</h1>
          </div>
          <MainNav />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <h2 className="text-xl font-semibold text-gray-900">
              Contact Database
              <span className="ml-2 text-sm font-medium text-gray-700">
                ({filteredContacts.length} of {contacts.length} contacts)
              </span>
            </h2>
            
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search contacts..."
                  className="px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 placeholder-gray-500 bg-white"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 absolute right-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 bg-white font-medium"
                aria-label="Filter contacts"
              >
                <option value="all" className="text-gray-800">All Contacts</option>
                <option value="approved" className="text-gray-800">Approved Only</option>
                <option value="rejected" className="text-gray-800">Rejected Only</option>
                <option value="pending" className="text-gray-800">Pending Review</option>
              </select>
            </div>
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No contacts found</h3>
            <p className="mt-1 text-gray-700">
              {searchTerm 
                ? `No contacts match your search for "${searchTerm}"`
                : filterBy !== 'all' 
                  ? `No contacts with status "${filterBy}"`
                  : "You haven't collected any contacts yet"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map((contact, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                <div className={`h-2 ${contact.approved === true ? 'bg-green-500' : contact.approved === false ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                
                {/* Screenshot Section */}
                <div className="relative h-40 bg-gray-100">
                  {contact.screenshotPath ? (
                    <Image
                      src={`/${contact.screenshotPath}`}
                      alt={`Screenshot of ${contact.domain}`}
                      fill
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 text-sm">No screenshot available</p>
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div className="p-5">
                  {/* Business Name and Status Badge */}
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">{contact.businessName}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      contact.approved === true 
                        ? 'bg-green-100 text-green-900' 
                        : contact.approved === false 
                          ? 'bg-red-100 text-red-900' 
                          : 'bg-gray-200 text-gray-900'
                    }`}>
                      {contact.approved === true 
                        ? 'Approved' 
                        : contact.approved === false 
                          ? 'Rejected' 
                          : 'Pending'}
                    </span>
                  </div>
                  
                  {/* Domain/Website */}
                  {contact.domain && (
                    <div className="mt-1 mb-3">
                      <a 
                        href={contact.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-700 hover:text-indigo-900 font-medium truncate inline-block max-w-full"
                      >
                        {contact.domain}
                      </a>
                    </div>
                  )}
                  
                  {/* Contact Highlight Box */}
                  <div className="mt-4 mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2 text-sm">Primary Contact</h4>
                    
                    {/* Contact Name */}
                    {contact.name && (
                      <div className="font-medium text-gray-900 mb-1">{contact.name}</div>
                    )}
                    
                    {/* Contact Details */}
                    <div className="flex flex-col gap-1">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-sm text-indigo-700 hover:text-indigo-900 font-medium break-all">
                          {contact.email}
                        </a>
                      )}
                      
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-sm text-indigo-700 hover:text-indigo-900 font-medium">
                          {contact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Additional Business Details */}
                  <div className="space-y-2 text-sm mt-4">
                    {/* Add any additional business details here if needed */}
                    {contact.address && (
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-gray-900">{contact.address}</span>
                      </div>
                    )}
                    
                    {contact.industry && (
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-gray-900">{contact.industry}</span>
                      </div>
                    )}
                    
                    {contact.notes && (
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-gray-900">{contact.notes}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a 
                      href={`/email-campaign?domain=${contact.domain}`}
                      className="w-full block text-center py-2 px-4 bg-indigo-700 text-white font-medium rounded hover:bg-indigo-800 transition shadow-sm"
                    >
                      Generate Email
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
