import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ShiftCard } from '@/components/Shifts/ShiftCard'
import { ShiftFilters, FilterSidebar } from '@/components/Shifts/ShiftFilters'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Search } from 'lucide-react'
import type { Shift, ShiftFilters as ShiftFiltersType } from '@/types/shift'

export const Route = createFileRoute('/_layout/marketplace/')({
  component: MarketplacePage,
})

// Mock data - would come from API
const mockShifts: Shift[] = [
  {
    id: '1',
    company_id: 'b1',
    title: 'Bartender - Friday Night',
    description: 'Looking for an experienced bartender for a busy Friday night.',
    shift_type: 'bar',
    date: '2026-02-07',
    start_time: '18:00',
    end_time: '00:00',
    duration_hours: 6,
    location_name: 'The Brazen Head',
    address: '20 Bridge Street Lower',
    city: 'Dublin',
    hourly_rate: 18,
    total_pay: 108,
    currency: 'EUR',
    spots_total: 1,
    spots_filled: 0,
    required_skills: ['Bartending', 'Cocktails'],
    status: 'open',
    created_at: '2026-02-04T10:00:00Z',
    updated_at: '2026-02-04T10:00:00Z',
    company: {
      id: 'b1',
      company_name: 'The Brazen Head',
      company_type: 'bar',
      city: 'Dublin',
      is_verified: true,
      average_rating: 4.8,
      review_count: 124,
    },
  },
  {
    id: '2',
    company_id: 'b2',
    title: 'Server - Saturday Lunch',
    description: 'Need friendly servers for weekend lunch service.',
    shift_type: 'server',
    date: '2026-02-08',
    start_time: '11:00',
    end_time: '17:00',
    duration_hours: 6,
    location_name: 'Restaurant XYZ',
    address: '15 Grafton Street',
    city: 'Dublin',
    hourly_rate: 16,
    total_pay: 96,
    currency: 'EUR',
    spots_total: 2,
    spots_filled: 1,
    required_skills: ['Table Service', 'POS Systems'],
    status: 'open',
    created_at: '2026-02-04T09:00:00Z',
    updated_at: '2026-02-04T09:00:00Z',
    company: {
      id: 'b2',
      company_name: 'Restaurant XYZ',
      company_type: 'restaurant',
      city: 'Dublin',
      is_verified: true,
      average_rating: 4.5,
      review_count: 89,
    },
  },
  {
    id: '3',
    company_id: 'b3',
    title: 'Line Cook',
    description: 'Experienced line cook needed for hotel kitchen.',
    shift_type: 'kitchen',
    date: '2026-02-10',
    start_time: '06:00',
    end_time: '14:00',
    duration_hours: 8,
    location_name: 'Grand Hotel Dublin',
    address: 'O\'Connell Street',
    city: 'Dublin',
    hourly_rate: 20,
    total_pay: 160,
    currency: 'EUR',
    spots_total: 1,
    spots_filled: 0,
    required_skills: ['Line Cook', 'Grill'],
    status: 'open',
    created_at: '2026-02-04T08:00:00Z',
    updated_at: '2026-02-04T08:00:00Z',
    company: {
      id: 'b3',
      company_name: 'Grand Hotel Dublin',
      company_type: 'hotel',
      city: 'Dublin',
      is_verified: true,
      average_rating: 4.7,
      review_count: 256,
    },
  },
  {
    id: '4',
    company_id: 'b4',
    title: 'Barista',
    description: 'Morning shift barista with latte art skills.',
    shift_type: 'bar',
    date: '2026-02-09',
    start_time: '07:00',
    end_time: '15:00',
    duration_hours: 8,
    location_name: 'Café Central',
    address: 'Temple Bar',
    city: 'Dublin',
    hourly_rate: 14,
    total_pay: 112,
    currency: 'EUR',
    spots_total: 1,
    spots_filled: 0,
    required_skills: ['Barista', 'Customer Service'],
    status: 'open',
    created_at: '2026-02-04T07:00:00Z',
    updated_at: '2026-02-04T07:00:00Z',
    company: {
      id: 'b4',
      company_name: 'Café Central',
      company_type: 'cafe',
      city: 'Dublin',
      is_verified: false,
      average_rating: 4.3,
      review_count: 45,
    },
  },
]

function MarketplacePage() {
  const [filters, setFilters] = useState<ShiftFiltersType>({})
  const [isLoading] = useState(false)

  // Filter shifts based on current filters
  const filteredShifts = mockShifts.filter((shift) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (
        !shift.title.toLowerCase().includes(searchLower) &&
        !shift.company?.company_name.toLowerCase().includes(searchLower) &&
        !shift.location_name.toLowerCase().includes(searchLower)
      ) {
        return false
      }
    }
    if (filters.city && shift.city !== filters.city) return false
    if (filters.shift_type && shift.shift_type !== filters.shift_type) return false
    if (filters.min_rate && shift.hourly_rate < filters.min_rate) return false
    if (filters.max_rate && shift.hourly_rate > filters.max_rate) return false
    if (filters.date_from && shift.date < filters.date_from) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Find Shifts</h1>
        <p className="text-muted-foreground">Browse available shifts in your area</p>
      </div>

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
            totalResults={filteredShifts.length}
          />

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : filteredShifts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredShifts.map((shift) => (
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
