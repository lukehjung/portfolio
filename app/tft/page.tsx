'use client';

import React, { useEffect, useState } from 'react';

// You can define the shape of the data you expect from MetaTFT here
interface MetaTFTData {
  // Example fields - update these based on the actual API response
  meta: string;
  tierList: any[];
}

export default function TFTStatsPage() {
  const [data, setData] = useState<MetaTFTData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTFTData() {
      try {
        // Replace this URL with the specific MetaTFT API endpoint you want to use
        const response = await fetch('https://api.metatft.com/YOUR_ENDPOINT_HERE');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        setData(json);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An unexpected error occurred while fetching data.');
      } finally {
        setLoading(false);
      }
    }

    fetchTFTData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <main className="max-w-6xl mx-auto bg-white text-gray-900 shadow-xl rounded-2xl overflow-hidden border border-gray-200 p-6 sm:p-10">
        
        {/* Header */}
        <header className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
              TFT Meta Dashboard
            </h1>
            <p className="text-gray-500">Live data pulled from MetaTFT APIs.</p>
          </div>
          <a href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
            &larr; Back to Portfolio
          </a>
        </header>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <p className="text-red-700 font-medium">Error loading TFT data:</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {data && !loading && !error && (
            <div className="space-y-6">
              <p className="text-gray-700">Data successfully loaded! Replace this section with your custom formatting and charts.</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm shadow-inner max-h-[600px]">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}