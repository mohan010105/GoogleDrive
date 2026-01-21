import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { ShareConfig, AccessRole, SharedUser } from '../types';
import { api } from '../services/supabaseService';
import { User, Copy, Globe, Lock, Calendar, Shield, X, Folder, File, Link as LinkIcon, Check, ChevronDown, Info, Eye, EyeOff } from 'lucide-react';

interface ShareItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShareItem;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const ROLE_OPTIONS: { value: AccessRole; label: string; description: string }[] = [
  { value: 'viewer', label: 'Viewer', description: 'Can view and download files' },
  { value: 'editor', label: 'Editor', description: 'Can organize, add, and edit files' }
];

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item, showToast }) => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ShareConfig | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<AccessRole>('viewer');
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      api.getShareSettings(item.id, item.type)
        .then(setConfig)
        .finally(() => setLoading(false));
    }
  }, [isOpen, item]);

  const handleSave = async () => {
    if (config) {
      await api.updateShareSettings(config);
      showToast('Share settings updated successfully', 'success');
      onClose();
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !newUserEmail) return;
    
    // Check if user already added
    if (config.sharedUsers.some(u => u.email === newUserEmail)) {
        showToast('User already has access', 'error');
        return;
    }

    const newUser: SharedUser = {
      email: newUserEmail,
      role: newUserRole
    };
    
    setConfig({
      ...config,
      sharedUsers: [...config.sharedUsers, newUser]
    });
    setNewUserEmail('');
    showToast(`Added ${newUserEmail} as ${newUserRole}`, 'success');
  };

  const handleRemoveUser = (email: string) => {
    if (!config) return;
    setConfig({
      ...config,
      sharedUsers: config.sharedUsers.filter(u => u.email !== email)
    });
  };

  const shareUrl = `${window.location.origin}?shareId=${item?.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast('Link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!config) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
           <div className={`p-1.5 rounded-lg ${item.type === 'folder' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
              {item.type === 'folder' ? <Folder size={18} /> : <File size={18} />}
           </div>
           <span>Share "{item.name}"</span>
        </div> as any
      }
      actions={
        <>
           <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">Cancel</button>
           <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors">Done</button>
        </>
      }
    >
      <div className="space-y-6">
        
        {/* Universal Link Section */}
        <div>
           <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Link for sharing</label>
           <div className="flex gap-2 items-center">
              <div className="flex-1 flex items-center bg-gray-100 border border-transparent hover:border-gray-300 transition-colors rounded-lg px-3 py-2 relative overflow-hidden">
                 <LinkIcon size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                 <div className="flex-1 truncate text-sm text-gray-600 font-medium font-mono select-all">
                    {shareUrl}
                 </div>
                 {/* Fade effect for long URL */}
                 <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none"></div>
              </div>
              <button 
               onClick={handleCopyLink}
               className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-all min-w-[90px] justify-center shadow-sm
                 ${copied 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
               }`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
           </div>
           <div className="mt-2 flex items-center gap-2 text-xs">
             {!config.isPublic ? (
                <span className="text-orange-600 flex items-center gap-1.5 font-medium">
                  <Lock size={12} /> Only people added below can access via this link
                </span>
             ) : (
                <span className="text-blue-600 flex items-center gap-1.5 font-medium">
                   <Globe size={12} /> Anyone with the link can view
                </span>
             )}
           </div>
        </div>

        {/* General Access Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${config.isPublic ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                   {config.isPublic ? <Globe size={20} /> : <Lock size={20} />}
                </div>
                <div>
                   <p className="text-sm font-bold text-gray-800">General Access</p>
                   <p className="text-xs text-gray-500 font-medium">
                      {config.isPublic ? 'Public: Anyone with the link' : 'Restricted: Only added users'}
                   </p>
                </div>
            </div>
            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.isPublic} 
                onChange={(e) => setConfig({ ...config, isPublic: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
        </div>

        {/* Access Settings for Public (Password/Expiry) */}
        {config.isPublic && (
            <div className="pt-3 space-y-4 animate-in fade-in slide-in-from-top-1 px-1">
                {/* Password Protection Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                       <div className={`p-1 rounded ${config.passwordProtected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                         <Lock size={12} />
                       </div>
                       Password Protection
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.passwordProtected || false} 
                        onChange={(e) => {
                           const isChecked = e.target.checked;
                           setConfig({ 
                             ...config, 
                             passwordProtected: isChecked,
                             password: isChecked ? config.password : undefined 
                           });
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {config.passwordProtected && (
                    <div className="ml-7 relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Set a password"
                        value={config.password || ''}
                        onChange={(e) => setConfig({ ...config, password: e.target.value })}
                        className="w-full text-sm pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-gray-400"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                         {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expiry Date Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                       <div className={`p-1 rounded ${config.expiryDate ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                         <Calendar size={12} />
                       </div>
                       Link Expiration
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={!!config.expiryDate} 
                        onChange={(e) => {
                           const isChecked = e.target.checked;
                           // Default to 7 days from now if checked
                           const nextWeek = new Date();
                           nextWeek.setDate(nextWeek.getDate() + 7);
                           setConfig({ 
                             ...config, 
                             expiryDate: isChecked ? nextWeek.toISOString() : null
                           });
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {config.expiryDate && (
                    <div className="ml-7">
                       <input 
                         type="date"
                         value={config.expiryDate.split('T')[0]}
                         onChange={(e) => setConfig({ ...config, expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                         className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-gray-700"
                       />
                    </div>
                  )}
                </div>
            </div>
        )}

        <div className="border-t border-gray-100 my-2"></div>

        {/* People List */}
        <div className="space-y-3">
           <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <User size={16} className="text-blue-600" />
              People with access
           </h4>
           
           <div className="max-h-[160px] overflow-y-auto pr-2 space-y-1 custom-scrollbar">
              {/* Owner */}
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm">
                        You
                     </div>
                     <div>
                        <p className="text-sm font-semibold text-gray-900">You (Owner)</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Owner</p>
                     </div>
                  </div>
              </div>
              
              {/* Shared Users */}
              {config.sharedUsers.map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm">
                            {user.email.substring(0, 2).toUpperCase()}
                         </div>
                         <div>
                            <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{user.role}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="relative group/role">
                            <select
                               value={user.role}
                               onChange={(e) => {
                                  const newUsers = [...config.sharedUsers];
                                  newUsers[idx].role = e.target.value as AccessRole;
                                  setConfig({ ...config, sharedUsers: newUsers });
                               }}
                               className="appearance-none bg-transparent pl-2 pr-6 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded cursor-pointer outline-none capitalize"
                            >
                               {ROLE_OPTIONS.map(opt => (
                                 <option key={opt.value} value={opt.value}>{opt.label}</option>
                               ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-1 top-1.5 text-gray-500 pointer-events-none" />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg opacity-0 group-hover/role:opacity-100 transition-opacity z-10 pointer-events-none">
                               {ROLE_OPTIONS.find(r => r.value === user.role)?.description}
                            </div>
                         </div>
                         <button onClick={() => handleRemoveUser(user.email)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <X size={16} />
                         </button>
                      </div>
                  </div>
              ))}
              
              {config.sharedUsers.length === 0 && (
                <p className="text-xs text-gray-400 italic pl-11">No specific people added yet.</p>
              )}
           </div>
        </div>

        {/* Dark Invitation Input Bar */}
        <div className="pt-2">
            <form onSubmit={handleAddUser} className="flex items-stretch gap-3">
               <div className="flex-1 bg-[#2C2C2C] rounded-lg flex items-center p-1 shadow-inner focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                  <input 
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="Add people via email"
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm px-3 placeholder-gray-400"
                  />
                  <div className="relative border-l border-gray-600 pl-1 my-1 h-6 flex items-center group/newrole">
                      <select 
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as AccessRole)}
                        className="appearance-none bg-white text-gray-800 text-xs font-bold py-1 pl-3 pr-7 rounded-md outline-none cursor-pointer hover:bg-gray-100 mx-1 transition-colors h-full flex items-center shadow-sm"
                      >
                         {ROLE_OPTIONS.map(opt => (
                           <option key={opt.value} value={opt.value}>{opt.label}</option>
                         ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" />
                      <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg opacity-0 group-hover/newrole:opacity-100 transition-opacity z-10 pointer-events-none">
                         {ROLE_OPTIONS.find(r => r.value === newUserRole)?.description}
                      </div>
                  </div>
               </div>
               <button 
                 type="submit" 
                 className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 rounded-lg transition-colors shadow-sm active:transform active:scale-95"
               >
                 Invite
               </button>
            </form>
        </div>

      </div>
    </Modal>
  );
};

export default ShareModal;