# 🛠️ Spec: Dashboard Data Grid (The "Table Widget")

> **Goal**: Enable users to Pin raw data tables to the Dashboard, with sorting and pagination capabilities.
> **Stack**: TanStack Table (React Table v8), Shadcn UI.

## 1. Requirement Analysis

When `viz_type === 'table'`, the `ReportCard` (both in Chat and Dashboard) must render a robust grid.

*   **Chat Mode**: Show first 5-10 rows (Preview).
*   **Dashboard Mode**: Show full data with **Pagination** (or Infinite Scroll) and **Sorting**.

## 2. Component Architecture

Create a new component `src/renderer/src/components/report/report-table.tsx`.

### Props
```typescript
interface ReportTableProps {
  data: any[];       // Array of row objects
  columns: string[]; // Header names
  variant: 'chat' | 'dashboard';
}
```

### Features
1.  **Auto-Columns**: Dynamically generate `ColumnDef` from the `columns` string array.
2.  **Pagination**:
    *   **Chat**: Fixed to show max 5 rows. No pager.
    *   **Dashboard**: `pageSize` = 10 (default), with `<Pagination />` controls at bottom.
3.  **Styling**:
    *   Use `Table`, `TableHeader`, `TableRow`, `TableCell` from Shadcn UI.
    *   Header: Sticky, gray background.
    *   Cell: Truncate long text with Tooltip.

## 3. Implementation Steps

### Step 1: Install Dependencies
(If not already installed)
`npm install @tanstack/react-table`

### Step 2: Implement `ReportTable.tsx`

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table"

export function ReportTable({ data, columns, variant }: ReportTableProps) {
  const isDashboard = variant === 'dashboard'
  
  const table = useReactTable({
    data,
    columns: columns.map(col => ({ accessorKey: col, header: col })),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: isDashboard ? 10 : 5
      }
    }
  })

  return (
    <div className="flex flex-col h-full w-full">
       {/* Scrollable Table Area */}
       <div className="flex-1 overflow-auto border rounded-md">
          <Table>
             {/* Render Headers & Rows */}
          </Table>
       </div>
       
       {/* Pagination Controls (Only for Dashboard) */}
       {isDashboard && (
          <div className="flex items-center justify-end space-x-2 py-4">
             <Button
               variant="outline"
               size="sm"
               onClick={() => table.previousPage()}
               disabled={!table.getCanPreviousPage()}
             >
               Previous
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={() => table.nextPage()}
               disabled={!table.getCanNextPage()}
             >
               Next
             </Button>
          </div>
       )}
    </div>
  )
}
```

### Step 3: Integrate into `ReportCard.tsx`

Update the render logic to switch between Chart and Table.

```tsx
// Inside ReportCard
const renderContent = () => {
  if (data.visualization?.type === 'table') {
    return (
      <ReportTable 
         data={data.data || []} 
         columns={data.columns || []} 
         variant={variant} 
      />
    )
  }
  // ... else return Chart
}
```

## 4. AI Prompt Update (Optional Check)

Ensure the System Prompt knows about `'table'` type (already done in previous steps).
