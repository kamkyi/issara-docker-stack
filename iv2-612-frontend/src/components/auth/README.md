# Auth Components

This directory contains authentication and authorization components for the application.

## Components

### UnauthorizedAccess

A component that displays an unauthorized access message with options to navigate to public areas.

**Props:**
- `message?: string` - Custom message to display (default: "Your account has not been verified...")
- `showContactInfo?: boolean` - Whether to show contact information (default: true)

**Usage:**
```tsx
import { UnauthorizedAccess } from '$src/components/auth';

// Default usage
<UnauthorizedAccess />

// Custom message
<UnauthorizedAccess 
  message="You don't have permission to access this feature."
  showContactInfo={false}
/>
```

### AuthGuard

A wrapper component that conditionally renders children based on authentication and authorization status.

**Props:**
- `children: React.ReactNode` - Content to render when authorized
- `allowedGroups?: string[]` - Array of allowed user groups (default: [])
- `fallback?: React.ReactNode` - Custom component to show when unauthorized
- `requireAuth?: boolean` - Whether authentication is required (default: true)

**Usage:**
```tsx
import { AuthGuard } from '$src/components/auth';

// Require authentication only
<AuthGuard>
  <ProtectedContent />
</AuthGuard>

// Require specific groups
<AuthGuard allowedGroups={['admin', 'manager']}>
  <AdminContent />
</AuthGuard>

// Custom fallback
<AuthGuard 
  allowedGroups={['premium']} 
  fallback={<div>Upgrade to premium to access this feature</div>}
>
  <PremiumFeature />
</AuthGuard>
```

## Route Integration

The `/unauthorized` route is automatically available and will display the UnauthorizedAccess component.

## Auth Guard Functions

The auth guard functions in `src/utils/auth.ts` now redirect to `/unauthorized` instead of `/page-not-found` when authorization fails.