# WorkOS Force Sign Out Implementation

## Overview

This implementation adds a "Force Sign Out" feature that completely terminates user sessions by:

1. **Revoking WorkOS sessions** via the WorkOS API
2. **Calling backend logout** with force flag
3. **Clearing all local storage** and session data
4. **Clearing cookies** and browser state
5. **Forcing page reload** to reset application state

## Components

### WorkOS Utilities (`src/utils/workos-utils.ts`)
- `findAndStoreWorkOSSessionId()` - Locates session ID from various storage locations
- `revokeWorkOSSession()` - Calls WorkOS API to revoke session
- `clearWorkOSData()` - Clears all WorkOS-related storage

### AccountNavbar Updates
- Added "Force Sign Out" option to user dropdown
- Comprehensive session termination process
- Fallback error handling

## Environment Variables

Add to your `.env` file:
```
VITE_WORKOS_API_KEY=sk_test_your_workos_api_key_here
```

## Usage

Users can access Force Sign Out from the account dropdown menu. This is useful when:
- Regular sign out fails
- Sessions are stuck or corrupted
- Complete session cleanup is needed
- Multiple device logout is required

## API Integration

The force logout calls:
```
POST https://api.workos.com/user_management/sessions/revoke
Authorization: Bearer {WORKOS_API_KEY}
Content-Type: application/json

{
  "session_id": "session_01E4ZCR3C56J083X43JQXF3JK5"
}
```

## Security Notes

- WorkOS API key should be kept secure
- Force logout clears ALL browser data
- Session revocation is irreversible
- Always redirects to home page after completion