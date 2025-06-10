'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Hardcoded test websites as requested
const TEST_WEBSITES = [
  {
    businessName: "PAC Storage Installation",
    url: "https://pacstorageinstall.com",
    emails: ["contact@pacstorageinstall.com"], // Example email
    phones: ["(555) 123-4567"], // Example phone
    scrapedAt: new Date().toISOString()
  },
  {
    businessName: "Reactiv Labs",
    url: "https://reactivlabs.com",
    emails: ["info@reactivlabs.com"], // Example email
    phones: ["(555) 987-6543"], // Example phone
    scrapedAt: new Date().toISOString()
  }
];

const EmailCampaignPage = () => {
  const [websites, setWebsites] = useState(TEST_WEBSITES);
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [editableEmail, setEditableEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(
    `Write a compelling, personalized cold email offering {serviceName} for ${'{servicePrice}'}. The email should:

1. Include a personalized opening that shows you've researched their business
2. Mention a specific challenge or opportunity you've identified that your service can help with
3. Briefly explain your {serviceName} offering and why it's valuable for {businessName}
4. Include the price point (${'{servicePrice}'}) with a clear, non-pushy call to action
5. Close professionally

The email should be no more than 150 words, concise, conversational, and focused on value rather than features.
Sign the email as a representative of {companyName}.

DO NOT mention that you scraped their website or use language that sounds creepy or invasive.
Make it sound natural and compelling.`
  );
  const [serviceDetails, setServiceDetails] = useState({
    serviceName: "Digital Marketing Services",
    servicePrice: 189,
    companyName: "Your Marketing Agency"
  });
  const [error, setError] = useState(null);

  const generateEmail = async (website) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedEmail("");
    setEditableEmail("");
    setIsEditing(false);
    
    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: website.url,
          businessName: website.businessName,
          recipientEmail: website.emails[0],
          serviceName: serviceDetails.serviceName,
          servicePrice: serviceDetails.servicePrice,
          companyName: serviceDetails.companyName,
          customPrompt: customPrompt
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate email');
      }
      
      const data = await response.json();
      setGeneratedEmail(data.email);
      // Strip HTML tags for the editable version
      const strippedHtml = data.email
        .replace(/<div[^>]*>/g, '')
        .replace(/<\/div>/g, '')
        .replace(/<p[^>]*>/g, '')
        .replace(/<\/p>/g, '\n\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<[^>]*>/g, '')
        .trim();
      setEditableEmail(strippedHtml);
      setSelectedWebsite(website);
    } catch (error) {
      setError(error.message);
      console.error("Error generating email:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Toggle between view and edit modes
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };
  
  // Save edited email
  const saveEditedEmail = () => {
    // Convert the plain text back to HTML with paragraphs
    const formattedHtml = editableEmail
      .split('\n\n')
      .filter(para => para.trim() !== '')
      .map(para => `<p style="color: #000000; font-size: 1rem; margin-bottom: 1rem; line-height: 1.6;">${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');
    
    const wrappedHtml = `<div style="color: #000000; font-family: sans-serif;">${formattedHtml}</div>`;
    setGeneratedEmail(wrappedHtml);
    setIsEditing(false);
  };

  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setServiceDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md py-4 px-8 mb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 text-white p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Email Campaign Generator</h1>
            </div>
            <div className="flex space-x-4">
              <Link href="/domain-export" className="text-indigo-600 hover:text-indigo-800">
                Domain Export Tool
              </Link>
              <Link href="/screenshot-review" className="text-indigo-600 hover:text-indigo-800">
                Screenshot Review
              </Link>
              <Link href="/" className="text-indigo-600 hover:text-indigo-800">
                Back to Main
              </Link>
            </div>
          </div>
          <nav className="flex space-x-4">
            <Link href="/scraped-contacts" className="px-3 py-2 rounded-md text-gray-800 font-medium hover:bg-gray-100">
              Scraped Contacts
            </Link>
            <Link href="/" className="px-3 py-2 rounded-md text-gray-800 font-medium hover:bg-gray-100">
              Back to Search
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Service Configuration */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
              <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800">Service Details</h2>
                <button
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  {showPromptEditor ? 'Hide prompt editor' : 'Edit AI prompt'}
                </button>
              </div>
              <div className="p-6 space-y-4">
                {showPromptEditor && (
                  <div className="mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <label className="block text-sm font-medium text-gray-900 mb-2">Custom AI Prompt</label>
                    <p className="text-xs text-gray-700 mb-3">
                      Customize the instructions given to the AI. Use {'{businessName}'}, {'{serviceName}'}, {'{servicePrice}'}, and {'{companyName}'} as variables.
                    </p>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full h-48 p-3 border border-indigo-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      style={{ fontSize: '0.875rem', lineHeight: '1.5' }}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Service Name</label>
                  <input
                    type="text"
                    name="serviceName"
                    value={serviceDetails.serviceName}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Service Price ($)</label>
                  <input
                    type="number"
                    name="servicePrice"
                    value={serviceDetails.servicePrice}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Your Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={serviceDetails.companyName}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-800">Test Websites</h2>
              </div>
              <div className="p-6 space-y-4">
                {websites.map((website, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-800 mb-2">{website.businessName}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      <a href={website.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                        {website.url}
                      </a>
                    </p>
                    <button
                      onClick={() => generateEmail(website)}
                      disabled={isGenerating}
                      className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                    >
                      {isGenerating && selectedWebsite?.url === website.url ? 'Generating...' : 'Generate Email'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Generated Email */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-full">
              <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800">Generated Email</h2>
                <div className="flex space-x-3">
                  {generatedEmail && !isEditing && (
                    <>
                      <button
                        onClick={toggleEditMode}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Edit email
                      </button>
                      <button
                        onClick={() => {navigator.clipboard.writeText(isEditing ? editableEmail : generatedEmail)}}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Copy to clipboard
                      </button>
                    </>
                  )}
                  {generatedEmail && isEditing && (
                    <>
                      <button
                        onClick={saveEditedEmail}
                        className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                      >
                        Save changes
                      </button>
                      <button
                        onClick={toggleEditMode}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-6 h-full">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {isGenerating ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : generatedEmail && !isEditing ? (
                  <div className="prose max-w-none">
                    <div 
                      className="bg-white border border-gray-300 rounded-lg p-5 shadow-sm text-gray-900" 
                      dangerouslySetInnerHTML={{ 
                        __html: generatedEmail.replace(
                          /<p>/g, 
                          '<p style="color: #000; font-size: 1rem; margin-bottom: 1rem; line-height: 1.6;">'
                        ) 
                      }} 
                    />
                  </div>
                ) : generatedEmail && isEditing ? (
                  <div className="prose max-w-none">
                    <textarea
                      value={editableEmail}
                      onChange={(e) => setEditableEmail(e.target.value)}
                      className="w-full h-96 p-5 border border-gray-300 rounded-lg shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                      style={{ fontSize: '1rem', lineHeight: '1.6' }}
                    />
                    <div className="text-sm text-gray-500 mt-2">
                      <p>Use double line breaks to separate paragraphs. Edit the text as needed and click "Save changes" when finished.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p>Select a website and click "Generate Email" to create a personalized cold email.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmailCampaignPage;
