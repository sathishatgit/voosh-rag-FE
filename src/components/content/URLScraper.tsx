import React, { useState } from 'react';
import { chatAPI, contentAPI } from '../../services/api';
import { 
  LinkIcon, 
  PlusIcon, 
  TrashIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

interface URLScrapeProps {
  onScrapeComplete: () => void;
}

interface ScrapeJob {
  id: string;
  url: string;
  sourceName: string;
  status: 'pending' | 'scraping' | 'success' | 'error';
  result?: {
    success: number;
    failed: number;
    errors: string[];
  } | {
    documentIds: string[];
    chunkCount: number;
    sourceType: string;
    message: string;
    metadata?: any;
  };
  error?: string;
}

const URLScraper: React.FC<URLScrapeProps> = ({ onScrapeComplete }) => {
  const [urls, setUrls] = useState<ScrapeJob[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [pendingBatch, setPendingBatch] = useState<any[]>([]);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [currentBatchInfo, setCurrentBatchInfo] = useState<{
    processed: number;
    total: number;
    remaining: any[];
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    articles?: Array<{
      title: string;
      link: string;
      description: string;
      pubDate: string;
      source: string;
      selected: boolean;
    }>;
    links?: Array<{ title: string; url: string; description: string; selected: boolean }>;
    url?: string;
    type: 'rss' | 'url';
  } | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const addUrl = () => {
    const trimmedUrl = newUrl.trim();
    const trimmedSource = sourceName.trim();
    
    if (!trimmedUrl || !trimmedSource) return;
    
    if (!validateUrl(trimmedUrl)) {
      setIsValidUrl(false);
      return;
    }

    const newJob: ScrapeJob = {
      id: Math.random().toString(36).substr(2, 9),
      url: trimmedUrl,
      sourceName: trimmedSource,
      status: 'pending'
    };

    setUrls(prev => [...prev, newJob]);
    setNewUrl('');
    setSourceName('');
    setIsValidUrl(true);
  };

  const removeUrl = (id: string) => {
    setUrls(prev => prev.filter(u => u.id !== id));
  };

  const scrapeUrl = async (job: ScrapeJob, skipPreview: boolean = false) => {
    try {
      // Update status to scraping
      setUrls(prev => prev.map(u => 
        u.id === job.id 
          ? { ...u, status: 'scraping' }
          : u
      ));

      // Check if URL looks like an RSS feed
      const isRSSFeed = job.url.includes('/rss') || job.url.includes('/feed') || 
                       job.url.endsWith('.xml') || job.url.includes('rss') ||
                       job.url.includes('feeds');

      if (!skipPreview) {
        // First, get preview
        if (isRSSFeed) {
          const preview = await chatAPI.previewRSS({
            rssUrl: job.url,
            sourceName: job.sourceName || 'RSS Feed'
          });
          
          setPreviewData({
            articles: preview.articles,
            type: 'rss',
            url: job.url
          });
          setShowPreview(true);
          
          // Reset status back to pending
          setUrls(prev => prev.map(u => 
            u.id === job.id 
              ? { ...u, status: 'pending' }
              : u
          ));
          return;
        } else {
          const preview = await contentAPI.previewUrl(job.url);
          
          setPreviewData({
            links: preview.links.map(link => ({ ...link, selected: false })),
            type: 'url',
            url: job.url
          });
          setShowPreview(true);
          
          // Reset status back to pending
          setUrls(prev => prev.map(u => 
            u.id === job.id 
              ? { ...u, status: 'pending' }
              : u
          ));
          return;
        }
      }

      // If skipPreview is true, process directly
      let result: {
        success: number;
        failed: number;
        errors: string[];
      } | {
        documentIds: string[];
        chunkCount: number;
        sourceType: string;
        message: string;
        metadata?: any;
      };

      if (isRSSFeed) {
        // Use RSS ingestion endpoint
        result = await chatAPI.ingestRSS({
          rssUrl: job.url,
          sourceName: job.sourceName || 'RSS Feed'
        });
      } else {
        // Use URL ingestion endpoint for regular web pages
        result = await contentAPI.ingestFromUrl(job.url, {
          sourceName: job.sourceName || 'Web Page',
          scrapedAt: new Date().toISOString()
        });
      }

      // Update status to success
      setUrls(prev => prev.map(u => 
        u.id === job.id 
          ? { ...u, status: 'success', result }
          : u
      ));

      onScrapeComplete();

    } catch (error: any) {
      // Update status to error
      setUrls(prev => prev.map(u => 
        u.id === job.id 
          ? { ...u, status: 'error', error: error.message || 'Scraping failed' }
          : u
      ));
    }
  };

  const scrapeAllPending = async () => {
    const pendingJobs = urls.filter(u => u.status === 'pending');
    
    for (const job of pendingJobs) {
      await scrapeUrl(job, true); // Skip preview for batch processing
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const processSelectedArticles = async (selectedArticles: any[]) => {
    try {
      const result = await chatAPI.ingestSelected(selectedArticles);
      
      // Update the URL status
      const currentJob = urls.find(u => u.status === 'pending');
      if (currentJob) {
        setUrls(prev => prev.map(u => 
          u.id === currentJob.id 
            ? { ...u, status: 'success', result }
            : u
        ));
      }
      
      onScrapeComplete();
    } catch (error: any) {
      console.error('Error processing selected articles:', error);
      // Update status to error
      const currentJob = urls.find(u => u.status === 'pending');
      if (currentJob) {
        setUrls(prev => prev.map(u => 
          u.id === currentJob.id 
            ? { ...u, status: 'error', error: error.message || 'Processing failed' }
            : u
        ));
      }
    }
  };

  const processSelectedUrls = async (selectedLinks: any[]) => {
    try {
      // Process each selected URL
      let successCount = 0;
      let failCount = 0;
      
      for (const link of selectedLinks) {
        try {
          await contentAPI.ingestFromUrl(link.url, {
            sourceName: link.title,
            scrapedAt: new Date().toISOString()
          });
          successCount++;
        } catch (error) {
          failCount++;
        }
      }
      
      const result = {
        documentIds: [],
        chunkCount: successCount,
        sourceType: 'url_batch',
        message: `Processed ${successCount} URLs, ${failCount} failed`
      };
      
      // Update the URL status
      const currentJob = urls.find(u => u.status === 'pending');
      if (currentJob) {
        setUrls(prev => prev.map(u => 
          u.id === currentJob.id 
            ? { ...u, status: 'success', result }
            : u
        ));
      }
      
      onScrapeComplete();
    } catch (error: any) {
      console.error('Error processing selected URLs:', error);
      // Update status to error
      const currentJob = urls.find(u => u.status === 'pending');
      if (currentJob) {
        setUrls(prev => prev.map(u => 
          u.id === currentJob.id 
            ? { ...u, status: 'error', error: error.message || 'Processing failed' }
            : u
        ));
      }
    }
  };

  const handleUrlChange = (value: string) => {
    setNewUrl(value);
    if (!isValidUrl && value.trim()) {
      setIsValidUrl(validateUrl(value.trim()));
    }
  };

  const getStatusIcon = (status: ScrapeJob['status']) => {
    switch (status) {
      case 'pending':
        return <LinkIcon className="h-5 w-5 text-gray-400" />;
      case 'scraping':
        return (
          <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
        );
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const pendingCount = urls.filter(u => u.status === 'pending').length;
  const successCount = urls.filter(u => u.status === 'success').length;
  const errorCount = urls.filter(u => u.status === 'error').length;

  const commonSources = [
    { name: 'BBC News Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' }
  ];

  return (
    <div className="space-y-6">
      {/* Add URL Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add URLs to Scrape</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              URL or RSS Feed
            </label>
            <div className="mt-1">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com or https://example.com/feed.xml"
                className={`
                  block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500
                  ${!isValidUrl ? 'border-red-300' : 'border-gray-300'}
                `}
              />
              {!isValidUrl && (
                <p className="mt-1 text-sm text-red-600">Please enter a valid URL</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Source Name
            </label>
            <div className="mt-1">
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g., Tech News, Company Blog"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <button
            onClick={addUrl}
            disabled={!newUrl.trim() || !sourceName.trim() || !isValidUrl}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add URL
          </button>
        </div>
      </div>

      {/* Common RSS Feeds */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Popular News Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {commonSources.map((source, index) => (
            <button
              key={index}
              onClick={() => {
                setNewUrl(source.url);
                setSourceName(source.name);
                setIsValidUrl(true);
              }}
              className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <div className="flex items-center space-x-3">
                <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{source.name}</p>
                  <p className="text-xs text-gray-500 truncate">{source.url}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* URL List */}
      {urls.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              URLs to Scrape ({urls.length})
              {urls.some(u => u.status === 'scraping') && (
                <span className="ml-2 text-sm text-blue-600 font-normal">
                  - Processing {urls.find(u => u.status === 'scraping')?.sourceName}...
                </span>
              )}
            </h3>
            {pendingCount > 0 && (
              <button
                onClick={scrapeAllPending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Scrape All ({pendingCount})
              </button>
            )}
          </div>

          {/* Scrape Summary */}
          <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-600">Pending</div>
              <div className="text-lg text-gray-900">{pendingCount}</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="font-medium text-green-600">Successful</div>
              <div className="text-lg text-green-900">{successCount}</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="font-medium text-red-600">Failed</div>
              <div className="text-lg text-red-900">{errorCount}</div>
            </div>
          </div>

          {/* URL Items */}
          <div className="space-y-3">
            {urls.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(job.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {job.sourceName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {job.url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Status Details */}
                  <div className="text-right">
                    {job.status === 'success' && job.result && (
                      <div className="text-xs text-green-600">
                        {'success' in job.result 
                          ? `${job.result.success} articles scraped${job.result.failed > 0 ? `, ${job.result.failed} failed` : ''}`
                          : `${job.result.chunkCount} chunks created`
                        }
                      </div>
                    )}
                    {job.status === 'error' && (
                      <div className="text-xs text-red-600">
                        {job.error}
                      </div>
                    )}
                    {job.status === 'scraping' && (
                      <div className="text-xs text-primary-600">
                        Scraping...
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {job.status === 'pending' && (
                      <button
                        onClick={() => scrapeUrl(job)}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Scrape
                      </button>
                    )}
                    <button
                      onClick={() => removeUrl(job.id)}
                      disabled={job.status === 'scraping'}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          How URL Scraping Works
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>RSS Feeds:</strong> Automatically extracts articles from RSS/Atom feeds</li>
          <li>• <strong>Web Pages:</strong> Scrapes content from individual web pages</li>
          <li>• <strong>Content Processing:</strong> Text is cleaned and split into chunks</li>
          <li>• <strong>Vector Embedding:</strong> Content is converted to embeddings for search</li>
        </ul>
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-700">
            ⚠️ <strong>Processing Limit:</strong> URLs are processed one at a time. 
            RSS feeds may contain many articles - we process them in batches to manage server load.
          </p>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Scraped content will be available for AI chat queries once processing is complete.
        </p>
      </div>

      {/* Content Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {previewData.type === 'rss' ? 'RSS Feed Preview' : 'URL Content Preview'}
                </h2>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {previewData.type === 'rss' 
                  ? `Found ${previewData.articles?.length} articles. Select which ones to process:`
                  : `Found ${previewData.links?.length} links. Select which ones to scrape:`
                }
              </p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => {
                    if (previewData.type === 'rss') {
                      setPreviewData(prev => ({
                        ...prev!,
                        articles: prev!.articles!.map(a => ({ ...a, selected: true }))
                      }));
                    } else {
                      setPreviewData(prev => ({
                        ...prev!,
                        links: prev!.links!.map(l => ({ ...l, selected: true }))
                      }));
                    }
                  }}
                  className="text-xs px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    if (previewData.type === 'rss') {
                      setPreviewData(prev => ({
                        ...prev!,
                        articles: prev!.articles!.map(a => ({ ...a, selected: false }))
                      }));
                    } else {
                      setPreviewData(prev => ({
                        ...prev!,
                        links: prev!.links!.map(l => ({ ...l, selected: false }))
                      }));
                    }
                  }}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Select None
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              {previewData.type === 'rss' && previewData.articles && (
                <div className="space-y-3">
                  {previewData.articles.map((article, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={article.selected}
                          onChange={(e) => {
                            setPreviewData(prev => ({
                              ...prev!,
                              articles: prev!.articles!.map((a, i) => 
                                i === index ? { ...a, selected: e.target.checked } : a
                              )
                            }));
                          }}
                          className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{article.title}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {article.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(article.pubDate).toLocaleDateString()}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              {previewData.type === 'url' && previewData.links && (
                <div className="space-y-3">
                  {previewData.links.map((link, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={link.selected}
                          onChange={(e) => {
                            setPreviewData(prev => ({
                              ...prev!,
                              links: prev!.links!.map((l, i) => 
                                i === index ? { ...l, selected: e.target.checked } : l
                              )
                            }));
                          }}
                          className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{link.title}</h4>
                          <p className="text-sm text-blue-600 mt-1 truncate">{link.url}</p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {link.description}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {previewData.type === 'rss' 
                    ? `${previewData.articles?.filter(a => a.selected).length || 0} of ${previewData.articles?.length || 0} articles selected`
                    : `${previewData.links?.filter(l => l.selected).length || 0} of ${previewData.links?.length || 0} links selected`
                  }
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setPreviewData(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (previewData.type === 'rss') {
                        // Process selected RSS articles
                        const selected = previewData.articles?.filter(a => a.selected) || [];
                        if (selected.length > 0) {
                          processSelectedArticles(selected);
                        }
                      } else {
                        // Process selected URLs
                        const selected = previewData.links?.filter(l => l.selected) || [];
                        if (selected.length > 0) {
                          processSelectedUrls(selected);
                        }
                      }
                      setShowPreview(false);
                      setPreviewData(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                    disabled={
                      previewData.type === 'rss' 
                        ? !previewData.articles?.some(a => a.selected)
                        : !previewData.links?.some(l => l.selected)
                    }
                  >
                    Process Selected ({
                      previewData.type === 'rss' 
                        ? previewData.articles?.filter(a => a.selected).length || 0
                        : previewData.links?.filter(l => l.selected).length || 0
                    })
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Confirmation Modal */}
      {showBatchConfirm && currentBatchInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Large Dataset Detected
            </h3>
            <p className="text-gray-600 mb-4">
              We've processed the first {currentBatchInfo.processed} articles. 
              There may be {currentBatchInfo.total - currentBatchInfo.processed} more articles available.
            </p>
            <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded mb-4">
              ⚠️ Processing all articles may take significant time and storage. 
              We recommend processing in smaller batches.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBatchConfirm(false);
                  setCurrentBatchInfo(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Stop Here
              </button>
              <button
                onClick={() => {
                  setShowBatchConfirm(false);
                  setBatchProcessing(true);
                  // Process remaining articles
                  // This would need backend support for pagination
                  setCurrentBatchInfo(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md"
              >
                Continue Processing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default URLScraper;
