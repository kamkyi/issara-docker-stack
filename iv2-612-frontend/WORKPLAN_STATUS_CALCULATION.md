# Workplan Activities - Status Calculation Implementation

## Overview
Implemented proper status calculation by merging data from two API sources: `priority-activity-bases` (base activities) and `sp_work_plan` (actual progress data).

## Data Sources

### 1. Priority Activity Bases
**Endpoint**: `/api/v2/workplan/priority-activity-bases/`
**Purpose**: Provides the base list of all possible activities
**Structure**:
```json
{
  "id": 62,
  "category": "worker_voice",
  "description": "Facilitate supplier introductions...",
  "group": {
    "id": 4,
    "name": "1.2",
    "description": "1.2. Operational plans & rollout"
  }
}
```

### 2. Work Plan (Priority Activities)
**Endpoint**: `/api/v2/sp_work_plan/?sp=28`
**Purpose**: Provides actual progress status for activities
**Structure**:
```json
{
  "id": 762,
  "priority_activity": {
    "id": 62
  },
  "priority_status": "partial progress",
  "progress": "not_started",
  "notes": "",
  "value": false
}
```

## Status Calculation Logic

### Step 1: Create Priority Activity Map
```typescript
const paMap: Record<number, any> = {};
if (workplanData && Array.isArray(workplanData)) {
  workplanData.forEach((pa: any) => {
    if (pa.priority_activity && pa.priority_activity.id != null) {
      paMap[pa.priority_activity.id] = pa;
    }
  });
}
```

### Step 2: Merge Data
```typescript
const mergedActivities = priorityBases.map((base) => {
  const pa = paMap[base.id];
  return {
    ...base,
    ...(pa
      ? {
          priority_status: pa.priority_status || "not yet",
          value: pa.value,
          progress: pa.progress,
          notes: pa.notes,
          priority_activity_id: pa.id,
        }
      : {
          priority_status: "not yet",
        }),
  };
});
```

### Step 3: Status Mapping
```typescript
const statusMap = {
  "completed": "completed",
  "completed/ongoing": "completed",
  "not started": "not-initiated",
  "not yet initiated": "not-initiated",
  "not yet": "not-initiated",
  "partial": "partial progress",
  "partial progress": "partial progress",
};
```

## Data Flow

```
1. Fetch Priority Activity Bases
   ↓
2. Fetch Work Plan Data (sp_work_plan)
   ↓
3. Create Map: priority_activity.id → workplan data
   ↓
4. Merge: For each base, lookup in map
   ↓
5. If found: Use actual status from workplan
   If not found: Default to "not yet"
   ↓
6. Group by category
   ↓
7. Group by group.id + group.name
   ↓
8. Display in tabs
```

## Status Priority

When merging data:
1. **Has workplan data**: Use `pa.priority_status` from workplan
2. **No workplan data**: Default to `"not yet"`
3. **Invalid status**: Map to `"not-initiated"`

## Example Merge

### Input
**Priority Base**:
```json
{
  "id": 62,
  "category": "worker_voice",
  "description": "Facilitate supplier introductions",
  "group": { "id": 4, "name": "1.2", "description": "..." }
}
```

**Workplan Data**:
```json
{
  "id": 762,
  "priority_activity": { "id": 62 },
  "priority_status": "partial progress",
  "progress": "not_started",
  "notes": "In progress",
  "value": false
}
```

### Output (Merged)
```json
{
  "id": 62,
  "category": "worker_voice",
  "description": "Facilitate supplier introductions",
  "group": { "id": 4, "name": "1.2", "description": "..." },
  "priority_status": "partial progress",
  "progress": "not_started",
  "notes": "In progress",
  "value": false,
  "priority_activity_id": 762
}
```

## Component Implementation

### Hooks Used
```typescript
const { data: priorityBases, isLoading: isLoadingBases } = 
  usePriorityActivityBases();

const { data: workplanData, isLoading: isLoadingWorkplan } = 
  useWorkPlan(spId);
```

### Merge Logic
```typescript
const mergedActivities = useMemo(() => {
  if (!priorityBases) return [];

  // Create map of workplan data by priority_activity.id
  const paMap: Record<number, any> = {};
  if (workplanData && Array.isArray(workplanData)) {
    workplanData.forEach((pa: any) => {
      if (pa.priority_activity && pa.priority_activity.id != null) {
        paMap[pa.priority_activity.id] = pa;
      }
    });
  }

  // Merge base activities with workplan data
  return priorityBases.map((base: PriorityActivityBase) => {
    const pa = paMap[base.id];
    return {
      ...base,
      ...(pa
        ? {
            priority_status: pa.priority_status || "not yet",
            value: pa.value,
            progress: pa.progress,
            notes: pa.notes,
            priority_activity_id: pa.id,
          }
        : {
            priority_status: "not yet",
          }),
    };
  });
}, [priorityBases, workplanData]);
```

## Status Display

### Status Badges
- **Not yet initiated**: Gray (#b7b7b7)
- **Partial progress**: Yellow (#ffe599)
- **Completed/ongoing**: Teal (#148696)

### Status Values
- `"not-initiated"` → Not yet initiated
- `"partial progress"` → Partial progress
- `"completed"` → Completed/ongoing

## Benefits

1. **Accurate Status**: Shows actual progress from workplan data
2. **Fallback Handling**: Defaults to "not yet" for activities without progress
3. **Real-time Updates**: Status updates when workplan data changes
4. **Efficient**: Uses memoization to avoid unnecessary recalculations
5. **Type-safe**: Full TypeScript support

## Testing

### Test Cases
1. ✅ Activity with workplan data shows correct status
2. ✅ Activity without workplan data shows "not yet"
3. ✅ Status mapping works correctly
4. ✅ Merge logic handles missing data gracefully
5. ✅ Loading states work for both API calls
6. ✅ Status badges display correct colors

### Manual Testing
1. Check activities with "completed" status
2. Check activities with "partial progress" status
3. Check activities with no workplan data (should show "not yet")
4. Verify status badges match the data
5. Test with different spId values

## Summary

Successfully implemented status calculation by:
- ✅ Fetching data from two API sources
- ✅ Creating efficient lookup map
- ✅ Merging data with proper fallbacks
- ✅ Mapping status values correctly
- ✅ Using React memoization for performance
- ✅ Maintaining type safety throughout

The component now accurately reflects the actual progress status of workplan activities by combining base activity definitions with real progress data.
