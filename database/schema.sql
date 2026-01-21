-- Payment Intents Table
-- Stores payment intent records for idempotent payment processing
CREATE TABLE IF NOT EXISTS payment_intents (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_id VARCHAR(255) NOT NULL,
    billing_cycle ENUM('monthly', 'annual') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('idle', 'creating_intent', 'processing', 'verifying', 'completed', 'failed', 'cancelled') DEFAULT 'idle',
    transaction_id VARCHAR(255),
    gateway_session_id VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,

    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_idempotency_key (idempotency_key),
    INDEX idx_expires_at (expires_at)
);

-- Payments Table
-- Stores completed payment records
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_id VARCHAR(255) NOT NULL,
    billing_cycle ENUM('monthly', 'annual') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status ENUM('pending', 'verified', 'rejected', 'refunded') DEFAULT 'pending',
    payment_method ENUM('upi') DEFAULT 'upi',
    transaction_id VARCHAR(255) UNIQUE,
    upi_transaction_id VARCHAR(255), -- UTR (Unique Transaction Reference)
    payment_app ENUM('gpay', 'phonepe', 'paytm', 'amazonpay', 'bhim', 'other') NULL,
    qr_code_url VARCHAR(500), -- URL to generated QR code
    admin_upi_id VARCHAR(255), -- Fixed admin UPI ID
    payment_proof_url VARCHAR(500) NULL, -- Optional screenshot upload
    verification_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    verified_at TIMESTAMP NULL,
    failure_reason TEXT,

    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_upi_transaction_id (upi_transaction_id),
    INDEX idx_created_at (created_at)
);

-- Plans Table
-- Stores available storage plans
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    storage_gb INTEGER NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL,
    annual_price DECIMAL(10,2) NOT NULL,
    features JSON NOT NULL, -- Array of feature strings
    is_popular BOOLEAN DEFAULT FALSE,
    max_file_size_mb INTEGER NOT NULL,
    sharing_enabled BOOLEAN DEFAULT TRUE,
    priority_support BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for performance
    INDEX idx_is_active (is_active),
    INDEX idx_is_popular (is_popular)
);

-- User Plans/Subscriptions Table
-- Stores user subscription information
CREATE TABLE IF NOT EXISTS user_plans (
    user_id INTEGER PRIMARY KEY,
    plan_id VARCHAR(255) NOT NULL,
    billing_cycle ENUM('monthly', 'annual') NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NULL, -- For annual plans
    is_active BOOLEAN DEFAULT TRUE,
    storage_used BIGINT DEFAULT 0, -- in bytes
    last_payment_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id),

    -- Indexes for performance
    INDEX idx_plan_id (plan_id),
    INDEX idx_is_active (is_active),
    INDEX idx_end_date (end_date)
);

-- Password Reset OTPs Table
-- Stores OTPs for password reset functionality
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL, -- Hashed OTP for security
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempt_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_expires_at (expires_at),
    INDEX idx_used (used)
);

-- Users table (if not exists) - for reference
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,

    -- Indexes
    INDEX idx_email (email)
);

-- Sessions table for tracking user sessions (for invalidation after password reset)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_expires_at (expires_at)
);
