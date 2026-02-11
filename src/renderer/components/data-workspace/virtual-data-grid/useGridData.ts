import { useCallback, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { SortingState } from '@tanstack/react-table'
import { FilterState, filterStateToSQL, validateFilterState } from '@shared/types/filter'
import { useToastStore } from '@/stores/useToastStore'
import { PAGE_SIZE } from './utils'

interface UseGridDataProps {
  tableName: string
  sorting: SortingState
  filterState: FilterState
  setFilterError: (error: string | null) => void
}

export function useGridData({ tableName, sorting, filterState, setFilterError }: UseGridDataProps) {
  const toast = useToastStore()

  const queryFn = useCallback(async ({ pageParam = 0 }: { pageParam?: number }) => {
    const issues = validateFilterState(filterState)
    if (issues.length > 0) {
      const msg = `Filter validation failed: ${issues.map(i => i.code).join(', ')}`
      setFilterError(msg)
      throw new Error(msg)
    }

    const whereClause = filterStateToSQL(filterState)

    let orderBy = ''
    if (sorting.length > 0) {
      const sort = sorting[0]
      orderBy = `ORDER BY "${sort.id}" ${sort.desc ? 'DESC' : 'ASC'}`
    } else {
      orderBy = 'ORDER BY _ws_row_id ASC'
    }

    const sql = `SELECT * FROM "${tableName}" ${whereClause} ${orderBy} LIMIT ${PAGE_SIZE} OFFSET ${pageParam}`
    const res = await window.electronAPI.runSQL(sql)
    if (!res.success) {
      setFilterError(res.error || 'SQL execution failed')
      throw new Error(res.error || 'SQL execution failed')
    }

    setFilterError(null)
    return (res.data?.data || []) as Record<string, unknown>[]
  }, [tableName, sorting, filterState, setFilterError])

  const query = useInfiniteQuery({
    queryKey: ['table-data', tableName, sorting, filterState],
    queryFn,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined
      return allPages.length * PAGE_SIZE
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
  })

  useEffect(() => {
    if (query.isError && query.error) {
      toast.addToast({
        title: 'Filter error',
        description: (query.error as Error).message,
        type: 'error',
      })
    }
  }, [query.isError, query.error, toast])

  const flatData = query.data?.pages.flat() ?? []

  return {
    ...query,
    flatData,
  }
}
