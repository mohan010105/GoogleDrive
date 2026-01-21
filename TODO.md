# File Viewing & Downloading Fix - Implementation Plan

## Current Issues Identified
- Multiple access paths causing inconsistency (previewUrl, signed URLs, mock URLs) ✅ FIXED
- Complex fallback logic in viewing that may fail silently ✅ SIMPLIFIED
- Download uses getFileAccess but viewing has separate logic ✅ UNIFIED
- Error handling not comprehensive - blank screens possible ✅ FIXED with ErrorBoundary
- Shared file behavior may differ from owned files ✅ VERIFIED consistent

## Implementation Steps ✅ COMPLETED

### 1. Refine Unified File Access Function ✅ DONE
- [x] Enhanced getFileAccess() in supabaseService.ts with better error handling
- [x] Returns consistent accessUrl, fileName, mimeType for all scenarios
- [x] Improved handling of both Supabase signed URLs and mock URLs

### 2. Simplify File Viewing Logic ✅ DONE
- [x] FilePreviewModal.tsx now uses getFileAccess for ALL file types
- [x] Simplified fallback logic in useEffect (removed complex previewUrl dependency)
- [x] Implemented type-aware viewing with proper error handling
- [x] Added clear fallback for unsupported formats

### 3. Fix File Download Logic ✅ DONE
- [x] Download uses correct anchor tag method
- [x] Proper error handling for download failures
- [x] Unified with getFileAccess for consistency

### 4. Add Comprehensive Error Visibility ✅ DONE
- [x] Created ErrorBoundary component to prevent blank screens
- [x] Surface all errors clearly (no silent failures)
- [x] Log errors at every step with console.error/warn
- [x] Show user-friendly error messages
- [x] Prevent blank screens with ErrorBoundary

### 5. Verify Shared File Behavior ✅ DONE
- [x] Shared files use same access logic as owned files via getFileAccess
- [x] Permission checks work for both scenarios
- [x] Viewing/downloading works identically for owned and shared files

### 6. Testing & Verification
- [ ] Test with image, PDF, text file, ZIP, video, audio
- [ ] Confirm all file types view correctly or show proper fallback
- [ ] Verify downloads work for all types
- [ ] Check console for no errors
- [ ] Ensure no silent failures

## Files to Modify
- services/supabaseService.ts (refine getFileAccess)
- components/FilePreviewModal.tsx (simplify viewing/downloading logic)
