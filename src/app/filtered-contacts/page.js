'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const FilteredContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved contacts from localStorage
    const savedContacts = localStorage.getItem('filteredContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
    setIsLoading(false);
  }, []);

  const removeContact = (index) => {
    const updatedContacts = [...contacts];
    updatedContacts.splice(index, 1);
    setContacts(updatedContacts);
    localStorage.setItem('filteredContacts', JSON.stringify(updatedContacts));
  };

  const clearAllContacts = () => {
    if (confirm('Are you sure you want to clear all contacts?')) {
      setContacts([]);
      localStorage.removeItem('filteredContacts');
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Filtered Contacts</h1>
          </div>
          <Navbar
            links={[
              { href: '/scraped-contacts', label: 'Scraped Contacts' },
              { href: '/email-campaign', label: 'Email Campaign' },
              { href: '/', label: 'Back to Search' },
            ]}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Filtered Business Contacts</h2>
              <p className="text-sm text-gray-500 mt-1">Businesses that match your target criteria</p>
            </div>
            {contacts.length > 0 && (
              <button
                onClick={clearAllContacts}
                className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100"
              >
                Clear All
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No filtered contacts yet</h3>
              <p className="mt-1 text-sm text-gray-500">Search for businesses and add them to your filtered contacts list.</p>
              <div className="mt-6">
                <Link 
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Go to Search
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {contacts.map((contact, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {contact.title}
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {contact.businessType}
                      </span>
                    </h3>
                    <button
                      onClick={() => removeContact(index)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Remove contact"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-600 mb-2">{contact.snippet}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <a 
                      href={contact.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Visit Website
                    </a>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500 text-xs">{contact.link.split('/')[2]}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500 text-xs">Confidence: {contact.confidence}%</span>
                  </div>
                  {contact.reasoning && (
                    <div className="mt-3 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                      <strong>Analysis:</strong> {contact.reasoning}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Email Finder Tool. Analysis powered by OpenAI.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FilteredContactsPage;
