import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ShiftCard } from '@/components/Shifts/ShiftCard'
import { ShiftFilters, FilterSidebar } from '@/components/Shifts/ShiftFilters'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/ui/page-header'
import { Search, AlertCircle } from 'lucide-react'
import { useShifts } from '@/hooks/api'
import type { ShiftFilters as ShiftFiltersType } from '@/types/shift'

export const Route = createFileRoute('/_layout/marketplace/')({
  component: MarketplacePage,
})

function MarketplacePage() {
  const [filters, setFilters] = useState<ShiftFiltersType>({})

  // Fetch shifts from API with filters
  const { data, isLoading, error } = useShifts({
    ...filters,
    status: 'open', // Only show open shifts in marketplace
  })

  const shifts = data?.items ?? []
  const totalResults = data?.total ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Find Shifts"
        description="Browse available shifts in your area"
      />

      <div className="flex gap-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <FilterSidebar filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          <ShiftFilters
            filters={filters}
            onFiltersChange={setFilters}
            totalResults={totalResults}
          />

          {error ? (
            <EmptyState
              icon={AlertCircle}
              title="Failed to load shifts"
              description="There was an error loading shifts. Please try again later."
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : shifts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shifts.map((shift) => (
                <ShiftCard key={shift.id} shift={shift} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="No shifts found"
              description="Try adjusting your filters or check back later for new opportunities."
            />
          )}
        </div>
      </div>
    </div>
  )
}
