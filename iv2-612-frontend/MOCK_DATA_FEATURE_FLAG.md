# Mock Data Feature Flag

## Overview
This feature allows you to toggle between using mock data from JSON files and real production/staging data with the Flagsmith `use_mock_data` flag. This is useful for:
- Demo purposes
- Development when APIs are unavailable
- Testing UI without affecting real data
- Showcasing features with consistent sample data

## Setup

### 1. Flagsmith Flag
Mock data is controlled by the `use_mock_data` feature flag in Flagsmith. There is
no environment variable — toggling the flag takes effect without a rebuild.

### 2. Flagsmith Environments
Each environment has its own value for the flag, and the build picks the
environment via `VITE_FLAGSMITH_ENVIRONMENT`:
- `.env` / `.env.local` - Development environment key
- `.env.staging` - Staging environment key
- `.env.production` - Production environment key

## Usage

### For Production/Staging Data (Default)
`use_mock_data` **off** in that Flagsmith environment:
- Fetches data from API endpoints
- Uses real database information
- Displays actual user/supplier data

### For Mock Data
`use_mock_data` **on** in that Flagsmith environment:
- Uses data from JSON files in `src/assets/mock/`
- Skips loading states and data validation
- Displays consistent sample data

Note: internal roles (`org-test-user`, `org-issara-management`,
`org-issara-staff`) always get mock data regardless of the flag - see
`src/utils/config.ts`.

## Implementation Details

### New Utility File
`src/utils/config.ts` provides helper functions:
- `useMockData()` - Returns true if mock data should be used
- `getApiUrl()` - Gets API base URL
- `getApiGatewayUrl()` - Gets API Gateway URL  
- `getCascadeApiUrl()` - Gets Cascade API URL

### Affected Components
Currently implemented in:
- `src/routes/social-responsibility-overview.tsx`

The component conditionally uses:
- `src/assets/mock/our-workplace.json` - Main workplace statistics
- `src/assets/mock/timeliness-remediation.json` - Timeline data

### Data Sources When Using Mock

When mock data is active, the following data comes from mock files:
- **Statistics**: totalWorkers, totalCases, totalResponses, avgClosureTime
- **Demographics**: Gender, nationality, ethnicity distributions  
- **Charts**:
  - Time to closure data
  - Bar chart data (remediation quality)
  - Timeline data (timeliness remediation)
  - Closure distribution with severity

## Development Workflow

### Local Development with Mock Data
1. Copy `.env.example` to `.env.local` and set `VITE_FLAGSMITH_ENVIRONMENT` to the
   development environment key:
   ```bash
   cp .env.example .env.local
   ```

2. Turn `use_mock_data` on in the Flagsmith **development** environment.

3. Reload the app (no rebuild needed; a dev-server restart is only required if you
   changed `VITE_FLAGSMITH_ENVIRONMENT`).

### Testing Both Modes
Toggle `use_mock_data` in the Flagsmith development environment and reload. Or log
in as a non-internal role (supplier / partner) to exercise the live-data path with
the flag off.

## Adding Mock Data to Other Components

To add this feature to other components:

1. Import the utility:
   ```typescript
   import { useMockData } from "$src/utils/config";
   ```

2. Use the flag in your component:
   ```typescript
   function MyComponent() {
     const shouldUseMockData = useMockData();
     
     // Conditionally use mock or real data
     const data = shouldUseMockData 
       ? mockData 
       : apiData;
     
     // Skip loading/error states when using mock data
     if (!shouldUseMockData && (isLoading || error)) {
       return <LoadingOrError />;
     }
     
     return <YourUI data={data} />;
   }
   ```

3. Add mock data files to `src/assets/mock/` as needed

## Mock Data Files

Current mock data files:
- `src/assets/mock/our-workplace.json` - Workplace statistics, demographics, charts
  - **timeToClosureData**: Uses buckets "<1 day", "1-7 days", "8-30 days", "31-90 days", ">90 days" (✅ Fixed)
  - **barChartData**: Remediation quality with Level2/Level3 values
  - **demographicsData**: Gender, nationality, ethnicity distributions
  - **statsData**: Total workers, cases, responses, avg closure time
  - **kpiCategoryData**: Cases by category (Open/Closed)
- `src/assets/mock/timeliness-remediation.json` - Timeline data (30 case records)
  - **quality**: Uses strings "poor", "fair", "good", "very_good", "excellent" (✅ Fixed)
  - **level**: Severity levels (2, 3, or 4)
  - **timeToClose**: Days to close case
  - **issueCategory**: Labor categories
- `src/assets/mock/common-data.ts` - Color palettes and constants

## Data Format Changes Made

### 1. timeToClosureData (our-workplace.json)
**Before:**
```json
[
  { "name": "0-15 days", "value": 15 },
  { "name": "16-30 days", "value": 20 },
  ...
]
```

**After (✅ Fixed):**
```json
[
  { "name": "<1 day", "value": 12 },
  { "name": "1-7 days", "value": 35 },
  { "name": "8-30 days", "value": 48 },
  { "name": "31-90 days", "value": 42 },
  { "name": ">90 days", "value": 19 }
]
```

### 2. quality field (timeliness-remediation.json)
**Before:**
```json
{
  "quality": 3.5
}
```

**After (✅ Fixed):**
```json
{
  "quality": "good"
}
```

**Mapping used:**
- 2.0-2.9 → "fair"
- 3.0-3.9 → "good"
- 4.0+ → "very_good"

All quality values are now one of: "poor", "fair", "good", "very_good", "excellent"

## Notes

- The flag is checked at component level, not globally
- API hooks are still called but their results are ignored when using mock data
- Loading states and error handling are bypassed when using mock data
- Mock data is type-safe and follows the same structure as API responses

## Troubleshooting

### Mock data not working?
1. Check that `use_mock_data` is on in the Flagsmith environment your build points at
2. Confirm `VITE_FLAGSMITH_ENVIRONMENT` is the key you expect (Admin > Settings shows the resolved flag state)
3. Clear browser cache if needed - Flagsmith caches flags client-side

### See unexpected data?
1. Verify which environment file is being used (`.env.local` overrides `.env`)
2. Check the Admin > Settings page for the resolved `Mock Data Mode` state
3. Ensure mock JSON files exist and are properly formatted

## Future Enhancements

Potential improvements:
- Add mock data toggle in UI (for demos)
- Extend to more pages/components
- Add TypeScript types for mock data
- Create mock data generator scripts
- Add E2E tests for both modes
