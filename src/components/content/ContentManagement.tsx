import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { chatAPI } from '../../services/api';
import FileUpload from './FileUpload';
import URLScraper from './URLScraper';
import DocumentList from './DocumentList';
import { 
  DocumentIcon, 
  LinkIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface ContentStats {
  total: number;
  embedded: number;
  unembedded: number;
  sources: Array<{
    source: string;
    count: number;
  }>;
}

const ContentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'scrape' | 'documents' | 'stats'>('upload');
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const statsData = await chatAPI.getNewsStats();
      setStats(statsData);
    } catch (error: any) {
      setError('Failed to load content statistics');
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentUpdate = () => {
    loadStats(); // Refresh stats when content is updated
  };

  const processUnembeddedContent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await chatAPI.processEmbeddings();
      await loadStats(); // Refresh stats
      alert(`Successfully processed ${result.processed} documents. ${result.failed} failed.`);
    } catch (error: any) {
      setError('Failed to process embeddings');
      console.error('Error processing embeddings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'upload', label: 'Upload Files', icon: DocumentIcon },
    { id: 'scrape', label: 'Scrape URLs', icon: LinkIcon },
    { id: 'documents', label: 'My Documents', icon: DocumentIcon },
    { id: 'stats', label: 'Statistics', icon: ChartBarIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Upload documents, scrape websites, and manage your knowledge base
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">Welcome, {user?.name || user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`
                    mr-2 h-5 w-5
                    ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <FileUpload onUploadComplete={handleContentUpdate} />
        )}

        {activeTab === 'scrape' && (
          <URLScraper onScrapeComplete={handleContentUpdate} />
        )}

        {activeTab === 'documents' && (
          <DocumentList onDocumentUpdate={handleContentUpdate} />
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Documents
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.total || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Embedded
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.embedded || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Pending Processing
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.unembedded || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Process Unembedded Button */}
            {stats && stats.unembedded > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">
                      Documents awaiting processing
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      {stats.unembedded} documents need to be processed for vector search.
                    </p>
                  </div>
                  <button
                    onClick={processUnembeddedContent}
                    disabled={isLoading}
                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Process Now'}
                  </button>
                </div>
              </div>
            )}

            {/* Sources Breakdown */}
            {stats && stats.sources && stats.sources.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Content Sources
                  </h3>
                  <div className="mt-4">
                    <div className="space-y-3">
                      {stats.sources.map((source, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{source.source}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {source.count}
                            </span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full"
                                style={{
                                  width: `${(source.count / (stats.total || 1)) * 100}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentManagement;
