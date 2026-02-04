import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, MoreVertical, Eye, MapPin, Clock } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export const Route = createFileRoute('/_layout/admin/shifts')({
  component: AdminShiftsPage,
})

const mockShifts = [
  { id: '1', title: 'Bartender', company: 'The Brazen Head', location: 'Dublin 8', date: '2026-02-07', startTime: '18:00', endTime: '00:00', rate: 18, status: 'active', applicants: 5 },
  { id: '2', title: 'Server', company: 'Restaurant XYZ', location: 'Dublin 2', date: '2026-02-08', startTime: '12:00', endTime: '20:00', rate: 16, status: 'filled', applicants: 8 },
  { id: '3', title: 'Line Cook', company: 'Hotel Dublin', location: 'Dublin 1', date: '2026-02-06', startTime: '07:00', endTime: '15:00', rate: 20, status: 'completed', applicants: 3 },
  { id: '4', title: 'Host/Hostess', company: 'Café Central', location: 'Dublin 4', date: '2026-02-09', startTime: '10:00', endTime: '18:00', rate: 14, status: 'active', applicants: 2 },
  { id: '5', title: 'Kitchen Porter', company: 'The Local', location: 'Dublin 7', date: '2026-02-05', startTime: '16:00', endTime: '23:00', rate: 13, status: 'cancelled', applicants: 0 },
]

function AdminShiftsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredShifts = mockShifts.filter(shift => {
    const matchesSearch = shift.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.company.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || shift.status === activeTab
    return matchesSearch && matchesTab
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default">Active</Badge>
      case 'filled': return <Badge variant="success">Filled</Badge>
      case 'completed': return <Badge variant="secondary">Completed</Badge>
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shifts</h1>
        <p className="text-muted-foreground">Monitor all platform shifts</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="filled">Filled</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{shift.title}</p>
                    {getStatusBadge(shift.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{shift.company}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {shift.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(shift.date)} {formatTime(shift.startTime)}-{formatTime(shift.endTime)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden md:block text-right">
                    <p className="font-medium">{formatCurrency(shift.rate)}/hr</p>
                    <p className="text-sm text-muted-foreground">{shift.applicants} applicants</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="View details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
