
import React, { useState } from 'react';
import {
  Home, Folder, Star, Trash2, LogOut,
  Upload, User as UserIcon, Search, Cloud, CheckCircle, Clock, Plus,
  ChevronDown, FileUp, FolderPlus
} from './Icons';
import { UserRole, UserProfile, AppFile } from '../types';
import CurrentPlan from './CurrentPlan';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile; // Changed from userRole to full user object
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onUpload: (file: File) => void;
  onCreateFolder: () => void;
  onSearch: (query: string) => void;
  uploadProgress?: number | null;
  onUpgradeClick: (planId?: string, billing?: 'monthly' | 'annual') => void;
  upgradeLoading?: boolean;
  onFileSelect: (file: AppFile | null) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children, user, currentPath, onNavigate, onLogout, onUpload, onCreateFolder, onSearch, uploadProgress, onUpgradeClick, upgradeLoading, onFileSelect
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // New Button Handlers
  const handleNewUpload = () => {
    setIsNewMenuOpen(false);
    document.getElementById('file-upload')?.click();
  };

  const handleNewFolder = () => {
    setIsNewMenuOpen(false);
    onCreateFolder();
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.new-dropdown')) {
        setIsNewMenuOpen(false);
      }
    };

    if (isNewMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNewMenuOpen]);

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col flex-shrink-0 bg-white z-20">
        <div className="h-16 flex items-center px-6 mb-2">
          <div className="flex items-center gap-2.5 font-bold text-xl text-gray-600 tracking-tight cursor-pointer" onClick={() => onNavigate('drive')}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-blue-600">
              <Cloud size={28} fill="currentColor" className="drop-shadow-sm" />
            </div>
            <span className="text-gray-600">CloudDrive</span>
          </div>
        </div>

        <div className="px-4 flex flex-col gap-2 h-full">
          {/* Prominent NEW Button with Dropdown */}
          <div className="mb-4 relative">
            <button
              onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-2xl py-3 px-5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.12)] transition-all duration-200 w-full justify-between"
            >
              <div className="flex items-center gap-3">
                <Plus size={24} className="text-blue-600" />
                <span className="text-sm">New</span>
              </div>
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${isNewMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isNewMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={handleNewUpload}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <Upload size={16} className="text-gray-500" />
                  <span>Upload file</span>
                </button>
                <button
                  onClick={handleNewFolder}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <Folder size={16} className="text-gray-500" />
                  <span>Create folder</span>
                </button>
              </div>
            )}

            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  console.log('File selected:', file.name, file.size, file.type);
                  // STEP 2: Set activeFile for preview/download
                  onFileSelect(file);
                  // Keep upload functionality
                  onUpload(file);
                  e.target.value = '';
                } else {
                  onFileSelect(null);
                }
              }}
            />
          </div>

          <nav className="flex flex-col gap-0.5 pr-2">
            <NavItem icon={<Home size={18} />} label="My Drive" active={currentPath === 'drive'} onClick={() => onNavigate('drive')} />
            <NavItem icon={<Clock size={18} />} label="Recent" active={currentPath === 'recent'} onClick={() => onNavigate('recent')} />
            <NavItem icon={<Star size={18} />} label="Starred" active={currentPath === 'starred'} onClick={() => onNavigate('starred')} />
            <NavItem icon={<Trash2 size={18} />} label="Trash" active={currentPath === 'trash'} onClick={() => onNavigate('trash')} />
            {user.role === UserRole.ADMIN && (
               <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Administration</p>
                  <NavItem icon={<UserIcon size={18} />} label="Admin Panel" active={currentPath === 'admin'} onClick={() => onNavigate('admin')} />
               </div>
            )}
          </nav>
          
          <div className="mt-auto pb-6">
            {/* Current Plan Component */}
            <div className="px-4 mb-4">
              <CurrentPlan userId={user.id} onUpgradeClick={onUpgradeClick} loading={upgradeLoading} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className="flex-1 flex flex-col min-w-0 relative bg-white"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
          {/* Search Bar (Pill Shape) */}
          <div className="flex-1 max-w-3xl px-2">
            <form onSubmit={handleSearchSubmit} className="relative group w-full">
              <div className="relative flex items-center w-full bg-[#edf2fc] group-focus-within:bg-white group-focus-within:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] rounded-full transition-all duration-200 h-12">
                 <button type="submit" className="p-3 ml-1 text-gray-500 rounded-full hover:bg-gray-200/50">
                    <Search size={20} />
                 </button>
                 <input 
                  type="text" 
                  placeholder="Search in Drive"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-gray-700 text-base px-2 placeholder-gray-500 h-full"
                />
                <div className="mr-2">
                   {/* Filter Icon placeholder */}
                </div>
              </div>
            </form>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-4">
             <div className="flex items-center gap-3 p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors pr-2 group relative">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {getInitials(user.full_name || user.email)}
                </div>
                <ChevronDown size={16} className="text-gray-500" />

                {/* Enhanced User Dropdown */}
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 py-1 hidden group-hover:block hover:block z-50">
                   <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                   </div>

                   {/* Current Plan */}
                   <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-xs font-medium text-gray-600">Current plan</span>
                         <span className="text-xs text-gray-500">Free</span>
                      </div>

                      {/* Storage Usage Bar */}
                      <div className="mb-2">
                         <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Storage used</span>
                            <span>2.1 MB of 15 GB</span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '14%' }}></div>
                         </div>
                      </div>

                       <button onClick={() => onUpgradeClick && onUpgradeClick('lite', 'monthly')} className="w-full text-left text-xs text-blue-600 hover:text-blue-800 font-medium" disabled={upgradeLoading}>
                         Manage plan
                       </button>

                      <button
                        onClick={() => onUpgradeClick && onUpgradeClick('lite', 'monthly')}
                        className="w-full mt-2 bg-blue-600 text-white text-sm py-2 rounded-lg font-medium hover:bg-blue-700"
                        disabled={upgradeLoading}
                      >
                        Upgrade
                      </button>
                   </div>

                   <button
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                   >
                      <LogOut size={16} /> Sign out
                   </button>
                </div>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-2 pb-8 scroll-smooth">
          {children}
        </div>

        {/* Drag Overlay */}
        {dragActive && (
          <div className="absolute inset-0 bg-blue-50/90 z-50 flex items-center justify-center m-4 rounded-2xl border-2 border-blue-400 border-dashed">
            <div className="flex flex-col items-center pointer-events-none">
              <div className="p-6 bg-blue-100 text-blue-600 rounded-full mb-4 animate-bounce">
                <Upload size={48} />
              </div>
              <p className="text-2xl font-medium text-blue-900">Drop files to upload</p>
            </div>
          </div>
        )}

        {/* Upload Progress Indicator */}
        {uploadProgress !== undefined && uploadProgress !== null && (
          <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-[0_6px_10px_0_rgba(0,0,0,0.14),0_1px_18px_0_rgba(0,0,0,0.12),0_3px_5px_-1px_rgba(0,0,0,0.20)] w-80 z-50 overflow-hidden ring-1 ring-black/5 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-[#323232] px-4 py-3 flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                    {uploadProgress === 100 ? 'Upload complete' : `Uploading 1 item...`}
                </span>
                <span className="text-xs text-gray-300 font-mono">{uploadProgress}%</span>
            </div>
            
            <div className="p-3 bg-white">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded">
                     <Folder size={16} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-sm text-gray-700 truncate font-medium">New Upload</p>
                  </div>
                  <div className="flex-shrink-0">
                     {uploadProgress === 100 ? (
                        <CheckCircle size={20} className="text-green-600" />
                     ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin"></div>
                     )}
                  </div>
               </div>
               
               {/* Progress Bar */}
               <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                 <div 
                    className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                 />
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-2 rounded-r-full text-[14px] font-medium transition-colors mb-0.5 ${
      active 
        ? 'bg-[#e8f0fe] text-[#1967d2]' 
        : 'text-[#3c4043] hover:bg-gray-100'
    }`}
  >
    <span className={active ? 'text-[#1967d2]' : 'text-[#5f6368]'}>{icon}</span>
    {label}
  </button>
);

export default Layout;
