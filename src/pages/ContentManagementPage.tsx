import React, { useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import FileUpload from '../components/content/FileUpload';
import URLScraper from '../components/content/URLScraper';
import DocumentList from '../components/content/DocumentList';

const ContentManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'scrape' | 'list'>('upload');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleContentUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'upload', label: 'Upload Files', description: 'Upload documents, PDFs, and text files' },
    { id: 'scrape', label: 'Scrape URLs', description: 'Extract content from web pages and RSS feeds' },
    { id: 'list', label: 'Manage Content', description: 'View and manage all your content' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link
                to="/chat"
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
                <p className="text-gray-600">Manage your knowledge base content</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="mt-4 mb-6">
          <p className="text-gray-600">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'upload' && (
            <FileUpload onUploadComplete={handleContentUpdate} />
          )}
          
          {activeTab === 'scrape' && (
            <URLScraper onScrapeComplete={handleContentUpdate} />
          )}
          
          {activeTab === 'list' && (
            <DocumentList 
              key={refreshTrigger} 
              onDocumentUpdate={handleContentUpdate} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentManagementPage;
