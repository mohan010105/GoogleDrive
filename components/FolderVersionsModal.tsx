import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { FolderData, FolderVersion } from '../types';
import { api } from '../services/supabaseService';
import { Clock, RotateCcw, Folder, File, User, AlertCircle } from './Icons';

interface FolderVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FolderData;
}

const FolderVersionsModal: React.FC<FolderVersionsModalProps> = ({ isOpen, onClose, folder }) => {
  const [versions, setVersions] = useState<FolderVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && folder) {
      setLoading(true);
      setError(null);
      api.getFolderVersions(folder.id)
        .then(setVersions)
        .catch(() => setError("Failed to load version history"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, folder]);

  const handleRevert = async (v: FolderVersion) => {
    if (confirm(`Are you sure you want to revert folder "${folder.name}" to its state on ${new Date(v.snapshot_date).toLocaleDateString()}?`)) {
      try {
        await api.revertFolderVersion(folder.id, v.id);
        // Refresh list
        const updated = await api.getFolderVersions(folder.id);
        setVersions(updated);
      } catch (e) {
        alert("Failed to revert folder version");
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Folder History"
      actions={
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors">Close</button>
      }
    >
      <div className="mb-6 bg-blue-50 p-4 rounded-xl flex items-center gap-4 border border-blue-100">
         <div className="p-3 bg-white rounded-lg text-blue-600 shadow-sm ring-1 ring-blue-100">
            <Folder size={24} />
         </div>
         <div>
            <p className="font-bold text-gray-900 text-sm">{folder.name}</p>
            <p className="text-xs text-blue-600 font-medium">Managing history and snapshots</p>
         </div>
      </div>

      <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pl-8 py-2 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
            <p className="text-xs font-medium">Loading history...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center py-8 text-red-500 gap-2">
            <AlertCircle size={20} />
            <p className="text-xs font-medium">{error}</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-1">
             <Clock size={24} className="mb-2 opacity-50" />
             <p className="text-sm font-medium text-gray-500">No history available</p>
             <p className="text-xs">Changes to this folder will appear here.</p>
          </div>
        ) : (
          versions.map((v, idx) => (
            <div key={v.id} className="relative animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
              {/* Timeline Dot */}
              <div className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 shadow-sm z-10 transition-colors ${idx === 0 ? 'bg-white border-blue-600' : 'bg-gray-50 border-gray-300'}`}></div>
              
              <div className="flex justify-between items-start group">
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm font-bold text-gray-800">{v.name}</p>
                      {idx === 0 && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide shadow-sm">Current</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 bg-gray-50/50 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                       <p className="text-xs text-gray-500 flex items-center gap-2">
                         <Clock size={12} className="text-gray-400" />
                         {new Date(v.snapshot_date).toLocaleString()}
                       </p>
                       <p className="text-xs text-gray-500 flex items-center gap-2">
                          <File size={12} className="text-gray-400" />
                          <span className="font-medium text-gray-700">{v.item_count}</span> items
                       </p>
                       {v.created_by && (
                         <p className="text-xs text-gray-500 flex items-center gap-2 col-span-2 border-t border-gray-100 pt-1.5 mt-0.5">
                            <User size={12} className="text-gray-400" />
                            Created by <span className="font-medium text-gray-700">{v.created_by}</span>
                         </p>
                       )}
                    </div>
                 </div>
                 
                 {idx !== 0 && (
                   <button 
                     onClick={() => handleRevert(v)}
                     className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-semibold ml-4 shadow-sm border border-blue-100" 
                   >
                     <RotateCcw size={12} /> Revert
                   </button>
                 )}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export default FolderVersionsModal;