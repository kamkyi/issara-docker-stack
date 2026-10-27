# Unused Files Analysis

## Potentially Unused Route Files

### 1. Duplicate/Similar Route Files
- `src/routes/wages.tsx` - Large file (1320+ lines) that appears to be a duplicate of labor functionality
- `src/routes/recruitment.tsx` - Large file (1320+ lines) that appears to be a duplicate of recruitment-agencies functionality
- `src/routes/labor.tsx` - Large file with similar functionality to wages.tsx

### 2. Empty/Minimal Route Files
- `src/routes/new-page.tsx` - Contains only "Hello /new-page!" placeholder
- `src/routes/contact.tsx` - Empty route with no component

### 3. Unused Component Files

#### Empty Directories
- `src/components/demo/` - Empty directory
- `src/components/layout/` - Empty directory
- `src/hooks/auth/` - Empty directory

#### Potentially Unused Components
- `src/components/Formsteps.tsx` - Single file, check if imported anywhere
- `src/pages/interactions/InteractionForm.tsx` - Check if used

### 4. Asset Files to Review
- Multiple `.DS_Store` files (should be removed)
- Many progress images (progress_image1.png through progress_image13.png) - check usage
- Various unused banner images and icons

### 5. Unused Mock Data Files
- Check if all JSON files in `src/assets/mock/` are actually used

## Files to Remove Immediately

### System Files
- `src/assets/.DS_Store`
- `src/assets/img/.DS_Store`

### Empty Directories
- `src/components/demo/` (empty)
- `src/components/layout/` (empty) 
- `src/hooks/auth/` (empty)

### Placeholder/Test Files
- `src/routes/new-page.tsx` (placeholder content)
- `src/routes/contact.tsx` (empty route)

## Files Requiring Further Investigation

### Large Duplicate Routes (Need Manual Review)
- `src/routes/wages.tsx` (1320+ lines)
- `src/routes/recruitment.tsx` (1320+ lines)
- `src/routes/labor.tsx` (similar functionality)

These files appear to be duplicates with similar functionality. Need to:
1. Compare with existing routes like recruitment-agencies.tsx
2. Check if they're actually used in navigation
3. Determine if they can be consolidated

### Components to Verify Usage
- `src/components/Formsteps.tsx`
- `src/pages/interactions/InteractionForm.tsx`
- Various chart components in `src/components/charts/`
- Modal components in `src/components/modals/`

## Recommended Cleanup Process

1. **Immediate Removal** - System files and empty directories
2. **Route Analysis** - Check if large duplicate routes are actually used
3. **Component Usage Analysis** - Search for imports of questionable components
4. **Asset Cleanup** - Remove unused images and mock data files
5. **Final Verification** - Test application after removals