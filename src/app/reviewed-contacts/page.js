'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MainNav from '../components/MainNav';

export default function ReviewedContactsPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [approvedContacts, setApprovedContacts] = useState([]);
  const [rejectedContacts, setRejectedContacts] = useState([]);
  const [pendingContacts, setPendingContacts] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('approved');
  
  useEffect(() => {
    loadScrapedContacts();
  }, []);
  
  const loadScrapedContacts = async () => {
    try {
      setLoading(true);
      
      // Load scraped contacts from localStorage
      const savedContacts = localStorage.getItem('scrapedContacts');
      if (!savedContacts) {
        setError('No scraped contacts found. Please scrape contacts first.');
        setLoading(false);
        return;
      }
      
      // Process the scraped contacts against screenshot decisions
      await processContacts(JSON.parse(savedContacts));
    } catch (err) {
      setError(err.message || 'Failed to load contacts');
      setLoading(false);
    }
  };
  
  const processContacts = async (contacts) => {
    try {
      setProcessing(true);
      
      const response = await fetch('/api/process-reviewed-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contacts }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process contacts');
      }
      
      const result = await response.json();
      
      // Load the processed contacts
      const [approved, rejected, pending] = await Promise.all([
        fetch('/approved-contacts.json').then(res => res.json()),
        fetch('/rejected-contacts.json').then(res => res.json()),
        fetch('/pending-contacts.json').then(res => res.json())
      ]);
      
      setApprovedContacts(approved.contacts || []);
      setRejectedContacts(rejected.contacts || []);
      setPendingContacts(pending.contacts || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to process contacts');
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };
  
  const exportApprovedContacts = () => {
    if (approvedContacts.length === 0) {
      alert('No approved contacts to export');
      return;
    }
    
    // Create a CSV of approved contacts
    const headers = ['Name', 'Email', 'Phone', 'Website', 'Address'];
    const csvContent = [
      headers.join(','),
      ...approvedContacts.map(contact => {
        return [
          contact.name || '',
          contact.email || '',
          contact.phone || '',
          contact.website || '',
          contact.address || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      })
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `approved-contacts-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const ContactsList = ({ contacts, type }) => {
    if (contacts.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No {type} contacts found</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contacts.map((contact, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">{contact.name || 'Unnamed Business'}</h3>
              <p className="text-sm text-gray-500 truncate">{contact.domain || contact.website || 'No website'}</p>
            </div>
            <div className="px-4 py-4">
              <div className="space-y-2">
                {contact.email && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-600">Email:</span>{' '}
                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>
                  </p>
                )}
                {contact.phone && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-600">Phone:</span>{' '}
                    <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">{contact.phone}</a>
                  </p>
                )}
                {contact.website && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-600">Website:</span>{' '}
                    <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                      {contact.website}
                    </a>
                  </p>
                )}
                {contact.address && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-600">Address:</span>{' '}
                    <span className="text-gray-700">{contact.address}</span>
                  </p>
                )}
              </div>
              
              {type === 'approved' && (
                <div className="mt-4 text-right">
                  <Link 
                    href={`/email-campaign?domain=${contact.domain || contact.website || ''}`}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Generate Email
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md py-4 px-8 mb-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 text-white p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Reviewed Contacts</h1>
          </div>
          <MainNav />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Contacts by Screenshot Review</h2>
              <p className="text-sm text-gray-500 mt-1">
                Contacts organized based on screenshot review decisions
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={loadScrapedContacts}
                disabled={loading || processing}
                className={`px-4 py-2 rounded-md ${
                  loading || processing
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {loading ? 'Loading...' : processing ? 'Processing...' : 'Refresh Contacts'}
              </button>
              
              {approvedContacts.length > 0 && (
                <button
                  onClick={exportApprovedContacts}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Export Approved
                </button>
              )}
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 text-red-600 border-b border-gray-200">
              {error}
            </div>
          )}
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'approved'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Approved ({approvedContacts.length})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'rejected'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Rejected ({rejectedContacts.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending Review ({pendingContacts.length})
              </button>
            </nav>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <>
                {activeTab === 'approved' && (
                  <div>
                    <ContactsList contacts={approvedContacts} type="approved" />
                  </div>
                )}
                
                {activeTab === 'rejected' && (
                  <div>
                    <ContactsList contacts={rejectedContacts} type="rejected" />
                  </div>
                )}
                
                {activeTab === 'pending' && (
                  <div>
                    <ContactsList contacts={pendingContacts} type="pending" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
