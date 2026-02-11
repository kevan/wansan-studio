import React, { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { FilterOperator } from '@shared/types/filter'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export type EffectiveInputType = 'text' | 'number' | 'date' | 'none' | 'multi' | 'range' | 'date_range'

interface ValueInputProps {
  tableName: string
  columnName: string
  columnType: string
  operator: FilterOperator
  type: EffectiveInputType
  value: unknown
  onChange: (val: unknown) => void
}

export function ValueInput({
  tableName,
  columnName,
  columnType,
  operator,
  type,
  value,
  onChange
}: ValueInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const shouldFetchSuggestions = (
    operator === 'equals' ||
    operator === 'not_equals' ||
    operator === 'in' ||
    operator === 'not_in'
  )

  useEffect(() => {
    let active = true
    if (!shouldFetchSuggestions || !tableName || !columnName) {
      setSuggestions([])
      return
    }

    const escapedTable = tableName.replace(/"/g, '""')
    const escapedColumn = columnName.replace(/"/g, '""')
    setLoadingSuggestions(true)
    window.electronAPI.runSQL(
      `SELECT DISTINCT "${escapedColumn}" AS v FROM "${escapedTable}" WHERE "${escapedColumn}" IS NOT NULL ORDER BY 1 LIMIT 50`
    ).then(res => {
      if (!active) return
      if (!res.success || !res.data) {
        setSuggestions([])
        return
      }
      const next = (res.data.data || [])
        .map((row: Record<string, unknown>) => row.v)
        .filter((v: unknown) => v !== null && v !== undefined)
        .map((v: unknown) => String(v))
      setSuggestions(next)
    }).catch(() => {
      if (!active) return
      setSuggestions([])
    }).finally(() => {
      if (active) setLoadingSuggestions(false)
    })

    return () => {
      active = false
    }
  }, [shouldFetchSuggestions, tableName, columnName, operator, columnType])

  const appendListValue = (selected: string) => {
    const current = Array.isArray(value)
      ? value.map(v => String(v))
      : String(value || '').split(',').map(v => v.trim()).filter(Boolean)
    if (!current.includes(selected)) {
      onChange([...current, selected].join(', '))
    }
  }

  if (type === 'none') return null

  if (type === 'range' || type === 'date_range') {
    const inputType = type === 'date_range' ? 'date' : 'text'
    const minValue = Array.isArray(value) ? (value[0] as string | number | undefined) || '' : ''
    const maxValue = Array.isArray(value) ? (value[1] as string | number | undefined) || '' : ''

    return (
      <div className="flex items-center gap-1">
        <Input 
          type={inputType}
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
          placeholder="Min"
          value={minValue}
          onChange={(e) => {
             const max = Array.isArray(value) ? (value[1] as string | number | undefined) || '' : ''
             onChange([e.target.value, max])
          }}
        />
        <span className="text-[10px] text-zinc-400">-</span>
        <Input 
          type={inputType}
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
          placeholder="Max"
          value={maxValue}
          onChange={(e) => {
             const min = Array.isArray(value) ? (value[0] as string | number | undefined) || '' : ''
             onChange([min, e.target.value])
          }}
        />
      </div>
    )
  }

  if (type === 'number') {
    return (
        <Input 
          type="number"
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
          placeholder="0"
          value={typeof value === 'number' || typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }

  if (type === 'date') {
    return (
      <div className="relative">
        <Input 
          type="date"
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white appearance-none pr-8"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <Calendar className="absolute right-2 top-1.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
      </div>
    )
  }

  if (type === 'multi') {
    return (
      <div className="flex items-center gap-1">
        <Input 
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
          placeholder="A, B, C..."
          value={Array.isArray(value) ? value.join(', ') : (typeof value === 'string' || typeof value === 'number' ? value : '')}
          onChange={(e) => onChange(e.target.value)}
        />
        {suggestions.length > 0 && (
          <Select onValueChange={appendListValue}>
            <SelectTrigger className="h-7 w-[120px] text-xs border-zinc-100 bg-zinc-50">
              <SelectValue placeholder={loadingSuggestions ? '...' : 'Pick'} />
            </SelectTrigger>
            <SelectContent>
              {suggestions.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    )
  }

  // Boolean Toggle
  if (typeof value === 'boolean' || value === 'true' || value === 'false') {
    const isTrue = value === true || value === 'true'
    return (
      <div className="flex items-center gap-2">
        <Switch 
          checked={isTrue} 
          onCheckedChange={onChange}
          className="scale-75"
        />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter w-8">
          {isTrue ? 'True' : 'False'}
        </span>
      </div>
    )
  }

  if ((operator === 'equals' || operator === 'not_equals') && suggestions.length > 0) {
    return (
      <Select
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        onValueChange={onChange}
      >
        <SelectTrigger className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors">
          <SelectValue placeholder={loadingSuggestions ? 'Loading...' : 'Select value'} />
        </SelectTrigger>
        <SelectContent className="max-h-[240px]">
          {suggestions.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input 
      className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
      placeholder="Value..."
      value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
