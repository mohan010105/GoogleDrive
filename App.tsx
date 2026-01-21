import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import FileBrowser from './components/FileBrowser';
import AdminPanel from './components/AdminPanel';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentFailure from './components/PaymentFailure';
import PricingPage from './components/PricingPage';
import PaymentPage from './components/PaymentPage';
import Modal from './components/Modal';
import ShareModal from './components/ShareModal';
import FilePreviewModal from './components/FilePreviewModal';
import FolderVersionsModal from './components/FolderVersionsModal';
import UpgradeModal from './components/UpgradeModal';
import ToastContainer, { ToastMessage } from './components/Toast';
import { PaymentProvider } from './components/PaymentContext';
import { api } from './services/supabaseService';
import { supabase } from './services/supabaseClient';
import { UserRole, FileData, FolderData, Breadcrumb, UserProfile, StoragePlan } from './types';
import { ArrowLeft, User, Lock, Mail, Cloud, Eye, EyeOff, Check, X, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';

const PasswordRule = ({ label, met }: { label: string; met: boolean }) => (
    <div className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-green-600' : 'text-gray-400'}`}>
        {met ? <Check size={12} className="stroke-[3]" /> : <div className="w-3 h-3 rounded-full border border-gray-300"></div>}
        <span className={met ? 'font-medium' : ''}>{label}</span>
    </div>
);

const AppContent: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  
  // Auth Inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Password Reset State
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- App State ---
  const [currentPath, setCurrentPath] = useState('drive'); // drive, recent, starred, trash, admin
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'My Drive' }]);
  
  // --- Data State ---
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingShareId, setPendingShareId] = useState<string | null>(null);

  // --- Modal States ---
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [shareItem, setShareItem] = useState<{ id: string, name: string, type: 'file' | 'folder' } | null>(null);
  const [historyFolder, setHistoryFolder] = useState<FolderData | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ isOpen: boolean, currentPlan: any, targetPlan: any, billingCycle: 'monthly' | 'annual' } | null>(null);

  // --- Payment Flow State ---
  const [paymentSuccess, setPaymentSuccess] = useState<{ planName: string; amount: number; billingCycle: 'monthly' | 'annual'; transactionId: string } | null>(null);
  const [paymentFailure, setPaymentFailure] = useState<{ errorMessage: string; planName: string; amount: number; billingCycle: 'monthly' | 'annual' } | null>(null);

  // --- Upgrade Flow State ---
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // --- Password Prompt State ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [sharePasswordInput, setSharePasswordInput] = useState('');

  // --- Effects ---

  // 0. Check for Persisted Session (Local Auth)
  useEffect(() => {
    // Check for existing session on app load
    const checkSession = () => {
      const storedUser = localStorage.getItem('cloud_drive_current_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          setIsAuthenticated(true);
          // Admin check: redirect based on email
          const isAdmin = user.email.toLowerCase() === "mohanrajit05@gmail.com";
          setCurrentPath(isAdmin ? 'admin' : 'drive');
        } catch (e) {
          console.error('Failed to parse stored user', e);
          localStorage.removeItem('cloud_drive_current_user');
        }
      }
    };

    checkSession();
  }, []);

  // 1. Check for Share Link on Load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('shareId');

    if (shareId) {
      setPendingShareId(shareId);
    }
  }, []);

  // 2. Process Pending Share Link once Authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser && pendingShareId) {
      checkSharedFileAccess(pendingShareId);
    }
  }, [isAuthenticated, currentUser, pendingShareId]);

  // 3. Normal Data Fetching
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser, currentFolderId, currentPath]);

  // 4. REALTIME SUBSCRIPTION (Supabase Simulation)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Subscribe to database changes
    const subscription = api.subscribe((event) => {
      // Logic to decide if we need to refresh based on the event
      // In a real app, we might patch the local state 'files' array for performance.
      // For this robust simulation, we trigger a re-fetch to ensure consistency.
      console.log("Realtime Event Received:", event);
      fetchContent();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated, currentUser, currentFolderId, currentPath]);

  // 5. AUTO TRASH CLEANUP - Run on app load and every 24 hours
  useEffect(() => {
    if (!isAuthenticated) return;

    const runAutoCleanup = async () => {
      try {
        const result = await api.autoCleanupTrash();
        if (result.deletedFiles > 0 || result.deletedFolders > 0) {
          console.log(`Auto-cleanup: Deleted ${result.deletedFiles} files and ${result.deletedFolders} folders from trash`);
          // Refresh content if we're currently viewing trash
          if (currentPath === 'trash') {
            fetchContent();
          }
        }
      } catch (error) {
        console.error('Auto trash cleanup failed:', error);
      }
    };

    // Run cleanup immediately when user logs in
    runAutoCleanup();

    // Set up periodic cleanup every 24 hours (86400000 ms)
    const cleanupInterval = setInterval(runAutoCleanup, 24 * 60 * 60 * 1000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [isAuthenticated, currentPath]);

  // 6. ADMIN ROUTE PROTECTION - Prevent non-admin users from accessing admin panel
  useEffect(() => {
    if (isAuthenticated && currentUser && currentPath === 'admin') {
      const isAdmin = currentUser.email.toLowerCase() === "mohanrajit05@gmail.com";
      if (!isAdmin) {
        setCurrentPath('drive');
        showToast("Access denied. Admin privileges required.", 'error');
      }
    }
  }, [currentPath, isAuthenticated, currentUser]);

  // --- Share Access Logic ---
  const checkSharedFileAccess = async (shareId: string, password?: string) => {
    if (!currentUser) return;

    // Strict Check: If link implies a specific email, enforce it.
    const params = new URLSearchParams(window.location.search);
    const linkEmail = params.get('email');
    
    // Validate email match if present in URL
    if (linkEmail && linkEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      showToast("Access Denied: Account mismatch", 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
      setPendingShareId(null);
      return;
    }

    try {
      // Check if user has permission
      const accessResult = await api.checkFileAccess(shareId, currentUser.email, currentUser.id, password);
      
      if (accessResult.status === 'granted') {
        // Access Granted - Open Logic
        setIsPasswordModalOpen(false);
        setSharePasswordInput('');
        
        let itemFound = false;

        // A. Try as File
        const file = await api.getFileById(shareId);
        if (file) {
          setPreviewFile(file);
          api.markAccessed(file.id); // Track activity
          showToast(`Opened shared file: ${file.name}`, 'success');
          itemFound = true;
        } else {
          // B. Try as Folder if not a file
          const folder = await api.getFolderById(shareId);
          if (folder) {
            api.markAccessed(folder.id); // Track activity
            setCurrentPath('drive');
            setCurrentFolderId(folder.id);
            setBreadcrumbs([{ id: null, name: 'My Drive' }, { id: folder.id, name: folder.name }]);
            showToast(`Opened shared folder: ${folder.name}`, 'success');
            itemFound = true;
          }
        }

        if (!itemFound) {
           showToast("Shared item not found or deleted", 'error');
        }
        
        // Clean up URL on success
        window.history.replaceState({}, document.title, window.location.pathname);
        setPendingShareId(null);

      } else if (accessResult.status === 'password_required') {
        // Prompt for password
        if (password) {
           // Password was provided but rejected (still required)
           showToast("Incorrect password. Please try again.", 'error');
        } else {
           // Initial prompt
           setIsPasswordModalOpen(true);
        }
        // Don't clear pendingShareId yet
      } else if (accessResult.status === 'expired') {
        showToast("This shared link has expired.", 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
        setPendingShareId(null);
      } else {
        // Access Denied
        showToast("Access Denied: You don't have permission.", 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
        setPendingShareId(null);
      }
    } catch (error) {
      showToast("Error accessing shared link", 'error');
      setPendingShareId(null);
    }
  };

  const handleSharePasswordSubmit = () => {
    if (pendingShareId) {
       checkSharedFileAccess(pendingShareId, sharePasswordInput);
    }
  };

  // --- Core Data Fetching (User Scoped) ---
  const fetchContent = async (query?: string) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      if (currentPath === 'admin') {
        // Handled by Admin Component
      } else if (query) {
         // Search mode
         const res = await api.search(query, currentUser.id);
         setFiles(res.files);
         setFolders(res.folders);
      } else {
        const isTrash = currentPath === 'trash';
        
        if (currentPath === 'starred') {
           // Client side filter for starred
           const allFiles = await api.getFiles(currentUser.id, null, false); 
           setFiles(allFiles.filter(f => f.is_starred));
           setFolders([]);
        } else if (currentPath === 'recent') {
           // Fetch recently accessed
           const recentFiles = await api.getRecentFiles(currentUser.id);
           const recentFolders = await api.getRecentFolders(currentUser.id);
           setFiles(recentFiles);
           setFolders(recentFolders);
        } else {
           // Normal Drive View
           const fetchedFiles = await api.getFiles(currentUser.id, currentFolderId, isTrash);
           const fetchedFolders = await api.getFolders(currentUser.id, currentFolderId, isTrash);
           setFiles(fetchedFiles);
           setFolders(fetchedFolders);
        }
      }
    } catch (error) {
      console.error("Failed to load content", error);
      showToast("Failed to load content", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- Toast Helpers ---
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Helper: Validate Email Format ---
  const isValidEmail = (email: string) => {
    // Regex enforces: standard characters @ standard characters . 2-6 letter extension
    // This blocks "user@stuff" (no dot) or "user@.com" or "user@domain.c"
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  };

  // --- Helper: Password Rules ---
  const validatePasswordRules = (pwd: string) => {
      return {
          length: pwd.length >= 8,
          upper: /[A-Z]/.test(pwd),
          lower: /[a-z]/.test(pwd),
          number: /[0-9]/.test(pwd),
          special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
      };
  };

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const user = await api.loginUser(emailInput, passwordInput);
      setCurrentUser(user);
      setIsAuthenticated(true);
      // Persist session
      localStorage.setItem('cloud_drive_current_user', JSON.stringify(user));

      // Admin check: redirect based on email
      const isAdmin = user.email.toLowerCase() === "mohanrajit05@gmail.com";
      setCurrentPath(isAdmin ? 'admin' : 'drive');
      showToast(`Welcome back, ${user.full_name}`, 'success');
    } catch (error: any) {
      showToast(error.message || "Login failed", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Strict Email Validation
    if (!isValidEmail(emailInput)) {
        showToast("Please enter a valid email address (e.g., name@gmail.com)", 'error');
        return;
    }

    // 2. Strict Password Rules
    const rules = validatePasswordRules(passwordInput);
    if (!Object.values(rules).every(Boolean)) {
        showToast("Password does not meet complexity requirements", 'error');
        return;
    }

    setAuthLoading(true);
    try {
      await api.registerUser(emailInput, passwordInput, fullNameInput);
      showToast("Registration successful! Please sign in.", 'success');
      setAuthMode('login');
      setPasswordInput('');
    } catch (err: any) {
      showToast(err.message || "Registration failed", 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!emailInput) {
        showToast("Please enter your email address", 'error');
        return;
     }
     setAuthLoading(true);
     try {
        await api.verifyUserExists(emailInput);
        setIsEmailVerified(true);
        showToast("Email verified! Please enter your new password.", 'success');
     } catch(err: any) {
        showToast(err.message || "Email not found", 'error');
     } finally {
        setAuthLoading(false);
     }
  };

  const handlePasswordResetConfirm = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const rules = validatePasswordRules(passwordInput);
      const allValid = Object.values(rules).every(Boolean);

      if (!allValid) {
          showToast("Password does not meet requirements", 'error');
          return;
      }

      if (passwordInput !== confirmPassword) {
          showToast("Passwords do not match", 'error');
          return;
      }

      setAuthLoading(true);
      try {
          await api.updatePassword(emailInput, passwordInput);
          showToast("Password updated successfully! Please login.", 'success');
          setAuthMode('login');
          setPasswordInput('');
          setConfirmPassword('');
          setIsEmailVerified(false); // Reset this for next time
      } catch (err: any) {
          showToast(err.message || "Failed to update password", 'error');
      } finally {
          setAuthLoading(false);
      }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The auth state change listener will handle the UI updates
  };

  // --- Action Handlers (Real-Time Simulation) ---
  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (path === 'drive') {
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: 'My Drive' }]);
    }
  };

  const handleFolderClick = (folderId: string) => {
    // 1. Mark as accessed
    api.markAccessed(folderId);

    // 2. Navigate
    const folder = folders.find(f => f.id === folderId);
    
    if (folder) {
      setCurrentPath('drive'); // Switch to main drive view to see content
      setCurrentFolderId(folderId);
      setBreadcrumbs([{ id: null, name: 'My Drive' }, { id: folder.id, name: folder.name }]);
    } else {
       // Fallback
       api.getFolderById(folderId).then(f => {
         if (f) {
           setCurrentPath('drive');
           setCurrentFolderId(folderId);
           setBreadcrumbs([{ id: null, name: 'My Drive' }, { id: f.id, name: f.name }]);
         }
       });
    }
  };
  
  const handleFileClick = (file: FileData) => {
    api.markAccessed(file.id);
    // Open preview modal immediately; modal will fetch preview URL if needed
    setPreviewFile(file);
    api.getPreviewUrl(file.id)
      .then((url) => {
        setPreviewFile((prev) => (prev && prev.id === file.id ? ({ ...prev, previewUrl: url } as FileData) : prev));
      })
      .catch((err) => {
        console.error('Failed to get preview URL', err);
      });
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleUpload = async (file: File) => {
    console.log('handleUpload called with file:', file.name, file.size, file.type);
    if (!currentUser) {
      console.log('No current user, aborting upload');
      return;
    }
    console.log('Starting upload for user:', currentUser.id);
    setUploadProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null || prev >= 90) return prev;
        return prev + 10;
      });
    }, 100);

    try {
      console.log('Calling api.uploadFile...');
      await api.uploadFile(currentUser.id, file, currentFolderId);
      console.log('Upload completed successfully');
      setUploadProgress(100);
      showToast(`Successfully uploaded ${file.name}`, 'success');

      // Refresh the content to show the uploaded file
      fetchContent();

      setTimeout(() => {
        setUploadProgress(null);
        clearInterval(interval);
      }, 500);
    } catch (err) {
      console.error('Upload failed:', err);
      clearInterval(interval);
      setUploadProgress(null);
      showToast(`Failed to upload ${file.name}`, 'error');
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await api.deleteFile(id);
      if (previewFile?.id === id) setPreviewFile(null);
      showToast("File moved to trash", 'success');
    } catch (err) {
       showToast("Failed to delete file", 'error');
    }
  };
  
  const handleDeleteFolder = async (id: string) => {
    try {
      await api.deleteFolder(id);
      showToast("Folder moved to trash", 'success');
    } catch (err) {
      showToast("Failed to delete folder", 'error');
    }
  }

  const handleBulkDelete = async (fileIds: string[], folderIds: string[]) => {
    try {
      if (fileIds.length > 0) await api.deleteMultipleFiles(fileIds);
      if (folderIds.length > 0) await api.deleteMultipleFolders(folderIds);
      showToast(`Moved items to trash`, 'success');
    } catch (err) {
      showToast("Failed to delete selected items", 'error');
    }
  };

  const handleUpdateFolderColor = async (folderId: string, color: string) => {
    try {
      await api.updateFolderColor(folderId, color);
    } catch (err) {
      showToast("Failed to update folder color", 'error');
    }
  };

  const handleFolderHistory = (folder: FolderData) => {
    setHistoryFolder(folder);
  };

  // --- Login Screen ---
  if (!isAuthenticated || !currentUser) {
    
    // Password Rules Helper for UI
    const passwordRules = validatePasswordRules(passwordInput);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-100 relative overflow-hidden">
          <div className="text-center mb-8">
            <div className="inline-block p-4 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-200">
               <Cloud size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CloudDrive</h1>
            <p className="text-gray-500 mt-2">Secure Cloud Storage for Enterprise</p>
          </div>
          
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
              <h2 className="text-lg font-semibold text-gray-800 text-center mb-1">Welcome Back</h2>
              <p className="text-sm text-gray-500 text-center mb-6">Enter your credentials to access your account</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="user@company.com"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <button 
                        type="button" 
                        onClick={() => { setAuthMode('reset'); setIsEmailVerified(false); setEmailInput(''); }} 
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {authLoading ? 'Authenticating...' : 'Sign In'}
              </button>
              
              <div className="text-center text-sm text-gray-600 mt-6 pt-4 border-t border-gray-100">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setAuthMode('register'); setShowPassword(false); }} className="text-blue-600 hover:text-blue-800 font-bold">
                  Create Account
                </button>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
               <div className="flex items-center gap-2 mb-4">
                <button type="button" onClick={() => { setAuthMode('login'); setShowPassword(false); }} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-full">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">Create Account</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                    />
                     <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                   {/* Password Rules Checklist for Registration */}
                    <div className="mt-3 space-y-1">
                        <div className="grid grid-cols-2 gap-2">
                            <PasswordRule label="8+ Characters" met={passwordRules.length} />
                            <PasswordRule label="1 Uppercase" met={passwordRules.upper} />
                            <PasswordRule label="1 Lowercase" met={passwordRules.lower} />
                            <PasswordRule label="1 Number" met={passwordRules.number} />
                            <PasswordRule label="1 Special Char" met={passwordRules.special} />
                        </div>
                    </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          )}

          {authMode === 'reset' && (
            <div className="animate-in fade-in slide-in-from-right duration-300">
                <div className="flex items-center gap-2 mb-6">
                    <button type="button" onClick={() => { setAuthMode('login'); setIsEmailVerified(false); setEmailInput(''); setPasswordInput(''); setConfirmPassword(''); }} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-full">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-800">
                        Reset Password
                    </h2>
                </div>

                {/* Form to handle both Verification and Reset */}
                <form onSubmit={!isEmailVerified ? handleVerifyEmail : handlePasswordResetConfirm} className="space-y-5">
                    
                    {/* Step 1: Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                        <div className="relative">
                            <Mail className={`absolute left-3 top-2.5 ${isEmailVerified ? 'text-green-500' : 'text-gray-400'}`} size={18} />
                            <input 
                                type="email" 
                                required
                                readOnly={isEmailVerified}
                                autoComplete="off"
                                className={`w-full pl-10 pr-10 py-2.5 rounded-lg border outline-none transition-all
                                   ${isEmailVerified 
                                     ? 'bg-gray-50 border-green-200 text-gray-600 focus:ring-0 cursor-not-allowed' 
                                     : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                   }`}
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                placeholder="user@example.com"
                            />
                            {isEmailVerified && (
                                <div className="absolute right-3 top-2.5 text-green-500 animate-in fade-in zoom-in duration-300">
                                   <ShieldCheck size={18} />
                                </div>
                            )}
                        </div>
                    </div>

                    {!isEmailVerified && (
                         <button 
                            type="submit" 
                            disabled={authLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
                        >
                            {authLoading ? 'Verifying...' : 'Verify Email'}
                        </button>
                    )}

                    {/* Step 2: New Password Inputs (Appear after verification) */}
                    {isEmailVerified && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-5">
                             <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mb-2 flex items-start gap-2">
                                <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
                                <span>Email verified. You can now set a new password.</span>
                             </div>

                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required
                                        autoFocus
                                        autoComplete="new-password"
                                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        placeholder="New Password"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                
                                {/* Password Rules Checklist */}
                                <div className="mt-3 space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">Password must contain:</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <PasswordRule label="8+ Characters" met={passwordRules.length} />
                                        <PasswordRule label="1 Uppercase" met={passwordRules.upper} />
                                        <PasswordRule label="1 Lowercase" met={passwordRules.lower} />
                                        <PasswordRule label="1 Number" met={passwordRules.number} />
                                        <PasswordRule label="1 Special Char" met={passwordRules.special} />
                                    </div>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required
                                        autoComplete="new-password"
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 outline-none transition-all ${
                                            confirmPassword && passwordInput !== confirmPassword 
                                            ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm Password"
                                    />
                                </div>
                                {confirmPassword && passwordInput !== confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle size={12} /> Passwords do not match
                                    </p>
                                )}
                            </div>

                            <button 
                                type="submit" 
                                disabled={authLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 mt-4"
                            >
                                {authLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
          )}

          <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </div>
      </div>
    );
  }

  // --- Main App UI ---
  // Handle upgrade click - navigate to pricing page using router (client-side)
  const handleUpgradeClick = (planId?: string, billing?: 'monthly' | 'annual') => {
    if (upgradeLoading) return; // Prevent multiple clicks

    setUpgradeLoading(true);

    try {
      // Immediate client-side navigation without awaiting async calls
      if (planId) {
        const cycle = billing || 'monthly';
        navigate(`/payment?planId=${encodeURIComponent(planId)}&billingCycle=${encodeURIComponent(cycle)}`);
      } else {
        navigate('/pricing');
      }
    } catch (error) {
      console.error('Failed to navigate to pricing/payment:', error);
      showToast('Failed to load pricing page', 'error');
    } finally {
      // Keep button briefly disabled to prevent double-clicks
      setTimeout(() => setUpgradeLoading(false), 800);
    }
  };

  return (
    <PaymentProvider>
      <Layout
        user={currentUser}
        currentPath={currentPath}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onUpload={handleUpload}
        onCreateFolder={() => setIsFolderModalOpen(true)}
        onSearch={(q) => fetchContent(q)}
        uploadProgress={uploadProgress}
        onUpgradeClick={handleUpgradeClick}
        upgradeLoading={upgradeLoading}
      >
      {/* Breadcrumbs */}
      {currentPath === 'drive' && !loading && (
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 animate-in fade-in slide-in-from-top-2">
           {breadcrumbs.map((item, index) => (
             <React.Fragment key={index}>
               {index > 0 && <span className="text-gray-400">/</span>}
               <button 
                 onClick={() => handleBreadcrumbClick(index)}
                 className={`hover:bg-gray-100 px-2 py-1 rounded transition-colors ${index === breadcrumbs.length - 1 ? 'font-bold text-gray-800' : ''}`}
               >
                 {item.name}
               </button>
             </React.Fragment>
           ))}
        </div>
      )}

      {currentPath === 'admin' && currentUser.email.toLowerCase() === "mohanrajit05@gmail.com" ? (
        <AdminPanel />
      ) : (
        <FileBrowser
          files={files}
          folders={folders}
          viewMode="grid"
          userId={currentUser.id}
          currentFolderId={currentFolderId}
          onFolderClick={handleFolderClick}
          onFileClick={handleFileClick}
          onDeleteFile={handleDeleteFile}
          onDeleteFolder={handleDeleteFolder}
          onRestoreFile={async (id) => { await api.restoreFile(id); fetchContent(); }}
          onRestoreFolder={async (id) => { await api.restoreFolder(id); fetchContent(); }}
          onToggleStar={async (id) => { await api.toggleStar(id); fetchContent(); }}
          onShare={(file) => setShareItem({ id: file.id, name: file.name, type: 'file' })}
          onShareFolder={(folder) => setShareItem({ id: folder.id, name: folder.name, type: 'folder' })}
          onUpdateFolderColor={handleUpdateFolderColor}
          onBulkDelete={handleBulkDelete}
          onCreateFolder={() => setIsFolderModalOpen(true)}
          isCreateFolderOpen={isFolderModalOpen}
          onCloseCreateFolder={() => setIsFolderModalOpen(false)}
          onShowToast={showToast}
          isTrashView={currentPath === 'trash'}
          onFolderHistory={handleFolderHistory}
          onClearTrash={async () => {
            try {
              const result = await api.clearTrash(currentUser.id);
              showToast(`Cleared trash: ${result.deletedFiles} files and ${result.deletedFolders} folders permanently deleted`, 'success');
              fetchContent();
            } catch (error) {
              showToast('Failed to clear trash', 'error');
            }
          }}
        />
      )}

      {/* Modals */}
      {previewFile && (
        <FilePreviewModal 
          file={previewFile} 
          onClose={() => setPreviewFile(null)} 
          onShare={(file) => { setPreviewFile(null); setShareItem({ id: file.id, name: file.name, type: 'file' }); }}
        />
      )}

      {shareItem && (
        <ShareModal 
          isOpen={!!shareItem} 
          onClose={() => setShareItem(null)} 
          item={shareItem} 
          showToast={showToast}
        />
      )}

      {/* Password Prompt Modal for Shared Links */}
      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => { setIsPasswordModalOpen(false); setPendingShareId(null); }}
        title="Password Required"
        maxWidth="max-w-sm"
      >
         <div className="space-y-4">
            <p className="text-sm text-gray-600">This shared item is protected by a password.</p>
            <input 
              type="password"
              placeholder="Enter password"
              value={sharePasswordInput}
              onChange={(e) => setSharePasswordInput(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button 
              onClick={handleSharePasswordSubmit}
              className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700"
            >
              Access File
            </button>
         </div>
      </Modal>

      {/* Folder History Modal */}
      {historyFolder && (
        <FolderVersionsModal
          isOpen={!!historyFolder}
          folder={historyFolder}
          onClose={() => setHistoryFolder(null)}
        />
      )}

      {/* Upgrade Modal */}
      {upgradeModal?.isOpen && currentUser && (
        <UpgradeModal
          isOpen={upgradeModal.isOpen}
          currentPlan={upgradeModal.currentPlan}
          targetPlan={upgradeModal.targetPlan}
          userId={currentUser.id}
          onClose={() => setUpgradeModal(null)}
          onSuccess={(transactionId: string) => {
            setUpgradeModal(null);
            // Show success screen with transaction details
            setPaymentSuccess({
              planName: upgradeModal.targetPlan.name,
              amount: upgradeModal.targetPlan[upgradeModal.billingCycle === 'annual' ? 'annualPrice' : 'monthlyPrice'],
              billingCycle: upgradeModal.billingCycle || 'monthly',
              transactionId
            });
            // Refresh current user data
            fetchContent();
          }}
          onShowToast={showToast}
        />
      )}

      {/* Payment Success Modal */}
      {paymentSuccess && (
        <PaymentSuccess
          planName={paymentSuccess.planName}
          amount={paymentSuccess.amount}
          billingCycle={paymentSuccess.billingCycle}
          transactionId={paymentSuccess.transactionId}
          onClose={() => setPaymentSuccess(null)}
        />
      )}

      {/* Payment Failure Modal */}
      {paymentFailure && (
        <PaymentFailure
          errorMessage={paymentFailure.errorMessage}
          planName={paymentFailure.planName}
          amount={paymentFailure.amount}
          billingCycle={paymentFailure.billingCycle}
          onClose={() => setPaymentFailure(null)}
          onRetry={() => {
            setPaymentFailure(null);
            // Could trigger retry logic here
            showToast("Please try the upgrade process again", 'error');
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </Layout>
    </PaymentProvider>
  );
};

// Main App component with routing
const AppRouter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get current user from localStorage for pricing page
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const storedUser = localStorage.getItem('cloud_drive_current_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (e) {
        // Handle error
      }
    }
  }, []);

  const handlePricingUpgrade = (currentPlan: StoragePlan, targetPlan: StoragePlan, selectedBillingCycle: 'monthly' | 'annual') => {
    // Navigate to payment page with plan details
    const amount = selectedBillingCycle === 'annual' ? targetPlan.annualPrice : targetPlan.monthlyPrice;
    navigate(`/payment?planId=${targetPlan.id}&billingCycle=${selectedBillingCycle}`);
  };

  const handlePricingNavigate = (path: string) => {
    if (path === 'drive') {
      navigate('/');
    } else {
      navigate(`/${path}`);
    }
  };

  const showPricingToast = (message: string, type: 'success' | 'error') => {
    // Simple toast implementation for pricing page
    alert(`${type.toUpperCase()}: ${message}`);
  };

  return (
    <Routes>
      <Route
        path="/pricing"
        element={
          currentUser ? (
            <PricingPage
              user={currentUser}
              onNavigate={handlePricingNavigate}
              onUpgradeClick={handlePricingUpgrade}
              onShowToast={showPricingToast}
            />
          ) : (
            <div>Redirecting to login...</div>
          )
        }
      />
      <Route
        path="/payment"
        element={<PaymentPage />}
      />
      <Route
        path="/debug"
        element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-100">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Environment Debug</h1>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(
                  {
                    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
                    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        }
      />
      <Route path="/*" element={<AppContent navigate={navigate} />} />
    </Routes>
  );
};

export default AppRouter;
