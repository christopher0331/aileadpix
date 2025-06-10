'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ScreenshotReviewPage() {
  const [manifest, setManifest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState({});
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, reviewed: 0, rebuild: 0, skip: 0 });
  const [domainFiles, setDomainFiles] = useState([]);
  const [selectedDomainFile, setSelectedDomainFile] = useState('');
  const [processingScreenshots, setProcessingScreenshots] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Load available domain files
  useEffect(() => {
    async function loadDomainFiles() {
      try {
        const response = await fetch('/api/run-screenshots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ listOnly: true }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.files && Array.isArray(data.files)) {
            setDomainFiles(data.files);
            if (data.files.length > 0) {
              setSelectedDomainFile(data.files[0].name);
            }
          }
        }
      } catch (err) {
        console.error('Error loading domain files:', err);
      }
    }
    
    loadDomainFiles();
  }, []);
  
  // Load manifest on component mount
  useEffect(() => {
    async function loadManifest() {
      try {
        const response = await fetch('/manifest.json');
        if (!response.ok) {
          throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setManifest(data.filter(item => item.file)); // Only include items with screenshots
        setStats(prev => ({ ...prev, total: data.filter(item => item.file).length }));
        
        // Load saved decisions if they exist
        try {
          const savedResponse = await fetch('/api/screenshot-decisions');
          if (savedResponse.ok) {
            const savedData = await savedResponse.json();
            setDecisions(savedData.decisions || {});
            
            // Update stats based on loaded decisions
            const reviewedCount = Object.keys(savedData.decisions || {}).length;
            const rebuildCount = Object.values(savedData.decisions || {})
              .filter(decision => decision === true).length;
            
            setStats(prev => ({
              ...prev,
              reviewed: reviewedCount,
              rebuild: rebuildCount,
              skip: reviewedCount - rebuildCount
            }));
            
            // If there are saved decisions, start from the first unreviewed item
            const lastReviewedIndex = data.findIndex(item => 
              !savedData.decisions[item.domain] && item.file
            );
            
            if (lastReviewedIndex !== -1) {
              setIndex(Math.max(0, lastReviewedIndex));
            }
          }
        } catch (err) {
          console.warn("No saved decisions found, starting fresh");
        }
      } catch (err) {
        setError(`Error loading screenshots: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    
    loadManifest();
  }, []);

  // Key bindings: Left arrow = skip (false), Right arrow = rebuild (true)
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowRight') {
        markDecision(true);
      } else if (e.key === 'ArrowLeft') {
        markDecision(false);
      }
    },
    [index, manifest]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  async function markDecision(rebuild) {
    if (!manifest[index]) return;
    
    const { domain } = manifest[index];
    const newDecisions = {
      ...decisions,
      [domain]: rebuild
    };
    
    setDecisions(newDecisions);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + (decisions[domain] === undefined ? 1 : 0),
      rebuild: rebuild 
        ? prev.rebuild + (decisions[domain] === true ? 0 : decisions[domain] === false ? 1 : 1) 
        : prev.rebuild - (decisions[domain] === true ? 1 : 0),
      skip: !rebuild 
        ? prev.skip + (decisions[domain] === false ? 0 : decisions[domain] === true ? 1 : 1) 
        : prev.skip - (decisions[domain] === false ? 1 : 0)
    }));
    
    // Save to backend
    try {
      await fetch('/api/screenshot-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: newDecisions })
      });
    } catch (err) {
      console.error("Failed to save decision:", err);
      // Continue anyway - we have it in local state
    }
    
    // Advance to the next screenshot
    if (index < manifest.length - 1) {
      setIndex(index + 1);
    }
  }

  // Handle downloading decisions as JSON
  const handleDownload = () => {
    const dataStr = JSON.stringify(decisions, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportName = `screenshot-decisions-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
    linkElement.remove();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Loading Screenshots...</h1>
          <div className="animate-pulse h-4 w-32 bg-gray-200 rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-500">{error}</p>
          <p className="mt-4">
            Make sure you&apos;ve run the screenshot-batch.js script first to generate screenshots.
          </p>
          <div className="mt-6">
            <Link 
              href="/" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle running the screenshot batch script
  const runScreenshotBatch = async () => {
    setProcessingScreenshots(true);
    setProcessingMessage(`Starting screenshot generation for ${selectedDomainFile || 'most recent domain file'}...`);
    
    try {
      const response = await fetch('/api/run-screenshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainFile: selectedDomainFile }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProcessingMessage(data.message + ' Refresh this page after a few minutes to see the new screenshots.');
      } else {
        setProcessingMessage(`Error: ${data.error || 'Failed to start screenshot generation'}`);
      }
    } catch (err) {
      setProcessingMessage(`Error: ${err.message || 'Failed to communicate with the server'}`);
    } finally {
      // Keep the message visible but change the processing state
      setTimeout(() => {
        setProcessingScreenshots(false);
      }, 5000);
    }
  };
  
  if (manifest.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 max-w-2xl w-full">
          <h1 className="text-2xl font-bold mb-4">No Screenshots Available</h1>
          <p>No screenshots were found in the manifest file.</p>
          
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Generate Screenshots</h2>
            
            <div className="mb-4">
              <label htmlFor="domainFile" className="block text-sm font-medium text-gray-700 mb-1">
                Select Domain File:
              </label>
              <select 
                id="domainFile"
                value={selectedDomainFile}
                onChange={(e) => setSelectedDomainFile(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                disabled={processingScreenshots || domainFiles.length === 0}
              >
                {domainFiles.length === 0 ? (
                  <option value="">No domain files available</option>
                ) : (
                  domainFiles.map(file => (
                    <option key={file.name} value={file.name}>
                      {file.name} ({file.domainCount} domains)
                    </option>
                  ))
                )}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Choose a domain file to generate screenshots from
              </p>
            </div>
            
            <button
              onClick={runScreenshotBatch}
              disabled={processingScreenshots || !selectedDomainFile}
              className={`w-full py-2 px-4 rounded shadow-sm text-white font-medium 
                ${processingScreenshots || !selectedDomainFile 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'}
              `}
            >
              {processingScreenshots ? 'Processing...' : 'Generate Screenshots'}
            </button>
            
            {processingMessage && (
              <div className={`mt-4 p-3 rounded ${processingScreenshots ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                {processingMessage}
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <Link 
              href="/" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const current = manifest[index];
  
  // Calculate progress percentage
  const progressPercent = (index / manifest.length) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Screenshot Review</h1>
            <div className="flex space-x-2">
              <div className="relative">
                <select
                  value={selectedDomainFile}
                  onChange={(e) => setSelectedDomainFile(e.target.value)}
                  className="px-3 py-1 text-sm rounded border border-gray-300 bg-white pr-8 appearance-none"
                  disabled={processingScreenshots}
                >
                  {domainFiles.map(file => (
                    <option key={file.name} value={file.name}>{file.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              
              <button 
                onClick={runScreenshotBatch}
                disabled={processingScreenshots}
                className={`px-3 py-1 text-sm rounded text-white transition ${processingScreenshots ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {processingScreenshots ? 'Processing...' : 'Generate Screenshots'}
              </button>
              
              <Link href="/" className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50 transition">
                Home
              </Link>
              
              <button 
                onClick={handleDownload}
                className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Download Decisions
              </button>
            </div>
          </div>
          
          {processingMessage && processingScreenshots && (
            <div className="mt-2 p-2 text-sm bg-blue-50 text-blue-700 rounded">
              {processingMessage}
            </div>
          )}
        </div>
      </div>
      
      <header className="h-16"></header>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-1">
        <div 
          className="bg-blue-500 h-1" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
      
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">
            {current?.domain || 'No domain available'}
          </h2>
          <p className="text-gray-500">
            Use the arrow keys or buttons below to mark websites for rebuild or skip.
          </p>
        </div>
        
        <div className="border border-gray-300 rounded-lg overflow-hidden mx-auto max-w-4xl shadow-lg">
          {current?.file ? (
            <div className="relative">
              <Image
                src={`/${current.file}`}
                alt={`Screenshot of ${current.domain}`}
                width={1024}
                height={800}
                className="max-w-full h-auto"
                style={{ maxHeight: '70vh', objectFit: 'contain' }}
                priority
              />
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center bg-gray-100">
              <p className="text-gray-400">No screenshot available</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-center gap-8 mt-8">
          <button 
            onClick={() => markDecision(false)}
            className={`px-6 py-3 rounded-lg text-lg font-medium flex items-center gap-2 ${
              decisions[current?.domain] === false 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            <span>◀ Skip</span>
            <span className="text-sm opacity-75">(Left Arrow)</span>
          </button>
          
          <button 
            onClick={() => markDecision(true)}
            className={`px-6 py-3 rounded-lg text-lg font-medium flex items-center gap-2 ${
              decisions[current?.domain] === true 
                ? 'bg-green-700 text-white' 
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            <span>Rebuild ▶</span>
            <span className="text-sm opacity-75">(Right Arrow)</span>
          </button>
        </div>
      </main>
      
      <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
        <h3 className="font-bold text-sm mb-2 text-white">Progress</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-gray-200">Total:</span>
          <span className="font-medium text-white">{stats.total}</span>
          
          <span className="text-gray-200">Reviewed:</span>
          <span className="font-medium text-white">{stats.reviewed}</span>
          
          <span className="text-green-400 font-medium">Rebuild:</span>
          <span className="font-medium text-green-400">{stats.rebuild}</span>
          
          <span className="text-gray-200">Skip:</span>
          <span className="font-medium text-white">{stats.skip}</span>
        </div>
      </div>
    </div>
  );
}
