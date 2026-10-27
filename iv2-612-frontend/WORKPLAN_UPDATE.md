# Workplan Activities - API Integration Update

## Overview
Updated the Workplan Activities page to fetch data from the correct API endpoint and organize activities into tabs by category.

## API Integration

### Endpoint
- **URL**: `/api/v2/workplan/priority-activity-bases/`
- **Method**: GET
- **Authentication**: Required (Token header)
- **Parameters**: None (returns all priority activity bases)

### Hook
```typescript
import { usePriorityActivityBases } from "../../hooks/useProgressDashboard";

const { data: activitiesData, isLoading } = usePriorityActivityBases();
```

### Response Format
```json
[
  {
    "id": 62,
    "category": "worker_voice",
    "description": "Facilitate supplier introductions & kick-off meetings",
    "priority_status": "partial progress",
    "group": {
      "id": 4,
      "name": "1.2",
      "description": "1.2. Operational plans & rollout"
    }
  }
]
```

## Features

### 1. Tab Navigation (4 tabs)
- **Worker Voice** - Activities for Area 1
- **Labor Recruitment** - Activities for Area 2  
- **Working Conditions** - Activities for Area 3
- **Trainings** - Training sessions list

### 2. Smart Features
- ✅ Activity count badges on each tab
- ✅ Loading spinner while fetching
- ✅ Activities grouped by group.id and group.name
- ✅ Section titles from group.description
- ✅ Status mapping (API → Component format)
- ✅ Sorted by group name (1.1, 1.2, 2.1, etc.)

### 3. Status Mapping
| API Status | Component Status |
|-----------|------------------|
| `completed` | `completed` |
| `completed/ongoing` | `completed` |
| `not started` | `not-initiated` |
| `not yet initiated` | `not-initiated` |
| `partial` | `partial` |
| `partial progress` | `partial` |

## Data Flow

```
API: /api/v2/workplan/priority-activity-bases/
    ↓
usePriorityActivityBases()
    ↓
Group by category (worker_voice, labour_recruitment, working_conditions)
    ↓
Sort by group.name (1.1, 1.2, 2.1, etc.)
    ↓
Group by group.id and group.name (unique grouping key)
    ↓
Display sections with group.description as title
    ↓
Display in tabs
```

## Component Structure

### Interface
```typescript
interface PriorityActivityBase {
  id: number;
  category: string;
  description: string;
  priority_status: string;
  group: {
    id: number;
    name: string;
    description: string;
  };
}
```

### Usage
```typescript
<WorkplanActivities />
// No props required - fetches all data from API
```

## Service Layer

### Service Function
```typescript
// src/services/progressDashboardService.ts
export const getPriorityActivityBases = async () => {
  const response = await axios.get(
    `${API_BASE_URL}/workplan/priority-activity-bases/`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};
```

### Hook
```typescript
// src/hooks/useProgressDashboard.ts
export const usePriorityActivityBases = () => {
  return useQuery({
    queryKey: ["priorityActivityBases"],
    queryFn: () => progressDashboardService.getPriorityActivityBases(),
  });
};
```

## Key Changes from Previous Version

### Before
- ❌ Used `/api/v2/sp_work_plan/?sp=28`
- ❌ Required spId parameter
- ❌ Different data structure with nested priority_activity

### After
- ✅ Uses `/api/v2/workplan/priority-activity-bases/`
- ✅ No parameters required
- ✅ Simpler, flatter data structure
- ✅ Direct access to category, description, status

## Benefits

1. **Simpler API**: No need to pass spId parameter
2. **Cleaner Data**: Flatter structure, easier to work with
3. **Better Performance**: Single endpoint for all activities
4. **Consistent**: Matches backend data model
5. **Maintainable**: Less data transformation needed

## Testing

### Manual Testing Steps
1. Navigate to Workplan Activities page
2. Verify loading spinner appears briefly
3. Check all 4 tabs are visible with correct labels
4. Click each tab and verify activities display
5. Verify activity counts match actual activities
6. Check status badges display correctly
7. Verify activities are grouped by section
8. Confirm activities are sorted by group name

### Expected Results
- Activities load from API
- Tabs show correct activity counts
- Status badges display with correct colors
- Activities grouped logically by section
- No console errors

## Summary

Successfully updated the Workplan Activities component to use the correct API endpoint (`/api/v2/workplan/priority-activity-bases/`). The new implementation:

- ✅ Uses simpler, more direct API endpoint
- ✅ No spId parameter required
- ✅ Cleaner data structure
- ✅ Same great UI with tabs and badges
- ✅ Full TypeScript support
- ✅ React Query caching
- ✅ Loading states
- ✅ Error handling

The component now correctly fetches priority activity bases and organizes them into tabs by category for easy navigation.
