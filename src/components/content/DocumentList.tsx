import React, { useState, useEffect } from 'react';
import { 
  DocumentIcon, 
  TrashIcon, 
  EyeIcon,
  CalendarIcon,
  TagIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { contentAPI } from '../../services/api';

interface DocumentListProps {
  onDocumentUpdate: () => void;
}

interface Document {
  id: string;
  title: string;
  source: string;
  url?: string;
  publishedAt: Date;
  createdAt: Date;
  isEmbedded: boolean;
  vectorId?: string;
  content?: string; // For preview
}

const DocumentList: React.FC<DocumentListProps> = ({ onDocumentUpdate }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const data = await contentAPI.getDocuments();
      
      // Convert API response to our Document interface
      const documentsFromAPI = data.documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        source: doc.source,
        url: doc.url,
        publishedAt: new Date(doc.publishedAt),
        createdAt: new Date(doc.createdAt),
        isEmbedded: doc.isEmbedded,
        vectorId: doc.vectorId
      }));
      
      setDocuments(documentsFromAPI);
    } catch (error) {
      console.error('Error loading documents:', error);
      // Fallback to mock data if API fails
      const mockDocs: Document[] = [
        {
          id: '1',
          title: 'AI Breakthrough in Natural Language Processing',
          source: 'TechCrunch',
          url: 'https://techcrunch.com/ai-breakthrough',
          publishedAt: new Date('2024-01-15'),
          createdAt: new Date('2024-01-15'),
          isEmbedded: true,
          vectorId: 'vec_001'
        },
        {
          id: '2',
          title: 'Climate Change Impact on Technology',
          source: 'BBC Technology',
          publishedAt: new Date('2024-01-14'),
          createdAt: new Date('2024-01-14'),
          isEmbedded: false
        },
        {
          id: '3',
          title: 'Quantum Computing Advances',
          source: 'Wired',
          url: 'https://wired.com/quantum-computing',
          publishedAt: new Date('2024-01-13'),
          createdAt: new Date('2024-01-13'),
          isEmbedded: true,
          vectorId: 'vec_002'
        }
      ];
      setDocuments(mockDocs);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      await contentAPI.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      onDocumentUpdate();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
      setDeleteConfirm(null);
    }
  };

  const viewDocument = (doc: Document) => {
    setSelectedDoc(doc);
    setShowPreview(true);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'all' || doc.source === filterSource;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'embedded' && doc.isEmbedded) ||
                         (filterStatus === 'unembedded' && !doc.isEmbedded);
    
    return matchesSearch && matchesSource && matchesStatus;
  });

  const sources = Array.from(new Set(documents.map(d => d.source)));
  const embeddedCount = documents.filter(d => d.isEmbedded).length;
  const unembeddedCount = documents.filter(d => !d.isEmbedded).length;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex space-x-4">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Sources</option>
              {sources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="embedded">Embedded</option>
              <option value="unembedded">Pending</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-medium text-gray-600">Total</div>
            <div className="text-lg text-gray-900">{documents.length}</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-medium text-green-600">Embedded</div>
            <div className="text-lg text-green-900">{embeddedCount}</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="font-medium text-yellow-600">Pending</div>
            <div className="text-lg text-yellow-900">{unembeddedCount}</div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white shadow rounded-lg">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No documents found</h3>
            <p className="mt-2 text-gray-500">
              {searchTerm || filterSource !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload documents or scrape URLs to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <DocumentIcon className="h-6 w-6 text-gray-400 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {doc.title}
                      </h3>
                      
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <TagIcon className="h-4 w-4 mr-1" />
                          {doc.source}
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(doc.publishedAt)}
                        </div>
                      </div>

                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 text-sm text-primary-600 hover:text-primary-700 truncate block"
                        >
                          {doc.url}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-4">
                    {/* Status Badge */}
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${doc.isEmbedded 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                      }
                    `}>
                      {doc.isEmbedded ? 'Embedded' : 'Pending'}
                    </span>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => viewDocument(doc)}
                        className="text-gray-400 hover:text-primary-600"
                        title="View document"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(doc.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete document"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {showPreview && selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedDoc.title}
                </h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>{selectedDoc.source}</span>
                <span>•</span>
                <span>{formatDate(selectedDoc.publishedAt)}</span>
                <span>•</span>
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                  ${selectedDoc.isEmbedded 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                  }
                `}>
                  {selectedDoc.isEmbedded ? 'Embedded' : 'Pending Processing'}
                </span>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              <p className="text-gray-700 leading-relaxed">
                {selectedDoc.content || 'Content preview not available. This document has been processed and stored in the vector database for search queries.'}
              </p>
            </div>
            {selectedDoc.url && (
              <div className="p-6 border-t border-gray-200">
                <a
                  href={selectedDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  View Original Article
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDocument(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
