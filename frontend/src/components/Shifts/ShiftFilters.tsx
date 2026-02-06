import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { ShiftFilters as ShiftFiltersType, ShiftType } from '@/types/shift'

interface ShiftFiltersProps {
  filters: ShiftFiltersType
  onFiltersChange: (filters: ShiftFiltersType) => void
  totalResults: number
}

const shiftTypes: { value: ShiftType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'bar', label: 'Bar' },
  { value: 'server', label: 'Server' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'chef', label: 'Chef' },
  { value: 'host', label: 'Host' },
  { value: 'general', label: 'General' },
]

const cities = [
  { value: '', label: 'All Cities' },
  { value: 'Dublin', label: 'Dublin' },
  { value: 'Cork', label: 'Cork' },
  { value: 'Galway', label: 'Galway' },
  { value: 'Limerick', label: 'Limerick' },
]

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'pay_high', label: 'Highest Pay' },
  { value: 'pay_low', label: 'Lowest Pay' },
  { value: 'date', label: 'Soonest Date' },
]

export function ShiftFilters({ filters, onFiltersChange, totalResults }: ShiftFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<ShiftFiltersType>(filters)

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'search'
  ).length

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleFilterChange = (key: keyof ShiftFiltersType, value: string | number | undefined) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const applyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const clearFilters = () => {
    const clearedFilters: ShiftFiltersType = { search: filters.search }
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search shifts..."
            className="pl-9"
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Mobile Filter Button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-[300px]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <FilterForm
                filters={localFilters}
                onFilterChange={handleFilterChange}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Clear
                </Button>
                <Button onClick={applyFilters} className="flex-1">
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Sort */}
        <div className="hidden lg:block w-48">
          <Select
            options={sortOptions}
            value="newest"
            onChange={() => {}}
          />
        </div>
      </div>

      {/* Results count and active filters */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalResults} shift{totalResults !== 1 && 's'} found
        </p>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}

interface FilterSidebarProps {
  filters: ShiftFiltersType
  onFiltersChange: (filters: ShiftFiltersType) => void
}

export function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const handleFilterChange = (key: keyof ShiftFiltersType, value: string | number | undefined) => {
    onFiltersChange({ ...filters, [key]: value || undefined })
  }

  const clearFilters = () => {
    onFiltersChange({ search: filters.search })
  }

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'search'
  ).length

  return (
    <div className="w-64 shrink-0 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        )}
      </div>
      <FilterForm filters={filters} onFilterChange={handleFilterChange} />
    </div>
  )
}

interface FilterFormProps {
  filters: ShiftFiltersType
  onFilterChange: (key: keyof ShiftFiltersType, value: string | number | undefined) => void
}

function FilterForm({ filters, onFilterChange }: FilterFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Location</Label>
        <Select
          options={cities}
          value={filters.city || ''}
          onChange={(e) => onFilterChange('city', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Shift Type</Label>
        <Select
          options={shiftTypes}
          value={filters.shift_type || ''}
          onChange={(e) => onFilterChange('shift_type', e.target.value as ShiftType)}
        />
      </div>

      <div className="space-y-2">
        <Label>Pay Rate (per hour)</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Min</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
              <Input
                type="number"
                min="0"
                className="pl-7"
                placeholder="0"
                value={filters.min_rate || ''}
                onChange={(e) => onFilterChange('min_rate', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Max</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
              <Input
                type="number"
                min="0"
                className="pl-7"
                placeholder="Any"
                value={filters.max_rate || ''}
                onChange={(e) => onFilterChange('max_rate', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
        <Input
          type="date"
          value={filters.date_from || ''}
          onChange={(e) => onFilterChange('date_from', e.target.value)}
        />
      </div>
    </div>
  )
}
