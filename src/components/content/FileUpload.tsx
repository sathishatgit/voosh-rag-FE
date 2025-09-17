import React, { useState, useRef } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  XMarkIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { contentAPI } from '../../services/api';

interface FileUploadProps {
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.md',
    '.html',
    '.htm'
  ];

  const handleFileSelect = (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const newFiles: UploadFile[] = fileArray.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    // Process files one at a time to avoid overwhelming the server
    for (const uploadFile of pendingFiles) {
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        ));

        // Upload file using real API
        const result = await contentAPI.uploadFile(uploadFile.file, {
          uploadedAt: new Date().toISOString(),
          originalName: uploadFile.file.name,
          size: uploadFile.file.size
        });

        // Update status to success
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'success', progress: 100 }
            : f
        ));

        console.log('Upload successful:', result);

        // Add a delay between uploads to avoid overwhelming the server
        if (pendingFiles.indexOf(uploadFile) < pendingFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: any) {
        // Update status to error
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error', error: error.message || 'Upload failed' }
            : f
        ));
        console.error('Upload failed:', error);
      }
    }

    // Call onUploadComplete when all uploads are done
    onUploadComplete();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'txt':
      case 'md':
        return '📄';
      case 'html':
      case 'htm':
        return '🌐';
      default:
        return '📄';
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Documents</h3>
        
        {/* Drag & Drop Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragOver 
              ? 'border-primary-400 bg-primary-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-lg font-medium text-gray-900">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports: {acceptedTypes.join(', ')}
            </p>
          </div>
          
          <div className="mt-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <DocumentIcon className="mr-2 h-4 w-4" />
              Choose Files
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Files ({files.length})
              {files.some(f => f.status === 'uploading') && (
                <span className="ml-2 text-sm text-blue-600 font-normal">
                  - Processing {files.find(f => f.status === 'uploading')?.file.name}...
                </span>
              )}
            </h3>
            {pendingCount > 0 && (
              <button
                onClick={uploadFiles}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Upload {pendingCount} File{pendingCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          {/* Upload Summary */}
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

          {/* File Items */}
          <div className="space-y-3">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-2xl">{getFileIcon(uploadFile.file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Status */}
                  <div className="flex items-center space-x-2">
                    {uploadFile.status === 'pending' && (
                      <span className="text-xs text-gray-500">Ready</span>
                    )}
                    {uploadFile.status === 'uploading' && (
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {uploadFile.progress}%
                        </span>
                      </div>
                    )}
                    {uploadFile.status === 'success' && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )}
                    {uploadFile.status === 'error' && (
                      <div className="text-xs text-red-500">
                        {uploadFile.error}
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Supported File Types
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>PDF:</strong> Portable Document Format files</li>
          <li>• <strong>Word:</strong> .doc and .docx files</li>
          <li>• <strong>Text:</strong> Plain text and Markdown files</li>
          <li>• <strong>Web:</strong> HTML files</li>
        </ul>
        <p className="text-xs text-blue-600 mt-3">
          Files are processed one at a time to ensure quality and avoid overwhelming the server. 
          Content will be split into chunks for optimal vector search performance.
        </p>
      </div>
    </div>
  );
};

export default FileUpload;
