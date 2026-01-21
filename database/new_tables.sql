-- Core Tables for Cloud Drive Application

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#3B82F6',
    is_trashed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Indexes
    INDEX idx_folders_owner_parent (owner_id, parent_id),
    INDEX idx_folders_trashed (is_trashed),
    INDEX idx_folders_last_accessed (last_accessed)
);

-- Enable RLS on folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Folders policies
CREATE POLICY "Users can view own folders" ON folders
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own folders" ON folders
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own folders" ON folders
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own folders" ON folders
    FOR DELETE USING (auth.uid() = owner_id);

-- Files table
CREATE TABLE IF NOT EXISTS files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_extension TEXT,
    size BIGINT NOT NULL,
    is_starred BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE,
    current_version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Indexes
    INDEX idx_files_owner_folder (owner_id, folder_id),
    INDEX idx_files_trashed (is_trashed),
    INDEX idx_files_starred (is_starred),
    INDEX idx_files_last_accessed (last_accessed),
    INDEX idx_files_mime_type (mime_type)
);

-- Enable RLS on files
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Files policies
CREATE POLICY "Users can view own files" ON files
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own files" ON files
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own files" ON files
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own files" ON files
    FOR DELETE USING (auth.uid() = owner_id);

-- File versions table
CREATE TABLE IF NOT EXISTS file_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Indexes
    INDEX idx_file_versions_file_id (file_id),
    UNIQUE (file_id, version_number)
);

-- Enable RLS on file_versions
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;

-- File versions policies
CREATE POLICY "Users can view versions of own files" ON file_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = file_versions.file_id
            AND files.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert versions for own files" ON file_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = file_versions.file_id
            AND files.owner_id = auth.uid()
        )
    );

-- Folder versions table (for versioning folder snapshots)
CREATE TABLE IF NOT EXISTS folder_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    item_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_folder_versions_folder_id (folder_id),
    UNIQUE (folder_id, version_number)
);

-- Enable RLS on folder_versions
ALTER TABLE folder_versions ENABLE ROW LEVEL SECURITY;

-- Folder versions policies
CREATE POLICY "Users can view versions of own folders" ON folder_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM folders
            WHERE folders.id = folder_versions.folder_id
            AND folders.owner_id = auth.uid()
        )
    );

-- Shares table (for sharing files and folders)
CREATE TABLE IF NOT EXISTS shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL, -- Can be file or folder ID
    item_type TEXT CHECK (item_type IN ('file', 'folder')) NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    shared_with_email TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    password_hash TEXT, -- For password-protected shares
    expires_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Indexes
    INDEX idx_shares_item (item_id, item_type),
    INDEX idx_shares_owner (owner_id),
    INDEX idx_shares_shared_with (shared_with_email),
    INDEX idx_shares_expires (expires_at)
);

-- Enable RLS on shares
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- Shares policies
CREATE POLICY "Users can view shares they own or are shared with" ON shares
    FOR SELECT USING (
        auth.uid() = owner_id OR
        (shared_with_email = (SELECT email FROM profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Users can create shares for own items" ON shares
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update shares they own" ON shares
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete shares they own" ON shares
    FOR DELETE USING (auth.uid() = owner_id);

-- Function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
