'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import axios from 'axios';

export default function Home() {
  const [urls, setUrls] = useState<string[]>([]);
  const [pastedUrls, setPastedUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [backlinkUrl, setBacklinkUrl] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [error, setError] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
    },
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      Papa.parse(file, {
        complete: (results) => {
          const newUrls = results.data.flat().filter((url: any) => url && typeof url === 'string') as string[];
          const uniqueUrls = [...new Set<string>([...urls, ...newUrls])];
          setUrls(uniqueUrls);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          alert('Error parsing CSV file');
        },
      });
    },
  });

  const handlePastedUrls = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPastedUrls(e.target.value);
  };

  const handleAddPastedUrls = () => {
    const newUrls = pastedUrls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url);
    const uniqueUrls = [...new Set<string>([...urls, ...newUrls])];
    setUrls(uniqueUrls);
    setPastedUrls('');
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    setUrls((prev) => prev.filter((url) => url !== urlToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!companyName.trim()) {
      setError('Please enter your company name');
      return;
    }
    
    if (!backlinkUrl.trim()) {
      setError('Please enter your article URL');
      return;
    }

    if (!openaiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }
    
    // Validate URL format
    try {
      new URL(backlinkUrl);
    } catch {
      setError('Please enter a valid article URL');
      return;
    }
    
    if (urls.length === 0) {
      setError('Please add at least one URL to process');
      return;
    }

    setIsLoading(true);
    setError('');
    setResults([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      console.log('API URL:', apiUrl); // Debug log
      
      if (!apiUrl) {
        throw new Error('API URL is not configured');
      }

      const response = await axios.post(`${apiUrl}/scrape`, {
        urls,
        companyName: companyName.trim(),
        backlinkUrl: backlinkUrl.trim(),
        openaiKey: openaiKey.trim()
      });

      setResults(response.data);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.response?.data?.error || error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const csvData = results.map(result => {
      // Split the email into subject and body
      let emailSubject = '';
      let emailBody = '';
      
      if (result.outreach_email) {
        const emailParts = result.outreach_email.split('\n');
        // Extract subject line (removes "Subject: " prefix)
        emailSubject = emailParts[0].replace('Subject: ', '');
        // Get the rest of the email (skipping empty line after subject)
        emailBody = emailParts.slice(2).join('\n');
      }

      return {
        Website: result.url,
        'Business Name': result.business_name || '',
        'Emails': Array.isArray(result.emails) ? result.emails.join('; ') : result.emails || '',
        'Phone Numbers': Array.isArray(result.phones) ? result.phones.join('; ') : result.phones || '',
        'Social Media': Object.entries(result.social_links || {})
          .map(([platform, url]) => `${platform}: ${url}`)
          .join('; '),
        'Email Subject': emailSubject,
        'Email Body': emailBody,
        'Error': result.error || ''
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'scraping_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Web Scraper Dashboard</h1>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
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

      {/* Company and Backlink Configuration */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Campaign Configuration</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Your Company Name
            </label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your company name"
              required
            />
          </div>
          <div>
            <label htmlFor="backlinkUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Your Article URL
            </label>
            <input
              type="text"
              id="backlinkUrl"
              value={backlinkUrl}
              onChange={(e) => setBacklinkUrl(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the URL of the article you want to promote"
              required
            />
          </div>
          <div>
            <label htmlFor="openaiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Your OpenAI API Key
            </label>
            <input
              type="text"
              id="openaiKey"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your OpenAI API key"
              required
            />
          </div>
        </div>
      </div>

      {/* URL Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Paste URLs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Paste URLs</h2>
          <textarea
            className="w-full h-40 p-2 border rounded mb-4"
            placeholder="Paste URLs here (one per line)"
            value={pastedUrls}
            onChange={handlePastedUrls}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleAddPastedUrls}
          >
            Add URLs
          </button>
        </div>

        {/* Upload CSV */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Upload CSV</h2>
          <div
            {...getRootProps()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500"
          >
            <input {...getInputProps()} />
            <p>Drag & drop a CSV file here, or click to select one</p>
          </div>
        </div>
      </div>

      {/* URL List */}
      {urls.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">URLs to Process ({urls.length})</h2>
          <ul className="space-y-2">
            {urls.map((url, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="truncate flex-1">{url}</span>
                <button
                  onClick={() => handleRemoveUrl(url)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={handleSubmit}>
            <button
              className="mt-4 bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
              disabled={isLoading || urls.length === 0}
            >
              {isLoading ? 'Processing...' : 'Start Scraping'}
            </button>
          </form>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Results</h2>
            <button
              onClick={exportToCSV}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Export to CSV
            </button>
          </div>
          <div className="space-y-6">
            {results.map((result, index) => (
              <div key={index} className="border p-6 rounded">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{result.business_name || 'Unknown Business'}</h3>
                    <p className="text-sm text-gray-600 mb-2">{result.url}</p>
                    
                    {/* Contact Information */}
                    <div className="mt-4 space-y-2">
                      {result.emails && result.emails.length > 0 && (
                        <p><span className="font-medium">Emails:</span> {result.emails.join(', ')}</p>
                      )}
                      {result.phones && result.phones.length > 0 && (
                        <p><span className="font-medium">Phone Numbers:</span> {result.phones.join(', ')}</p>
                      )}
                      {result.error && (
                        <p className="text-red-500"><span className="font-medium">Error:</span> {result.error}</p>
                      )}
                    </div>

                    {/* Social Media Links */}
                    {result.social_links && Object.keys(result.social_links).length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Social Media:</h4>
                        <ul className="space-y-1">
                          {Object.entries(result.social_links).map(([platform, url]) => (
                            <li key={platform}>
                              <span className="capitalize">{platform}:</span>{' '}
                              <a href={url as string} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-500 hover:text-blue-700">
                                {url as string}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Generated Email */}
                  {result.outreach_email && (
                    <div>
                      <h4 className="font-medium mb-2">Generated Email:</h4>
                      <div className="bg-gray-50 p-4 rounded">
                        <pre className="whitespace-pre-wrap text-sm">
                          {result.outreach_email}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
