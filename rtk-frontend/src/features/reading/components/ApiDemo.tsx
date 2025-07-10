/**
 * API Demo Component
 *
 * Demonstrates RTK Query usage with the reading API
 * Shows loading states, error handling, and data fetching
 */

import { useGetInitialPassageQuery } from '../api/readingApi';

export function ApiDemo() {
  const { data, error, isLoading, refetch } = useGetInitialPassageQuery();

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-100 rounded">
        <p>Loading passage...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 rounded">
        <p className="text-red-700">Error loading passage</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-2">{data.passage.title}</h3>
      <p className="text-sm text-gray-600 mb-4">by {data.passage.author}</p>
      <p className="text-gray-800">{data.passage.content.substring(0, 200)}...</p>
      <div className="mt-4 text-sm text-gray-500">
        <span>Word count: {data.passage.wordCount}</span>
        <span className="mx-2">•</span>
        <span>Reading level: {data.passage.readingLevel}</span>
      </div>
      {data.question && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="font-medium">Question:</p>
          <p>{data.question}</p>
        </div>
      )}
    </div>
  );
}
