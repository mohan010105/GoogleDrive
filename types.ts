

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export interface UserProfile {
  id: string;
  email: string;
  password?: string; // Added for local auth
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
}

// STRICT FILE MODEL - MANDATORY FOR ALL FILE OPERATIONS
export type AppFile = {
  id: string;
  name: string;
  folder_id: string | null;
  owner_id: string;
  storage_path: string;
  mime_type: string;
  file_extension?: string;
  size: number;
  is_starred: boolean;
  is_trashed: boolean;
  current_version: number;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  // FILE DATA SOURCE - SINGLE SOURCE OF TRUTH
  file: File;        // browser File object - always present
};

// LEGACY TYPE - DEPRECATED, USE AppFile INSTEAD
export interface FileData {
  id: string;
  name: string;
  folder_id: string | null;
  owner_id: string;
  storage_path: string;
  mime_type: string;
  file_extension?: string;
  size: number;
  is_starred: boolean;
  is_trashed: boolean;
  current_version: number;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  previewUrl?: string; // Added for viewing actual uploaded content
  file?: File; // Store the actual File object for frontend-only operations
}

export interface FolderData {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  is_trashed: boolean;
  created_at: string;
  color?: string; // Hex color code for folder customization
  last_accessed?: string;
}

export interface Breadcrumb {
  id: string | null;
  name: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  size: number;
  created_at: string;
  storage_path: string;
}

export interface FolderVersion {
  id: string;
  folder_id: string;
  version_number: number;
  name: string;
  snapshot_date: string;
  item_count: number;
  created_by?: string;
}

export type AccessRole = 'viewer' | 'editor';

export interface SharedUser {
  email: string;
  role: AccessRole;
  avatar?: string;
}

export interface ShareConfig {
  itemId: string;
  itemType: 'file' | 'folder';
  isPublic: boolean;
  publicLink?: string;
  passwordProtected?: boolean;
  password?: string;
  expiryDate?: string | null;
  sharedUsers: SharedUser[];
}

// Storage Plans & Billing Types
export interface StoragePlan {
  id: string;
  name: string;
  storageGB: number;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  isPopular?: boolean;
  maxFileSizeMB: number;
  sharingEnabled: boolean;
  prioritySupport: boolean;
  isActive: boolean;
}

export type BillingCycle = 'monthly' | 'annual';

export interface UserSubscription {
  planId: string;
  billingCycle: BillingCycle;
  startDate: string;
  endDate?: string; // For annual plans
  isActive: boolean;
  storageUsed: number; // in bytes
  lastPaymentDate?: string;
}

export interface UpgradeRequest {
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
}

// Payment & Plan Feature Types
export interface Payment {
  id: string;
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: 'pending' | 'verified' | 'rejected' | 'refunded';
  paymentMethod: 'upi';
  transactionId?: string;
  upiTransactionId?: string; // UTR (Unique Transaction Reference)
  paymentApp?: 'gpay' | 'phonepe' | 'paytm' | 'amazonpay' | 'bhim' | 'other';
  qrCodeUrl?: string;
  adminUpiId?: string;
  paymentProofUrl?: string;
  verificationNotes?: string;
  createdAt: string;
  completedAt?: string;
  verifiedAt?: string;
  failureReason?: string;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  category: 'storage' | 'sharing' | 'security' | 'support' | 'collaboration';
  isEnabled: boolean;
  limit?: number; // For features with limits (e.g., max file size, max users)
  unit?: string; // Unit for the limit (e.g., 'MB', 'users', 'days')
}

// Password Reset OTP Types
export interface PasswordResetOTP {
  id: string;
  email: string;
  otpHash: string;
  expiresAt: string;
  used: boolean;
  attemptCount: number;
  createdAt: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface OTPVerificationRequest {
  email: string;
  otp: string;
}

export interface PasswordResetRequestData {
  email: string;
  newPassword: string;
  confirmPassword: string;
  resetToken: string;
}

export interface PasswordResetSession {
  email: string;
  resetToken: string;
  expiresAt: string;
  createdAt: string;
}

// STEP 1: SINGLE SOURCE OF TRUTH - MANDATORY FOR ALL FILE OPERATIONS
// The only valid file object is the browser File object from <input type="file">.
// Everything else is invalid and must be removed.
type ActiveFile = File | null;

// Payment Flow Types
export type PaymentStatus = 'idle' | 'creating_intent' | 'processing' | 'verifying' | 'completed' | 'failed' | 'cancelled';

export interface PaymentIntent {
  id: string;
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionId?: string;
  gatewaySessionId?: string;
  createdAt: string;
  expiresAt: string;
  idempotencyKey: string;
}

export interface PaymentContextType {
  currentIntent: PaymentIntent | null;
  status: PaymentStatus;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  createPaymentIntent: (userId: string, planId: string, billingCycle: BillingCycle, amount: number) => Promise<PaymentIntent>;
  processPayment: (intentId: string, paymentMethod: Payment['paymentMethod']) => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  retryPayment: (intentId: string, paymentMethod: Payment['paymentMethod']) => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  verifyPayment: (transactionId: string) => Promise<{ verified: boolean; error?: string }>;
  upgradePlan: (userId: string, planId: string, billingCycle: BillingCycle, transactionId: string) => Promise<void>;
  resetPayment: () => void;
}
