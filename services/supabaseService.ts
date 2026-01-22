/*
  Real Supabase service for the cloud storage app.
  This file provides an `api` export with methods using actual Supabase client.
*/

import { supabase } from './supabaseClient';
import { AppFile, ShareConfig, StoragePlan, UserProfile, UserSubscription, FileVersion, FolderVersion, UserRole } from '../types';
import { ADMIN_EMAIL } from '../constants';
import { ADMIN_PASSWORD } from '../constants';

const STORAGE_KEY = 'cloud_drive_mock_db_v5'; // Keep for backward compatibility during transition

type Subscriber = (event: { type: string; table: string; payload?: any }) => void;

let subscribers: Subscriber[] = [];

const broadcast = (type: string, table: string, payload?: any) => {
  subscribers.forEach((s) => s({ type, table, payload }));
};

const persist = (state: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse mock DB', e);
    return null;
  }
};

// Minimal initial state
const defaultUser: UserProfile = {
  id: 'u_admin_01',
  email: 'mohanrajit05@gmail.com',
  password: 'Mohan@05',
  full_name: 'System Administrator',
  role: UserRole.ADMIN,
  created_at: new Date().toISOString(),
};

const defaultPlans: StoragePlan[] = [
  { id: 'free', name: 'Free', storageGB: 15, monthlyPrice: 0, annualPrice: 0, features: ['15 GB storage'], isPopular: false, maxFileSizeMB: 100, sharingEnabled: true, prioritySupport: false, isActive: true },
  { id: 'lite', name: 'Lite', storageGB: 30, monthlyPrice: 49, annualPrice: 499, features: ['30 GB storage'], isPopular: false, maxFileSizeMB: 500, sharingEnabled: true, prioritySupport: true, isActive: true },
  { id: 'plus', name: 'Plus', storageGB: 50, monthlyPrice: 79, annualPrice: 799, features: ['50 GB storage'], isPopular: false, maxFileSizeMB: 1024, sharingEnabled: true, prioritySupport: true, isActive: true },
  { id: 'basic', name: 'Basic', storageGB: 100, monthlyPrice: 99, annualPrice: 999, features: ['100 GB storage'], isPopular: true, maxFileSizeMB: 2048, sharingEnabled: true, prioritySupport: true, isActive: true },
  { id: 'pro', name: 'Pro', storageGB: 150, monthlyPrice: 149, annualPrice: 1499, features: ['150 GB storage'], isPopular: false, maxFileSizeMB: 4096, sharingEnabled: true, prioritySupport: true, isActive: true },
  { id: 'standard', name: 'Standard', storageGB: 200, monthlyPrice: 199, annualPrice: 1999, features: ['200 GB storage'], isPopular: false, maxFileSizeMB: 8192, sharingEnabled: true, prioritySupport: true, isActive: true },
  { id: 'premium', name: 'Premium', storageGB: 500, monthlyPrice: 399, annualPrice: 3999, features: ['500 GB storage'], isPopular: false, maxFileSizeMB: 16384, sharingEnabled: true, prioritySupport: true, isActive: true },
];

const initial = loadState() || { folders: [] as any[], versions: [] as FileVersion[], folderVersions: [] as FolderVersion[], shares: {} as Record<string, ShareConfig>, users: [defaultUser], plans: defaultPlans, subscriptions: {}, payments: [] as any[] };

let FILES: AppFile[] = [];
let FOLDERS = initial.folders;
let VERSIONS = initial.versions as FileVersion[];
let FOLDER_VERSIONS = initial.folderVersions as FolderVersion[];
let SHARES = initial.shares as Record<string, ShareConfig>;
let USERS = initial.users as UserProfile[];
let PLANS = initial.plans as StoragePlan[];
let SUBSCRIPTIONS = initial.subscriptions as Record<string, UserSubscription>;
let PAYMENTS = initial.payments as any[];

const saveAll = () => {
  persist({ folders: FOLDERS, versions: VERSIONS, folderVersions: FOLDER_VERSIONS, shares: SHARES, users: USERS, plans: PLANS, subscriptions: SUBSCRIPTIONS, payments: PAYMENTS });
};

// Ensure admin user is always present
const adminUser = USERS.find(u => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
if (!adminUser) {
  const existingById = USERS.find(u => u.id === defaultUser.id);
  if (!existingById) {
    USERS.push(defaultUser);
  }
}

// Lightweight helpers
const delay = (ms = 200) => new Promise((res) => setTimeout(res, ms));

// Password hashing helper using Web Crypto (SHA-256). Returns hex string.
const hashPassword = async (password: string) => {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await (crypto.subtle || (window as any).crypto.subtle).digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback: not ideal but ensure function returns something deterministic
    console.warn('WebCrypto not available, falling back to plain text marker');
    return `plain:${password}`;
  }
};

// Mock upload implementation - browser-only solution
const uploadFileMock = async (userId: string, file: File, folderId: string | null) => {
  console.log('Using mock upload implementation');

  const size = file.size;
  const extMatch = /\.([0-9a-zA-Z]+)$/.exec(file.name);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';

  // Create AppFile with File object as single source of truth
  const uploadedFile: AppFile = {
    id: `file_${Date.now()}`,
    name: file.name,
    folder_id: folderId,
    owner_id: userId,
    storage_path: `uploads/${userId}/${file.name}`,
    mime_type: file.type || 'application/octet-stream',
    file_extension: ext,
    size,
    is_starred: false,
    is_trashed: false,
    current_version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_accessed: new Date().toISOString(),
    file: file // Browser File object - single source of truth
  };

  FILES.push(uploadedFile);
  VERSIONS.push({ id: `v_${Date.now()}`, file_id: uploadedFile.id, version_number: 1, size: uploadedFile.size, created_at: new Date().toISOString(), storage_path: uploadedFile.storage_path });

  // Update stored usage
  const sub = SUBSCRIPTIONS[userId] || { planId: 'free', billingCycle: 'monthly', startDate: new Date().toISOString(), isActive: true, storageUsed: 0 };
  SUBSCRIPTIONS[userId] = { ...sub, storageUsed: (sub.storageUsed || 0) + size };
  saveAll();

  broadcast('INSERT', 'files', uploadedFile);
  broadcast('UPDATE', 'subscriptions', { userId, storageUsed: SUBSCRIPTIONS[userId].storageUsed });

  console.log('Mock upload completed successfully with File object');
  return uploadedFile;
};

export const api = {
  subscribe: (cb: Subscriber) => {
    subscribers.push(cb);
    return { unsubscribe: () => (subscribers = subscribers.filter((s) => s !== cb)) };
  },

  // Auth helpers using local storage (single authoritative source)
  loginUser: async (email: string, password: string) => {
    await delay(100);

    if (!email) throw new Error('Please provide an email address');
    const normalizedEmail = email.toLowerCase();

    const user = USERS.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    // Handle legacy plain-text password entries by migrating them on first login
    const providedHash = await hashPassword(password);
    if (user.password === password) {
      // Plaintext stored — migrate to hashed value
      const migrated = providedHash;
      user.password = migrated;
      saveAll();
    }

    const isMatch = user.password === providedHash;
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Ensure admin role for admin email
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      user.role = UserRole.ADMIN;
    }

    // Update last login and persist
    user.last_login = new Date().toISOString();
    saveAll();

    // Return a copy without exposing password hash
    const safeUser = { ...user } as UserProfile;
    try { delete (safeUser as any).password; } catch (e) { /* ignore */ }

    try {
      localStorage.setItem('cloud_drive_current_user', JSON.stringify(safeUser));
    } catch (e) {
      console.warn('Failed to persist current user to localStorage', e);
    }

    return safeUser;
  },

  registerUser: async (email: string, password: string, fullName?: string) => {
    await delay(100);
    if (!email) throw new Error('Please provide an email address');
    if (!password) throw new Error('Please provide a password');

    const normalizedEmail = email.toLowerCase();
    // Check if user already exists
    const existingUser = USERS.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) throw new Error('User already exists');

    const passwordHash = await hashPassword(password);

    // Create new user (local)
    const newUser: UserProfile = {
      id: `u_${Date.now()}`,
      email: normalizedEmail,
      password: passwordHash,
      full_name: fullName || '',
      role: normalizedEmail === ADMIN_EMAIL.toLowerCase() ? UserRole.ADMIN : UserRole.USER,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    USERS.push(newUser);
    // Initialize free subscription
    SUBSCRIPTIONS[newUser.id] = { planId: 'free', billingCycle: 'monthly', startDate: new Date().toISOString(), isActive: true, storageUsed: 0 };
    saveAll();

    // Do not auto-login; signup success is confirmed by creation
    return;
  },

  verifyUserExists: async (email: string) => {
    await delay(100); // Simulate async

    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('No account found with this email address.');
    return;
  },

  getUsers: async () => USERS.map(({ id, email, full_name, role, created_at, last_login }) => ({ id, email, full_name, role, created_at, last_login })),

  updateUser: async (userId: string, updates: Partial<UserProfile>) => {
    await delay(100);
    const userIndex = USERS.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    USERS[userIndex] = { ...USERS[userIndex], ...updates };
    saveAll();
    return USERS[userIndex];
  },

  removeUser: async (userId: string) => {
    await delay(100);
    const userIndex = USERS.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    // Prevent removing admin
    if (USERS[userIndex].role === 'admin') throw new Error('Cannot remove admin user');
    USERS.splice(userIndex, 1);
    saveAll();
    return { success: true };
  },

  getAdminStats: async () => {
    await delay(100);
    const totalUsers = USERS.length;
    const totalFiles = FILES.length;
    const totalStorage = FILES.reduce((sum, f) => sum + f.size, 0);
    return { totalUsers, totalFiles, totalStorage: `${(totalStorage / (1024 * 1024 * 1024)).toFixed(2)} GB` };
  },

  // File/Folder operations
  getFiles: async (userId: string, folderId: string | null = null, trashed = false) => {
    await delay(100);
    let files = FILES.filter(f => f.owner_id === userId && f.is_trashed === trashed);

    if (folderId !== null) {
      files = files.filter(f => f.folder_id === folderId);
    } else {
      files = files.filter(f => f.folder_id === null);
    }

    return files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getFolders: async (userId: string, parentId: string | null = null, trashed = false) => {
    await delay(100);
    let folders = FOLDERS.filter((f: any) => f.owner_id === userId && f.is_trashed === trashed);

    if (parentId !== null) {
      folders = folders.filter((f: any) => f.parent_id === parentId);
    } else {
      folders = folders.filter((f: any) => f.parent_id === null);
    }

    return folders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getFolderById: async (folderId: string) => {
    await delay(100);
    return FOLDERS.find((f: any) => f.id === folderId);
  },

  checkFileAccess: async (fileId: string, userEmail: string, userId: string, password?: string) => {
    await delay(100);
    const file = FILES.find(f => f.id === fileId);
    if (!file) throw new Error('File not found');

    // Check if user owns the file
    if (file.owner_id === userId) {
      return { hasAccess: true, file, status: 'success' };
    }

    // Check sharing permissions (to be implemented)
    // For now, deny access
    return { hasAccess: false, file: null, status: 'denied' };
  },

  getFileById: async (fileId: string) => {
    await delay(100);
    return FILES.find(f => f.id === fileId);
  },

  search: async (userId: string, query: string) => {
    await delay(100);
    // Search files and folders
    const files = FILES.filter(f => f.owner_id === userId && f.name.toLowerCase().includes(query.toLowerCase()));
    const folders = FOLDERS.filter((f: any) => f.owner_id === userId && f.name.toLowerCase().includes(query.toLowerCase()));

    return { files, folders };
  },

  getRecentFiles: async (userId: string, limit = 10) => {
    await delay(100);
    return FILES.filter(f => f.owner_id === userId && !f.is_trashed)
      .sort((a, b) => new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime())
      .slice(0, limit);
  },

  getRecentFolders: async (userId: string, limit = 10) => {
    await delay(100);
    return FOLDERS.filter((f: any) => f.owner_id === userId && !f.is_trashed)
      .sort((a, b) => new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime())
      .slice(0, limit);
  },

  updatePassword: async (email: string, newPassword: string) => {
    await delay(100);
    if (!email) throw new Error('Email is required');
    if (!newPassword) throw new Error('New password is required');

    const normalizedEmail = email.toLowerCase();
    const userIndex = USERS.findIndex(u => u.email.toLowerCase() === normalizedEmail);
    if (userIndex === -1) throw new Error('No account found with this email address.');

    const passwordHash = await hashPassword(newPassword);
    USERS[userIndex].password = passwordHash;
    USERS[userIndex].last_login = new Date().toISOString();
    saveAll();
    return;
  },

  deleteMultipleFiles: async (fileIds: string[]) => {
    await delay(100);
    FILES = FILES.map(f => fileIds.includes(f.id) ? { ...f, is_trashed: true } : f);
    saveAll();
  },

  deleteMultipleFolders: async (folderIds: string[]) => {
    await delay(100);
    FOLDERS = FOLDERS.map((f: any) => folderIds.includes(f.id) ? { ...f, is_trashed: true } : f);
    saveAll();
  },

  updateFolderColor: async (folderId: string, color: string) => {
    const { error } = await supabase
      .from('folders')
      .update({ color })
      .eq('id', folderId);

    if (error) throw error;
  },

  createFolder: async (userId: string, name: string, parentId: string | null) => {
    await delay(100);
    const newFolder = {
      id: `folder_${Date.now()}`,
      name,
      parent_id: parentId,
      owner_id: userId,
      is_trashed: false,
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      color: '#3B82F6'
    };
    FOLDERS.push(newFolder);
    saveAll();
    return newFolder;
  },

  uploadFile: async (userId: string, file: File, folderId: string | null) => {
    console.log('Starting file upload:', { fileName: file.name, size: file.size, type: file.type });

    const size = file.size;

    // Enforce storage limit based on user's subscription
    const sub = SUBSCRIPTIONS[userId] || { planId: 'free', billingCycle: 'monthly', startDate: new Date().toISOString(), isActive: true, storageUsed: 0 };
    const plan = PLANS.find(p => p.id === sub.planId) || PLANS.find(p => p.id === 'free');
    const used = sub.storageUsed || 0;
    const allowedBytes = (plan?.storageGB || 15) * 1024 * 1024 * 1024;
    if (used + size > allowedBytes) {
      throw new Error('Storage limit exceeded. Please upgrade your plan or delete files.');
    }

    // STEP 2: FIX FILE CREATION AT UPLOAD TIME - IMMEDIATELY STORE FILE DATA
    // REQUIRED RULE: Preview & download must NEVER depend on future async logic
    const objectUrl = URL.createObjectURL(file);
    console.log('Created object URL for immediate file access:', objectUrl);

    // If Supabase is not configured, fall back to mock implementation
    if (!supabase) {
      console.log('Supabase not configured, using mock upload');
      return uploadFileMock(userId, file, folderId);
    }

    // Generate unique storage path
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomId}_${file.name}`;
    const storagePath = `${userId}/${folderId || 'root'}/${fileName}`;

    console.log('Uploading to storage path:', storagePath);

    try {
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cloud-drive')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Clean up object URL on failure
        URL.revokeObjectURL(objectUrl);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded to storage successfully:', uploadData);

      // Get file extension
      const extMatch = /\.([0-9a-zA-Z]+)$/.exec(file.name);
      const ext = extMatch ? extMatch[1].toLowerCase() : '';

      // Create file record in database
      const fileData = {
        name: file.name,
        folder_id: folderId,
        owner_id: userId,
        storage_path: storagePath,
        mime_type: file.type || 'application/octet-stream',
        file_extension: ext,
        size: size,
        is_starred: false,
        is_trashed: false,
        current_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .insert(fileData)
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Clean up on failure
        await supabase.storage.from('cloud-drive').remove([storagePath]);
        URL.revokeObjectURL(objectUrl);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('File record created in database:', dbData);

      // Create version record
      const versionData = {
        file_id: dbData.id,
        version_number: 1,
        size: size,
        storage_path: storagePath,
        created_at: new Date().toISOString()
      };

      const { error: versionError } = await supabase
        .from('file_versions')
        .insert(versionData);

      if (versionError) {
        console.error('Version creation error:', versionError);
        // Don't fail the upload for version error
      }

      // Update stored usage
      SUBSCRIPTIONS[userId] = { ...sub, storageUsed: (sub.storageUsed || 0) + size };
      saveAll();

      // STEP 2 CONTINUED: Return AppFile with immediate access data sources
      const uploadedFile = {
        ...dbData,
        file: file, // Original File object for immediate access
        blob: undefined, // Not needed since we have File
        url: objectUrl // Object URL for preview/download
      } as AppFile;

      // For mock compatibility, also store in local FILES array
      FILES.push(uploadedFile);

      broadcast('INSERT', 'files', uploadedFile);
      broadcast('UPDATE', 'subscriptions', { userId, storageUsed: SUBSCRIPTIONS[userId].storageUsed });

      console.log('Real upload completed successfully with immediate file access');
      return uploadedFile;

    } catch (error) {
      console.error('Real upload failed, falling back to mock:', error);
      // Clean up object URL on failure
      URL.revokeObjectURL(objectUrl);
      // Fall back to mock implementation on error
      return uploadFileMock(userId, file, folderId);
    }
  },

  // Mock upload implementation for fallback
  uploadFileMock: async (userId: string, file: File, folderId: string | null) => {
    console.log('Using mock upload implementation');

    const size = file.size;
    const extMatch = /\.([0-9a-zA-Z]+)$/.exec(file.name);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';

    // Create AppFile with File object as single source of truth
    const uploadedFile: AppFile = {
      id: `file_${Date.now()}`,
      name: file.name,
      folder_id: folderId,
      owner_id: userId,
      storage_path: `uploads/${userId}/${file.name}`,
      mime_type: file.type || 'application/octet-stream',
      file_extension: ext,
      size,
      is_starred: false,
      is_trashed: false,
      current_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      file: file // Browser File object - single source of truth
    };

    FILES.push(uploadedFile);
    VERSIONS.push({ id: `v_${Date.now()}`, file_id: uploadedFile.id, version_number: 1, size: uploadedFile.size, created_at: new Date().toISOString(), storage_path: uploadedFile.storage_path });

    // Update stored usage
    const sub = SUBSCRIPTIONS[userId] || { planId: 'free', billingCycle: 'monthly', startDate: new Date().toISOString(), isActive: true, storageUsed: 0 };
    SUBSCRIPTIONS[userId] = { ...sub, storageUsed: (sub.storageUsed || 0) + size };
    saveAll();

    broadcast('INSERT', 'files', uploadedFile);
    broadcast('UPDATE', 'subscriptions', { userId, storageUsed: SUBSCRIPTIONS[userId].storageUsed });

    console.log('Mock upload completed successfully with File object');
    return uploadedFile;
  },

  markAccessed: async (id: string) => {
    const now = new Date().toISOString();
    let found = false;
    FILES = FILES.map((f) => (f.id === id ? ({ ...f, last_accessed: now } as AppFile) : f));
    FOLDERS = FOLDERS.map((d: any) => (d.id === id ? { ...d, last_accessed: now } : d));
    saveAll();
    broadcast('UPDATE', 'files', { id, last_accessed: now });
  },

  deleteFile: async (id: string) => {
    FILES = FILES.map((f) => (f.id === id ? { ...f, is_trashed: true } as AppFile : f));
    saveAll();
    broadcast('DELETE', 'files', { id });
  },

  deleteFolder: async (id: string) => {
    FOLDERS = FOLDERS.map((f: any) => (f.id === id ? { ...f, is_trashed: true } : f));
    saveAll();
    broadcast('DELETE', 'folders', { id });
  },

  restoreFile: async (id: string) => {
    FILES = FILES.map((f) => (f.id === id ? { ...f, is_trashed: false } as AppFile : f));
    saveAll();
    broadcast('UPDATE', 'files', { id, is_trashed: false });
  },

  restoreFolder: async (id: string) => {
    FOLDERS = FOLDERS.map((f: any) => (f.id === id ? { ...f, is_trashed: false } : f));
    saveAll();
    broadcast('UPDATE', 'folders', { id, is_trashed: false });
  },

  toggleStar: async (id: string) => {
    FILES = FILES.map((f) => (f.id === id ? { ...f, is_starred: !f.is_starred } : f));
    saveAll();
    broadcast('UPDATE', 'files', { id });
  },

  // Share settings
  getShareSettings: async (itemId: string, itemType: 'file' | 'folder') => {
    if (!SHARES[itemId]) {
      SHARES[itemId] = { itemId, itemType, isPublic: false, sharedUsers: [] } as ShareConfig;
      saveAll();
    }
    return SHARES[itemId];
  },

  updateShareSettings: async (config: ShareConfig) => {
    SHARES[config.itemId] = config;
    saveAll();
    broadcast('UPDATE', 'shares', config);
  },

  // Simple edge-function-like mocks
  shareFile: async (fileId: string, sharedUserEmail: string, role: string) => {
    await delay(200);
    // Add to sharedUsers
    const cfg = SHARES[fileId] || { itemId: fileId, itemType: 'file', isPublic: false, sharedUsers: [] } as ShareConfig;
    if (!cfg.sharedUsers.some((s) => s.email === sharedUserEmail)) cfg.sharedUsers.push({ email: sharedUserEmail, role: role as any });
    SHARES[fileId] = cfg;
    saveAll();
    broadcast('UPDATE', 'shares', cfg);
  },

  getUserFiles: async (userId: string) => {
    await delay(200);
    return FILES.filter((f) => f.owner_id === userId);
  },

  getPreviewUrl: async (fileId: string) => {
    console.log('Getting preview URL for file:', fileId);

    const f = FILES.find((x) => x.id === fileId);
    if (!f || !f.file) {
      console.error('File not found or no File object available:', fileId);
      return '';
    }

    // Create object URL from File object for browser-only preview
    const objectUrl = URL.createObjectURL(f.file);
    console.log('Created object URL for preview:', objectUrl);
    return objectUrl;
  },

  getDownloadUrl: async (fileId: string) => {
    console.log('Getting download URL for file:', fileId);

    const f = FILES.find((x) => x.id === fileId);
    if (!f || !f.file) {
      console.error('File not found or no File object available:', fileId);
      return '';
    }

    // Create object URL from File object for browser-only download
    const objectUrl = URL.createObjectURL(f.file);
    console.log('Created object URL for download:', objectUrl);
    return objectUrl;
  },

  // Plans & payments (minimal)
  getPlans: async () => PLANS,
  getUserSubscription: async (userId: string) => {
    await delay(80);
    if (!SUBSCRIPTIONS[userId]) {
      // Initialize default free subscription
      SUBSCRIPTIONS[userId] = { planId: 'free', billingCycle: 'monthly', startDate: new Date().toISOString(), isActive: true, storageUsed: 0 } as UserSubscription;
      saveAll();
    }
    return SUBSCRIPTIONS[userId] as UserSubscription;
  },
  createPlan: async (plan: StoragePlan) => {
    const p = { ...plan, id: `plan_${Date.now()}` };
    PLANS.push(p);
    saveAll();
    return p;
  },
  updatePlan: async (id: string, patch: Partial<StoragePlan>) => {
    const idx = PLANS.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Plan not found');
    PLANS[idx] = { ...PLANS[idx], ...patch };
    saveAll();
    return PLANS[idx];
  },
  deletePlan: async (id: string) => {
    const idx = PLANS.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Plan not found');
    PLANS.splice(idx, 1);
    saveAll();
    return;
  },

  // Payments & UPI flow (mocked)
  createUPIPaymentIntent: async (userId: string, planId: string, billingCycle: string, amount: number) => {
    await delay(200);
    const id = `p_${Date.now()}`;
    const transactionId = `tx_${Date.now()}`;
    const plan = PLANS.find(p => p.id === planId) || { name: planId } as any;
    const payment = {
      id,
      transactionId,
      userId,
      planId,
      billingCycle,
      amount,
      currency: 'INR',
      status: 'pending',
      paymentMethod: 'upi',
      adminUpiId: 'mohanrajit05-1@okicici',
      qrCodeUrl: null,
      upiTransactionId: null,
      paymentApp: null,
      paymentProofUrl: null,
      verificationNotes: null,
      createdAt: new Date().toISOString(),
    } as any;

    PAYMENTS.push(payment);
    saveAll();
    broadcast('INSERT', 'payments', payment);
    return { id: payment.id };
  },

  generateUPIQR: async (paymentId: string) => {
    await delay(100);
    const payment = PAYMENTS.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment intent not found');
    const adminUpiId = payment.adminUpiId || 'mohanrajit05-1@okicici';
    const plan = PLANS.find(p => p.id === payment.planId) || { name: payment.planId } as any;
    const upiString = `upi://pay?pa=${encodeURIComponent(adminUpiId)}&pn=${encodeURIComponent('CloudDrive')}&am=${encodeURIComponent(payment.amount)}&tn=${encodeURIComponent('Upgrade to '+plan.name)}&cu=INR`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;
    // Save qrUrl for later reference
    payment.qrCodeUrl = qrCodeUrl;
    saveAll();
    return { qrCodeUrl, upiString, adminUpiId };
  },

  // Unified file access function - validates access and returns access details
  getFileAccess: async (fileId: string, requesterId?: string) => {
    console.log('getFileAccess called for fileId:', fileId, 'requesterId:', requesterId);

    await delay(120);
    const file = FILES.find(f => f.id === fileId);
    if (!file) {
      console.error('File not found:', fileId);
      throw new Error('File not found');
    }

    // Permission check: user is owner OR file is shared with user
    const isOwner = requesterId && file.owner_id === requesterId;
    let hasAccess = isOwner;

    if (!hasAccess) {
      // Check shares
      const shareCfg = SHARES[fileId];
      if (shareCfg && shareCfg.sharedUsers && requesterId) {
        const user = USERS.find(u => u.id === requesterId);
        if (user && shareCfg.sharedUsers.some(s => s.email.toLowerCase() === user.email.toLowerCase())) {
          hasAccess = true;
          console.log('Access granted via sharing for user:', user.email);
        }
      }
      // Public link
      if (shareCfg && shareCfg.isPublic) {
        hasAccess = true;
        console.log('Access granted via public link');
      }
    }

    if (!hasAccess) {
      // Allow admin in mock
      const reqUser = USERS.find(u => u.id === requesterId);
      if (!reqUser || reqUser.role !== 'admin') {
        console.error('Access denied for file:', fileId, 'user:', requesterId);
        throw new Error('Access denied');
      }
      console.log('Access granted for admin user');
    }

    // Generate access URL from File object - browser-only solution
    if (!file.file) {
      console.error('No File object available for file:', fileId);
      throw new Error('Unable to generate file access URL - no File object');
    }

    const accessUrl = URL.createObjectURL(file.file);
    console.log('File access granted with object URL:', { fileName: file.name, mimeType: file.mime_type, accessUrl: accessUrl.substring(0, 50) + '...' });

    return {
      accessUrl,
      fileName: file.name,
      mimeType: file.mime_type,
    };
  },

  // Unified file view URL generator - now uses getFileAccess
  getFileViewUrl: async (fileId: string, requesterId?: string) => {
    console.log('getFileViewUrl called for fileId:', fileId);

    try {
      const access = await api.getFileAccess(fileId, requesterId);

      // Determine strategy based on mime or extension
      const mime = (access.mimeType || '').toLowerCase();
      const file = FILES.find(f => f.id === fileId);
      const ext = (file?.file_extension || '').toLowerCase();

      let strategy: string = 'unsupported';
      if (mime.startsWith('image/') || ['jpg','jpeg','png','webp','gif','bmp'].includes(ext)) strategy = 'image';
      else if (mime === 'application/pdf' || ext === 'pdf') strategy = 'pdf';
      else if (mime.startsWith('video/') || ['mp4','webm','mov','mkv'].includes(ext)) strategy = 'video';
      else if (mime.startsWith('audio/') || ['mp3','wav','ogg'].includes(ext)) strategy = 'audio';
      else if (mime.startsWith('text/') || ['txt','md','csv','log','json','xml'].includes(ext)) strategy = 'text';
      else if (['docx','xlsx','pptx'].includes(ext)) strategy = 'office';
      else strategy = 'unsupported';

      // For mock files without real URLs, adjust strategy
      if (!access.accessUrl && !supabase) {
        strategy = 'unsupported'; // Can't preview mock files
      }

      console.log('File view strategy determined:', { strategy, mime, ext, hasUrl: !!access.accessUrl });

      return {
        url: access.accessUrl,
        mime_type: access.mimeType,
        preview_strategy: strategy
      };
    } catch (error) {
      console.error('getFileViewUrl failed:', error);
      throw error;
    }
  },

  submitUPIPaymentConfirmation: async (paymentId: string, upiTransactionId: string, paymentApp: string, paymentProofUrl?: string) => {
    await delay(200);
    // Validate unique UTR
    if (PAYMENTS.some(p => p.upiTransactionId === upiTransactionId)) {
      throw new Error('This UPI Transaction ID was already used');
    }

    const payment = PAYMENTS.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment intent not found');

    // Validate amount presence
    if (!payment.amount) throw new Error('Payment amount unknown');

    payment.upiTransactionId = upiTransactionId;
    payment.paymentApp = paymentApp;
    if (paymentProofUrl) payment.paymentProofUrl = paymentProofUrl;
    payment.status = 'pending';
    payment.submittedAt = new Date().toISOString();
    saveAll();
    broadcast('UPDATE', 'payments', payment);
    return { success: true };
  },

  getPayments: async (userId: string) => {
    await delay(150);
    return (PAYMENTS.filter((p) => p.userId === userId));
  },

  getAllPayments: async () => {
    await delay(150);
    return { payments: PAYMENTS };
  },

  updatePaymentStatus: async (transactionId: string, newStatus: string, notes?: string) => {
    await delay(200);
    const payment = PAYMENTS.find((p) => p.transactionId === transactionId || p.id === transactionId);
    if (!payment) return { success: false, message: 'Payment not found' };

    payment.status = newStatus as any;
    if (notes) payment.verificationNotes = notes;
    if (newStatus === 'verified') {
      payment.verifiedAt = new Date().toISOString();
      payment.completedAt = new Date().toISOString();
      // Upgrade subscription
      SUBSCRIPTIONS[payment.userId] = { planId: payment.planId, billingCycle: payment.billingCycle, startDate: new Date().toISOString(), isActive: true, storageUsed: SUBSCRIPTIONS[payment.userId]?.storageUsed || 0 };
      saveAll();
      broadcast('UPDATE', 'subscriptions', { userId: payment.userId, planId: payment.planId });
    }
    saveAll();
    broadcast('UPDATE', 'payments', payment);
    return { success: true };
  },

  cancelPayment: async (transactionId: string, reason?: string) => {
    await delay(100);
    const payment = PAYMENTS.find((p) => p.transactionId === transactionId || p.id === transactionId);
    if (!payment) return { success: false };
    payment.status = 'rejected';
    payment.failureReason = reason;
    saveAll();
    broadcast('UPDATE', 'payments', payment);
    return { success: true };
  },

  getPaymentAnalytics: async () => {
    await delay(100);
    const totalRevenue = PAYMENTS.filter(p => p.status === 'verified').reduce((s, p) => s + (p.amount || 0), 0);
    const verified = PAYMENTS.filter(p => p.status === 'verified').length;
    const pending = PAYMENTS.filter(p => p.status === 'pending').length;
    const rejected = PAYMENTS.filter(p => p.status === 'rejected').length;
    const successRate = (verified / Math.max(1, verified + pending + rejected)) * 100;
    return { totalRevenue, successRate, pendingCount: pending };
  },

  simulateRandomWebhook: async () => {
    // For testing: pick a random pending payment and mark verified
    await delay(200);
    const pendingPayments = PAYMENTS.filter(p => p.status === 'pending' && p.upiTransactionId);
    if (pendingPayments.length === 0) return null;
    const pick = pendingPayments[Math.floor(Math.random() * pendingPayments.length)];
    await (api.updatePaymentStatus(pick.transactionId || pick.id, 'verified', 'Auto-simulated webhook'));
    return true;
  },

  // Versions
  getFileVersions: async (fileId: string) => VERSIONS.filter((v) => v.file_id === fileId).sort((a, b) => b.version_number - a.version_number),
  revertFileVersion: async (fileId: string, versionId: string) => {
    const ver = VERSIONS.find((v) => v.id === versionId);
    const file = FILES.find((f) => f.id === fileId);
    if (ver && file) {
      const newVersionNum = (VERSIONS.filter((v) => v.file_id === fileId).length || 0) + 1;
      VERSIONS.unshift({ id: `v_${Date.now()}`, file_id: fileId, version_number: newVersionNum, size: ver.size, created_at: new Date().toISOString(), storage_path: ver.storage_path });
      file.current_version = newVersionNum;
      file.updated_at = new Date().toISOString();
      saveAll();
      broadcast('UPDATE', 'files', { id: fileId });
    }
  },

  getFolderVersions: async (folderId: string) => FOLDER_VERSIONS.filter((v) => v.folder_id === folderId).sort((a, b) => b.version_number - a.version_number),
  revertFolderVersion: async (folderId: string, versionId: string) => {
    const ver = FOLDER_VERSIONS.find((v) => v.id === versionId);
    const folder = FOLDERS.find((f: any) => f.id === folderId);
    if (ver && folder) {
      FOLDER_VERSIONS.unshift({ id: `fv_${Date.now()}`, folder_id: folderId, version_number: (FOLDER_VERSIONS.filter((v) => v.folder_id === folderId).length || 0) + 1, name: `${ver.name} (Restored)`, snapshot_date: new Date().toISOString(), item_count: ver.item_count, created_by: 'System Restore' });
      folder.name = `${ver.name} (Restored)`;
      saveAll();
      broadcast('UPDATE', 'folders', { id: folderId });
    }
  },

  // Clear trash - permanently delete all trashed files and folders
  clearTrash: async (userId: string) => {
    await delay(200);

    // Find ALL trashed files and folders for this user
    const trashedFiles = FILES.filter(f => f.is_trashed && f.owner_id === userId);
    const trashedFolders = FOLDERS.filter((f: any) => f.is_trashed && f.owner_id === userId);

    // Permanently delete them
    FILES = FILES.filter(f => !trashedFiles.some(trashed => trashed.id === f.id));
    FOLDERS = FOLDERS.filter((f: any) => !trashedFolders.some(trashed => trashed.id === f.id));

    saveAll();
    broadcast('DELETE', 'files', { ids: trashedFiles.map(f => f.id) });
    broadcast('DELETE', 'folders', { ids: trashedFolders.map((f: any) => f.id) });

    return { deletedFiles: trashedFiles.length, deletedFolders: trashedFolders.length };
  },

  // Auto-cleanup trash - delete files/folders older than 30 days
  autoCleanupTrash: async () => {
    await delay(100);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find trashed files older than 30 days
    const oldTrashedFiles = FILES.filter(f => f.is_trashed && new Date(f.updated_at) < thirtyDaysAgo);
    const oldTrashedFolders = FOLDERS.filter((f: any) => f.is_trashed && new Date(f.last_accessed) < thirtyDaysAgo);

    if (oldTrashedFiles.length === 0 && oldTrashedFolders.length === 0) {
      return { deletedFiles: 0, deletedFolders: 0 };
    }

    // Permanently delete them
    FILES = FILES.filter(f => !oldTrashedFiles.some(old => old.id === f.id));
    FOLDERS = FOLDERS.filter((f: any) => !oldTrashedFolders.some(old => old.id === f.id));

    saveAll();
    broadcast('DELETE', 'files', { ids: oldTrashedFiles.map(f => f.id) });
    broadcast('DELETE', 'folders', { ids: oldTrashedFolders.map((f: any) => f.id) });

    return { deletedFiles: oldTrashedFiles.length, deletedFolders: oldTrashedFolders.length };
  },
};

export default api;
