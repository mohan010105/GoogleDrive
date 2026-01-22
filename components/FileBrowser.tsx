
import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder, FileText, ImageIcon, Music, Video, File,
  MoreVertical, Star, Download, Eye, Trash2, RotateCcw,
  Share2, History, Palette, CheckSquare, Square, Move,
  ChevronDown, ArrowUp, ArrowDown, Upload, Cloud, Search, X, CheckCircle, Plus, Clock, Filter, AlertCircle,
  Grid, List
} from './Icons';
import { AppFile, FolderData } from '../types';
import Modal from './Modal';
import { api } from '../services/supabaseService';

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="text-purple-500" />;
  if (mimeType.startsWith('video/')) return <Video className="text-red-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="text-yellow-500" />;
  if (mimeType === 'application/pdf') return <FileText className="text-red-600" />;
  return <File className="text-blue-400" />;
};

const getFileTypeBadge = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'IMG';
  if (mimeType.startsWith('video/')) return 'VID';
  if (mimeType.startsWith('audio/')) return 'AUD';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'DOC';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLS';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT';
  return 'FILE';
};

const FOLDER_COLORS = [
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#10B981', name: 'Green' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#8B5CF6', name: 'Purple' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#6B7280', name: 'Gray' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#111827', name: 'Black' },
];

type SortOption = 'name' | 'created' | 'modified' | 'size' | 'color';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'folders' | 'files';

interface FileBrowserProps {
  files: AppFile[];
  folders: FolderData[];
  viewMode: 'grid' | 'list';
  userId: string;
  currentFolderId: string | null;
  onFolderClick: (folderId: string) => void;
  onFileClick: (file: AppFile) => void;
  onDeleteFile: (id: string) => void;
  onDeleteFolder?: (id: string) => void;
  onRestoreFile: (id: string) => void;
  onRestoreFolder?: (id: string) => void;
  onToggleStar: (id: string) => void;
  onShare: (file: AppFile) => void;
  onShareFolder?: (folder: FolderData) => void;
  onFolderHistory?: (folder: FolderData) => void;
  onUpdateFolderColor?: (folderId: string, color: string) => void;
  onBulkDelete?: (fileIds: string[], folderIds: string[]) => void;
  onCreateFolder?: () => void; // Trigger to open modal
  isCreateFolderOpen?: boolean; // State from parent
  onCloseCreateFolder?: () => void; // State setter from parent
  onShowToast?: (message: string, type: 'success' | 'error') => void;
  isTrashView?: boolean;
  onClearTrash?: () => void;
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  files, folders, viewMode, userId, currentFolderId, onFolderClick, onFileClick, onDeleteFile, onDeleteFolder, onRestoreFile, onRestoreFolder, onToggleStar, onShare, onShareFolder, onFolderHistory, onUpdateFolderColor, onBulkDelete, onCreateFolder, isCreateFolderOpen, onCloseCreateFolder, onShowToast, isTrashView, onClearTrash
}) => {
  
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Sorting & Filtering State
  const [sortOption, setSortOption] = useState<SortOption>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Clear selections when content changes
  useEffect(() => {
    setSelectedFolderIds(new Set());
    setSelectedFileIds(new Set());
    setActiveMenuId(null);
    setFilterQuery(''); 
  }, [files, folders]);

  // --- Stable object URLs for image previews
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const prev = imageUrls;
    const next: Record<string, string> = {};
    const toRevoke: string[] = [];

    // Create object URLs for files that provide a File object and are images
    files.forEach((f) => {
      if (f.mime_type && f.mime_type.startsWith('image/')) {
        if (f.url) {
          next[f.id] = f.url;
        } else if (f.file) {
          // Reuse existing URL if present
          if (prev[f.id]) {
            next[f.id] = prev[f.id];
          } else {
            try {
              next[f.id] = URL.createObjectURL(f.file as File);
            } catch (e) {
              console.error('Failed to create object URL for file', f.name, e);
            }
          }
        }
      }
    });

    // Determine which previous URLs to revoke
    Object.keys(prev).forEach((id) => {
      if (!next[id]) {
        toRevoke.push(prev[id]);
      }
    });

    // Update state
    setImageUrls(next);

    // Revoke outdated URLs
    toRevoke.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ }
    });

    // Cleanup on unmount: revoke all created URLs
    return () => {
      Object.values(next).forEach((u) => {
        // Only revoke blob: URLs (start with blob:)
        try { if (u && u.startsWith('blob:')) URL.revokeObjectURL(u); } catch (e) { /* ignore */ }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Click outside to close active menus
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMenuId]);

  // --- Internal Handlers ---
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !userId) return;
    try {
      await api.createFolder(userId, newFolderName, currentFolderId);
      if (onShowToast) onShowToast(`Folder "${newFolderName}" created`, 'success');
      setNewFolderName('');
      if (onCloseCreateFolder) onCloseCreateFolder();
    } catch (err) {
      if (onShowToast) onShowToast("Failed to create folder", 'error');
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={i} className="bg-blue-100 text-gray-900 font-medium">{part}</span> 
            : part
        )}
      </>
    );
  };

  // --- Filtering & Sorting Logic ---
  const handleSort = (option: SortOption) => {
    if (sortOption === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      // Default to ascending for names, descending for dates/size
      if (option === 'name' || option === 'color') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const processedFolders = useMemo(() => {
    if (filterType === 'files') return [];
    let result = [...folders];
    
    // Filter
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    // Sort
    return result.sort((a, b) => {
      let comparison = 0;
      switch (sortOption) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
        case 'modified': // Folders don't have updated_at, fallback to created_at
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'color':
          comparison = (a.color || '').localeCompare(b.color || '');
          break;
        default:
          // Fallback for size etc which don't apply to folders
          comparison = a.name.localeCompare(b.name); 
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [folders, sortOption, sortDirection, filterQuery, filterType]);

  const processedFiles = useMemo(() => {
    if (filterType === 'folders') return [];
    let result = [...files];

    // Filter
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    // Sort
    return result.sort((a, b) => {
      let comparison = 0;
      switch (sortOption) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'modified':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [files, sortOption, sortDirection, filterQuery, filterType]);

  // --- Selection Logic ---
  const toggleFolderSelection = (id: string) => {
    const newSet = new Set(selectedFolderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedFolderIds(newSet);
  };

  const toggleFileSelection = (id: string) => {
    const newSet = new Set(selectedFileIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedFileIds(newSet);
  };

  const hasSelection = selectedFolderIds.size > 0 || selectedFileIds.size > 0;
  const hasContent = files.length > 0 || folders.length > 0;
  const noSearchResults = hasContent && processedFiles.length === 0 && processedFolders.length === 0;

  const handleBulkAction = (action: 'delete' | 'move') => {
    if (action === 'delete' && onBulkDelete) {
      if (confirm(`Are you sure you want to delete ${selectedFolderIds.size} folders and ${selectedFileIds.size} files?`)) {
        onBulkDelete(Array.from(selectedFileIds), Array.from(selectedFolderIds));
        setSelectedFileIds(new Set());
        setSelectedFolderIds(new Set());
      }
    }
  };

  const getSortLabel = () => {
    switch(sortOption) {
      case 'name': return 'Name';
      case 'created': return 'Date Created';
      case 'modified': return 'Last Modified';
      case 'size': return 'Size';
      case 'color': return 'Color';
      default: return 'Sort';
    }
  };

  // --- Enhanced Empty State ---
  if (!hasContent) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 animate-in fade-in duration-500">
          <div className="mb-8 relative">
             {isTrashView ? (
               <div className="w-48 h-48 bg-gray-50 rounded-full flex items-center justify-center shadow-inner">
                 <Trash2 size={80} className="text-gray-300 stroke-[1.5]" />
               </div>
             ) : (
               <div className="relative">
                 <div className="w-64 h-48 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center shadow-sm">
                   <Cloud size={120} className="text-blue-200" />
                 </div>
               </div>
             )}
          </div>
          <h3 className="text-2xl font-medium text-gray-800 mb-3 text-center">
            {isTrashView ? 'Trash is empty' : 'Your drive is empty'}
          </h3>
          <p className="text-gray-500 text-center max-w-md mb-8 text-base leading-relaxed">
            {isTrashView
              ? 'Items moved to trash will be deleted forever after 30 days.'
              : 'Upload your first file to get started with CloudDrive. Your files will be securely stored and accessible from anywhere.'
            }
          </p>
          {!isTrashView && (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 hover:shadow-xl"
              >
                Upload files
              </button>
              {onCreateFolder && (
                <button
                  onClick={onCreateFolder}
                  className="text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 px-8 py-3 rounded-full font-medium transition-all shadow-sm hover:shadow-md"
                >
                  Create new folder
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal rendered here if state passed */}
        {isCreateFolderOpen && onCloseCreateFolder && (
          <Modal
            isOpen={isCreateFolderOpen}
            onClose={onCloseCreateFolder}
            title="New Folder"
            actions={
              <>
                <button onClick={onCloseCreateFolder} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Cancel</button>
                <button onClick={handleCreateFolder} className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm">Create</button>
              </>
            }
          >
            <div className="py-2">
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Untitled folder"
                className="w-full border border-blue-500 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 text-gray-800"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
          </Modal>
        )}
      </>
    );
  }

  // Helper for Table Headers
  const TableHeader = ({ label, option, className = "" }: { label: string, option: SortOption, className?: string }) => (
    <th 
      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors select-none group text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
      onClick={() => handleSort(option)}
    >
      <div className="flex items-center gap-1">
        <span className={sortOption === option ? "text-gray-900 font-bold" : ""}>{label}</span>
        {sortOption === option ? (
          sortDirection === 'asc' ? <ArrowUp size={12} className="text-gray-900" /> : <ArrowDown size={12} className="text-gray-900" />
        ) : null}
      </div>
    </th>
  );

  return (
    <div className="space-y-4 relative pb-20">

      {/* Enhanced Toolbar */}
      <div className="flex flex-col gap-4">
        {/* Action Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Upload File Button - Only show when not in trash view */}
            {!isTrashView && (
              <button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Upload size={16} />
                Upload
              </button>
            )}

            {/* New Folder Button */}
            {!isTrashView && onCreateFolder && (
              <button
                onClick={onCreateFolder}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 transition-colors shadow-sm"
              >
                <Plus size={16} />
                New folder
              </button>
            )}

            {/* Clear Trash Button - Only show in trash view */}
            {isTrashView && onClearTrash && (
              <button
                onClick={onClearTrash}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Trash2 size={16} />
                Clear trash
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 transition-colors shadow-sm"
              >
                <span>{getSortLabel()}</span>
                <ChevronDown size={16} />
              </button>
               {isSortMenuOpen && (
                 <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'created', label: 'Date created' },
                      { key: 'modified', label: 'Last modified' },
                      { key: 'size', label: 'File size' }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { handleSort(opt.key as SortOption); setIsSortMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                          sortOption === opt.key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {opt.label}
                        {sortOption === opt.key && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </button>
                    ))}
                 </div>
               )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => {}}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                title="Grid view"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => {}}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                title="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Indicator */}
        {(filterQuery || isTrashView) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {filterQuery && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                Filtered by "{filterQuery}"
              </span>
            )}
            {isTrashView && (
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                Trash
              </span>
            )}
          </div>
        )}
      </div>

      {noSearchResults && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
           <div className="bg-gray-100 p-4 rounded-full mb-4">
             <Search size={32} className="text-gray-400" />
           </div>
           <p className="text-lg text-gray-800 font-medium">No results found</p>
           <p className="text-sm">Try adjusting your search terms</p>
           <button onClick={() => setFilterQuery('')} className="text-blue-600 text-sm hover:underline mt-4 font-medium">Clear search</button>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-[#323232] text-white shadow-2xl rounded-lg px-2 py-1 flex items-center gap-1 animate-in slide-in-from-bottom-6 duration-300">
             <div className="flex items-center gap-2 px-3 border-r border-gray-600">
                <span className="text-sm font-medium">{selectedFolderIds.size + selectedFileIds.size} selected</span>
             </div>
             <button onClick={() => setSelectedFileIds(new Set()) && setSelectedFolderIds(new Set())} className="p-2 hover:bg-gray-700 rounded-full" title="Clear selection">
                <X size={18} />
             </button>
             {!isTrashView && (
               <button onClick={() => handleBulkAction('delete')} className="p-2 hover:bg-gray-700 rounded-full text-red-300 hover:text-red-200" title="Delete">
                  <Trash2 size={18} />
               </button>
             )}
             <button className="p-2 hover:bg-gray-700 rounded-full" title="Move to...">
                <Move size={18} />
             </button>
          </div>
        </div>
      )}

      {/* Folders Grid */}
      {processedFolders.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h3 className="text-sm font-medium text-gray-600 mb-3 pl-1">Folders</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {processedFolders.map(folder => {
              const isSelected = selectedFolderIds.has(folder.id);
              const isMenuOpen = activeMenuId === folder.id;
              
              return (
                <div 
                  key={folder.id}
                  onClick={() => !isTrashView && onFolderClick(folder.id)}
                  className={`group relative border rounded-lg p-3 transition-all duration-150 flex flex-col cursor-pointer select-none bg-white
                    ${isTrashView ? 'opacity-75 bg-gray-50' : ''}
                    ${isSelected 
                      ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                      : 'border-gray-300 hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                     <Folder className={`text-gray-500 fill-gray-500`} style={{ color: folder.color || '#5f6368' }} size={24} />
                     <span className="text-sm font-medium text-gray-700 truncate w-full">
                       {highlightMatch(folder.name, filterQuery)}
                     </span>
                  </div>
                  
                  {/* Context Menu Trigger */}
                  {!isTrashView && (
                    <div className="absolute right-2 top-2">
                       <button 
                         onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : folder.id); }}
                         className={`p-1 rounded-full hover:bg-gray-200 transition-opacity ${isMenuOpen ? 'opacity-100 bg-gray-200' : 'opacity-0 group-hover:opacity-100'}`}
                       >
                          <MoreVertical size={16} className="text-gray-500" />
                       </button>
                       
                       {/* Dropdown Menu */}
                       {isMenuOpen && (
                         <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <button 
                              onClick={(e) => { e.stopPropagation(); onFolderHistory && onFolderHistory(folder); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                               <History size={16} /> Version History
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onShareFolder && onShareFolder(folder); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                               <Share2 size={16} /> Share
                            </button>
                            {/* Color Picker Sub-Section */}
                            <div className="px-4 py-2 border-t border-gray-100">
                               <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Color</p>
                               <div className="flex flex-wrap gap-1.5">
                                 {FOLDER_COLORS.slice(0, 5).map(c => (
                                   <button 
                                     key={c.hex}
                                     onClick={(e) => { e.stopPropagation(); onUpdateFolderColor && onUpdateFolderColor(folder.id, c.hex); setActiveMenuId(null); }}
                                     className="w-4 h-4 rounded-full hover:scale-110 transition-transform"
                                     style={{ backgroundColor: c.hex }}
                                     title={c.name}
                                   />
                                 ))}
                               </div>
                            </div>
                            <div className="border-t border-gray-100 mt-1 pt-1">
                               <button 
                                  onClick={(e) => { e.stopPropagation(); onDeleteFolder && onDeleteFolder(folder.id); setActiveMenuId(null); }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                               >
                                  <Trash2 size={16} /> Remove
                               </button>
                            </div>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      {processedFiles.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
          <h3 className="text-sm font-medium text-gray-600 mb-3 pl-1">Files</h3>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {processedFiles.map(file => {
                const isSelected = selectedFileIds.has(file.id);
                return (
                  <div
                    key={file.id}
                    className={`group relative border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer bg-white select-none hover:shadow-lg
                      ${isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }
                    `}
                    onClick={() => !isTrashView && onFileClick(file)}
                  >
                    {/* Preview Area */}
                    <div className="h-36 bg-gray-50 flex items-center justify-center relative overflow-hidden">
                         {file.mime_type && file.mime_type.startsWith('image/') && file.file ? (
                           <img
                            src={imageUrls[file.id] || ''}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={() => {
                              // Fallback to icon if image fails to load
                              console.error('Failed to load image preview for:', file.name);
                            }}
                           />
                         ) : (
                          <div className="transform scale-150 opacity-60 group-hover:scale-160 group-hover:opacity-80 transition-all duration-200">
                            {getFileIcon(file.mime_type)}
                          </div>
                       )}
                       {isSelected && <div className="absolute inset-0 bg-blue-500/10"></div>}

                       {/* File Type Badge */}
                       <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-medium">
                         {getFileTypeBadge(file.mime_type)}
                       </div>

                       {/* Shared Indicator */}
                       {file.is_starred && (
                         <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 p-1 rounded-full">
                           <Star size={12} className="fill-current" />
                         </div>
                       )}
                    </div>

                    {/* Footer */}
                    <div className="p-3">
                        {/* File Name */}
                        <div className="flex items-start gap-2 mb-2">
                           <div className="min-w-[16px] mt-0.5">
                             {getFileIcon(file.mime_type)}
                           </div>
                           <span className={`text-sm font-medium truncate leading-tight ${isTrashView ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {highlightMatch(file.name, filterQuery)}
                           </span>
                        </div>

                        {/* File Info */}
                        <div className="text-xs text-gray-500 mb-3">
                          {formatDate(file.updated_at)}
                        </div>

                        {/* Action Buttons - Appear on Hover */}
                        {!isTrashView && (
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={(e) => { e.stopPropagation(); onFileClick(file); }}
                                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-800 transition-colors"
                                title="Open"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onShare(file); }}
                                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-800 transition-colors"
                                title="Share"
                              >
                                <Share2 size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); }}
                                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-800 transition-colors"
                                title="More"
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); }}
                              className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}

                        {isTrashView && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onRestoreFile(file.id); }}
                            className="text-xs text-blue-600 font-medium hover:underline"
                          >
                            Restore
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="border-t border-gray-200 bg-white">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-white text-gray-500 border-b border-gray-200">
                  <tr>
                    <TableHeader label="Name" option="name" className="pl-4" />
                    <th className="px-4 py-2 font-medium">Owner</th>
                    <TableHeader label="Last modified" option="modified" />
                    <TableHeader label="File size" option="size" />
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processedFolders.map(folder => {
                      const isSelected = selectedFolderIds.has(folder.id);
                      return (
                        <tr 
                          key={folder.id} 
                          className={`group cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          onClick={() => !isTrashView && onFolderClick(folder.id)}
                        >
                          <td className="px-4 py-3 flex items-center gap-3">
                              <Folder className="text-gray-500 fill-gray-500" size={20} />
                              <span className="font-medium text-gray-800">{highlightMatch(folder.name, filterQuery)}</span>
                          </td>
                          <td className="px-4 py-3">me</td>
                          <td className="px-4 py-3">{formatDate(folder.created_at)}</td>
                          <td className="px-4 py-3">-</td>
                          <td className="px-4 py-3 text-right">
                             <button className="p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100"><MoreVertical size={16} /></button>
                          </td>
                        </tr>
                      )
                  })}
                  {processedFiles.map(file => {
                      const isSelected = selectedFileIds.has(file.id);
                      return (
                        <tr 
                          key={file.id} 
                          className={`group cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          onClick={() => !isTrashView && onFileClick(file)}
                        >
                          <td className="px-4 py-3 flex items-center gap-3">
                              {getFileIcon(file.mime_type)}
                              <span className={`font-medium ${isTrashView ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                {highlightMatch(file.name, filterQuery)}
                              </span>
                          </td>
                          <td className="px-4 py-3">me</td>
                          <td className="px-4 py-3">{formatDate(file.updated_at)}</td>
                          <td className="px-4 py-3">{(file.size / 1024 / 1024).toFixed(2)} MB</td>
                          <td className="px-4 py-3 text-right">
                            {!isTrashView && (
                               <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100">
                                  <button onClick={(e) => { e.stopPropagation(); onShare(file); }}><Share2 size={16} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); }}><Trash2 size={16} /></button>
                               </div>
                            )}
                          </td>
                        </tr>
                      )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Modal rendered here if state passed */}
      {isCreateFolderOpen && onCloseCreateFolder && (
          <Modal 
            isOpen={isCreateFolderOpen} 
            onClose={onCloseCreateFolder}
            title="New Folder"
            actions={
              <>
                <button onClick={onCloseCreateFolder} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Cancel</button>
                <button onClick={handleCreateFolder} className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm">Create</button>
              </>
            }
          >
            <div className="py-2">
              <input 
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Untitled folder"
                className="w-full border border-blue-500 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 text-gray-800"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
          </Modal>
      )}
    </div>
  );
};

export default FileBrowser;
