import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Download, AlertCircle, Eye } from 'lucide-react';
import { AppFile } from '../types';
import { downloadFile } from '../utils/fileUtils';

interface FilePreviewModalProps {
  activeFile: AppFile | null;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ activeFile, onClose }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create object URL once when activeFile changes
  useEffect(() => {
    if (!activeFile) {
      setFileUrl(null);
      setError(null);
      return;
    }

    console.log('FilePreviewModal: Processing file:', activeFile.name, activeFile.mime_type);

    // Use File object if available, otherwise fall back to signed URL
    let url: string;
    if (activeFile.file) {
      url = URL.createObjectURL(activeFile.file);
    } else if (activeFile.url) {
      url = activeFile.url;
    } else {
      setError('File data not available');
      return;
    }

    setFileUrl(url);
    setError(null);

    // Cleanup function - revoke object URL if we created it
    return () => {
      try {
        if (activeFile && activeFile.file && url) {
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.warn('Failed to revoke object URL during cleanup', e);
      }
    };
  }, [activeFile]);

  const handleClose = () => {
    // Revoke any object URL we created and clear state, then notify parent
    try {
      if (fileUrl && activeFile && activeFile.file) {
        URL.revokeObjectURL(fileUrl);
      }
    } catch (e) {
      console.warn('Failed to revoke object URL on close', e);
    }
    setFileUrl(null);
    setError(null);
    onClose();
  };

  const handlePreview = () => {
    if (!fileUrl) return;
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    if (!fileUrl || !activeFile) return;
    downloadFile(fileUrl, activeFile.name);
  };

  const renderPreview = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <AlertCircle size={48} className="mb-4" />
          <p className="text-lg font-medium">Preview not available</p>
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    // Inline preview only for images
    if (activeFile?.mime_type.startsWith('image/')) {
      return (
        <div className="flex justify-center">
          <img
            src={fileUrl}
            alt={activeFile?.name || 'Preview'}
            className="max-w-full max-h-96 object-contain"
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    // For all other files, show preview button
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Eye size={48} className="mb-4" />
        <p className="text-lg font-medium">Click Preview to open file</p>
        <p className="text-sm mb-4">File will open in a new tab</p>
        <button
          onClick={handlePreview}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Eye size={16} />
          Preview File
        </button>
      </div>
    );
  };

  return (
    <Modal
      isOpen={!!activeFile}
      onClose={handleClose}
      title={activeFile?.name || 'File Preview'}
      maxWidth="max-w-4xl"
    >
      <div className="p-6">
        {renderPreview()}

        <div className="mt-4 flex justify-center">
          <button
            onClick={handleDownload}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
            disabled={!activeFile}
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FilePreviewModal;
