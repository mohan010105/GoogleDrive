import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import ErrorBoundary from './ErrorBoundary';
import { FileData, FileVersion } from '../types';
import { api } from '../services/supabaseService';
import { Download, Share2, Clock, FileText, RotateCcw, Info, ExternalLink, Eye, Code, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface FilePreviewModalProps {
  file: FileData;
  onClose: () => void;
  onShare: (file: FileData) => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, onShare }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [fileAccess, setFileAccess] = useState<{accessUrl: string, fileName: string, mimeType: string} | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewStrategy, setPreviewStrategy] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const isTextFile = (file: FileData) => {
    const textMimes = ['text/plain', 'application/json', 'application/javascript', 'text/html', 'text/css', 'text/csv', 'text/markdown'];
    const textExts = ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.xml', '.svg', '.log', '.csv'];
    
    if (file.mime_type && textMimes.some(m => file.mime_type.startsWith('text/') || file.mime_type === m)) return true;
    if (textExts.some(ext => file.name.toLowerCase().endsWith(ext))) return true;
    return false;
  };

  useEffect(() => {
    if (activeTab === 'history') {
      setLoadingVersions(true);
      api.getFileVersions(file.id)
        .then(setVersions)
        .finally(() => setLoadingVersions(false));
    }
  }, [activeTab, file.id]);

  useEffect(() => {
    const loadFileAccess = async () => {
      setLoadingPreview(true);
      setPreviewError(null);
      try {
        const stored = localStorage.getItem('cloud_drive_current_user');
        const requesterId = stored ? (() => { try { return JSON.parse(stored).id; } catch { return undefined; } })() : undefined;

        const access = await api.getFileAccess(file.id, requesterId);
        setFileAccess(access);

        // Determine preview strategy
        if (file.mime_type?.startsWith('image/')) {
          setPreviewStrategy('image');
        } else if (file.mime_type === 'application/pdf') {
          setPreviewStrategy('pdf');
        } else if (file.mime_type?.startsWith('video/')) {
          setPreviewStrategy('video');
        } else if (file.mime_type?.startsWith('audio/')) {
          setPreviewStrategy('audio');
        } else if (isTextFile(file)) {
          setPreviewStrategy('text');
        } else {
          setPreviewStrategy(null);
        }
      } catch (err) {
        console.error('Failed to get file access:', err);
        setPreviewError('Failed to load file preview');
        setPreviewStrategy(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    loadFileAccess();
  }, [file.id, file.mime_type]);

  useEffect(() => {
    // Load text content for text files
    const url = fileAccess?.accessUrl;
    if (isTextFile(file) && url) {
      // Handle data: URLs locally without fetch
      if (url.startsWith('data:')) {
        try {
          const parts = url.split(',');
          const meta = parts[0];
          const data = parts.slice(1).join(',');
          let decoded = '';
          if (meta.includes('base64')) {
            decoded = atob(data);
          } else {
            decoded = decodeURIComponent(data);
          }
          setTextContent(decoded);
          return;
        } catch (e) {
          console.warn('Failed to decode data URL', e);
        }
      }

      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.text();
        })
        .then(text => setTextContent(text))
        .catch(async (err) => {
          console.warn('Text preview fetch failed, attempting fallback download URL', err);
          try {
            const dl = await api.getDownloadUrl(file.id);
            if (dl && dl !== url) {
              // handle data URL fallback
              if (dl.startsWith('data:')) {
                const parts = dl.split(',');
                const meta = parts[0];
                const data = parts.slice(1).join(',');
                let decoded = '';
                if (meta.includes('base64')) decoded = atob(data);
                else decoded = decodeURIComponent(data);
                setTextContent(decoded);
                return;
              }

              const r2 = await fetch(dl);
              if (r2.ok) {
                const text2 = await r2.text();
                setTextContent(text2);
                return;
              }
            }
          } catch (e) {
            console.error('Fallback download fetch also failed', e);
          }
          setTextContent("Error loading text content. Please download to view.");
        });
    } else {
      setTextContent(null);
    }
  }, [file, fileAccess]);



  const handleRevert = async (v: FileVersion) => {
    if (confirm(`Revert to Version ${v.version_number}? This creates a new current version.`)) {
      await api.revertFileVersion(file.id, v.id);
      api.getFileVersions(file.id).then(setVersions);
    }
  };

  const handleOpen = () => {
    if (fileAccess?.accessUrl) {
      window.open(fileAccess.accessUrl, '_blank');
    } else {
      alert('File preview not available. Please try downloading the file instead.');
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return; // Prevent multiple simultaneous downloads

    const stored = localStorage.getItem('cloud_drive_current_user');
    const requesterId = stored ? (() => { try { return JSON.parse(stored).id; } catch { return undefined; } })() : undefined;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      console.log('Starting download for file:', file.id);

      // Use the unified file access function
      const access = await api.getFileAccess(file.id, requesterId);

      if (!access.accessUrl) {
        throw new Error('No access URL available for this file.');
      }

      console.log('Got access URL, triggering download:', access.fileName);

      // Trigger browser download using standard anchor method
      const link = document.createElement('a');
      link.href = access.accessUrl;
      link.download = access.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('Download triggered successfully');

    } catch (err) {
      console.error('Download failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to download file. Please try again.';
      setDownloadError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ErrorBoundary>
      <Modal
        isOpen={!!file}
        onClose={onClose}
        title={file.name}
        maxWidth="max-w-5xl"
      >
      <div className="flex border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Info size={18} /> Preview & Details
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock size={18} /> Version History
          </div>
        </button>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'details' && (
          <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-200 h-full">
            {/* Left: Preview Area */}
            <div className="flex-1 lg:flex-[2] flex flex-col gap-4">
                <div className="flex-1 min-h-[300px] max-h-[68vh] bg-gray-100/50 rounded-xl flex items-center justify-center border border-gray-200 relative group shadow-inner">
                  {loadingPreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">Loading preview...</div>
                  )}
                  {previewError ? (
                    <div className="flex flex-col items-center gap-3 text-gray-400 p-8 text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                        <AlertCircle size={32} className="text-red-500" />
                      </div>
                      <h4 className="text-gray-900 font-semibold">Preview Error</h4>
                      <p className="text-sm max-w-xs text-red-600">{previewError}</p>
                      <button
                        onClick={handleDownload}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <Download size={14} /> Download File
                      </button>
                    </div>
                  ) : previewStrategy === 'image' ? (
                    <div className="w-full h-full p-2 flex items-center justify-center">
                      <img
                        src={fileAccess.accessUrl}
                        alt={file.name}
                        className="max-w-full max-h-full object-contain"
                        onError={() => setPreviewError('Failed to load image')}
                      />
                    </div>
                  ) : previewStrategy === 'pdf' ? (
                    <div className="w-full h-full">
                      <iframe
                        src={fileAccess.accessUrl}
                        className="w-full h-full border-none"
                        title={`PDF Preview: ${file.name}`}
                        onError={() => setPreviewError('Failed to load PDF preview')}
                      />
                    </div>
                  ) : previewStrategy === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <video
                        controls
                        src={fileAccess.accessUrl}
                        className="max-w-full max-h-full"
                        onError={() => setPreviewError('Failed to load video')}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : previewStrategy === 'audio' ? (
                    <div className="w-full p-8 flex items-center justify-center">
                      <audio
                        controls
                        src={fileAccess.accessUrl}
                        className="w-full max-w-md"
                        onError={() => setPreviewError('Failed to load audio')}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  ) : previewStrategy === 'text' ? (
                    <div className="w-full h-full bg-white overflow-auto border-none text-left shadow-sm relative">
                      <div className="sticky top-0 left-0 right-0 bg-gray-50 border-b border-gray-100 px-4 py-2 text-xs text-gray-500 font-mono flex items-center gap-2 z-10">
                        <Code size={12} /> Text Preview
                      </div>
                      <pre className="p-4 text-sm font-mono text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                        {textContent || 'Loading content...'}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-gray-400 p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                        <FileText size={32} />
                      </div>
                      <h4 className="text-gray-900 font-semibold">Preview not available for this file type</h4>
                      <p className="text-sm max-w-xs">This file type cannot be previewed in the browser.</p>
                      <button
                        onClick={handleDownload}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>
                  )}
                </div>
            </div>

            {/* Right: Sidebar Metadata */}
            <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-6 border-l border-gray-100 pl-6">
                <div>
                   <h3 className="text-sm font-bold text-gray-900 mb-4">File Information</h3>
                   <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Type</span>
                          <span className="text-sm font-medium text-gray-700 break-words">{file.mime_type || 'Unknown'}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Size</span>
                          <span className="text-sm font-medium text-gray-700">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Version</span>
                          <span className="text-sm font-medium text-gray-700">v{file.current_version}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Last Modified</span>
                          <span className="text-sm font-medium text-gray-700">{new Date(file.updated_at).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Created</span>
                          <span className="text-sm font-medium text-gray-700">{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                   </div>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  <button
                    onClick={() => { onClose(); onShare(file); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-md shadow-blue-200 transition-colors"
                  >
                    <Share2 size={16} /> Share File
                  </button>

                  {/* Download Progress/Error Section */}
                  {downloadError && (
                    <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} />
                        <span className="font-medium">Download Error</span>
                      </div>
                      <p className="text-xs mb-2">{downloadError}</p>
                      <button
                        onClick={() => handleDownload()}
                        className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      >
                        Retry Download
                      </button>
                    </div>
                  )}

                  {downloadProgress !== null && (
                    <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">
                          {isDownloading ? 'Downloading...' : 'Download Complete'}
                        </span>
                        <span className="text-sm text-blue-600">{downloadProgress}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <button
                     onClick={() => handleDownload()}
                     disabled={isDownloading}
                     className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                       isDownloading
                         ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                         : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                     } rounded-lg`}
                  >
                    <Download size={16} />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </button>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="relative border-l-2 border-gray-200 ml-4 space-y-6 pl-6 py-2 animate-in fade-in duration-200">
            {loadingVersions ? (
              <p className="text-sm text-gray-500 italic">Loading versions...</p>
            ) : (
              versions.map((v, idx) => (
                <div key={v.id} className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 ${idx === 0 ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}></div>
                  
                  <div className="flex justify-between items-start group">
                     <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">Version {v.version_number}</p>
                          {idx === 0 && <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">Current</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(v.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {(v.size / 1024).toFixed(1)} KB
                        </p>
                     </div>
                     
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {idx !== 0 && (
                          <button 
                            onClick={() => handleRevert(v)}
                            className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100" 
                            title="Revert to this version"
                          >
                            <RotateCcw size={12} /> Revert
                          </button>
                        )}
                        <button className="p-1.5 text-gray-400 hover:text-green-600 rounded" title="Download">
                            <Download size={14} />
                        </button>
                     </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
    </ErrorBoundary>
  );
};

export default FilePreviewModal;