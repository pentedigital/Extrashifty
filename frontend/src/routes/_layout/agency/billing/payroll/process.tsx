import { useState, useMemo } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Calculator, CreditCard, Users, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { useAgencyStaff, useProcessPayroll } from '@/hooks/api/useAgencyApi'

export const Route = createFileRoute('/_layout/agency/billing/payroll/process')({
  component: ProcessPayrollPage,
})

interface StaffPayrollPreview {
  id: string
  name: string
  email: string | null
  shiftsCount: number
  hoursWorked: number
  grossAmount: number
  selected: boolean
}

function ProcessPayrollPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const { data: staffData, isLoading: staffLoading } = useAgencyStaff()
  const processPayrollMutation = useProcessPayroll()

  const [formData, setFormData] = useState({
    period_start: '',
    period_end: '',
  })

  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [previewCalculated, setPreviewCalculated] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [previewData, setPreviewData] = useState<StaffPayrollPreview[]>([])

  const activeStaff = useMemo(() => {
    return (staffData?.items ?? []).filter(s => s.status === 'active')
  }, [staffData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setPreviewCalculated(false)
    setPreviewData([])
  }

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaffIds(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    )
  }

  const selectAllStaff = () => {
    if (selectedStaffIds.length === activeStaff.length) {
      setSelectedStaffIds([])
    } else {
      setSelectedStaffIds(activeStaff.map(s => s.id))
    }
  }

  const handleCalculatePreview = async () => {
    if (!formData.period_start || !formData.period_end) {
      addToast({
        type: 'warning',
        title: 'Missing period',
        description: 'Please select both start and end dates for the payroll period.',
      })
      return
    }

    if (selectedStaffIds.length === 0) {
      addToast({
        type: 'warning',
        title: 'No staff selected',
        description: 'Please select at least one staff member to process payroll.',
      })
      return
    }

    setIsCalculating(true)

    // Simulate API call to calculate payroll preview
    // In production, this would call an endpoint that calculates based on completed shifts
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Generate mock preview data
    const preview = selectedStaffIds.map(staffId => {
      const staff = activeStaff.find(s => s.id === staffId)
      const hours = Math.floor(Math.random() * 40) + 8
      const rate = 18 // Placeholder hourly rate

      return {
        id: staffId,
        name: staff?.staff?.name ?? staff?.name ?? 'Unknown',
        email: staff?.staff?.email ?? staff?.email ?? null,
        shiftsCount: Math.floor(Math.random() * 5) + 1,
        hoursWorked: hours,
        grossAmount: hours * rate,
        selected: true,
      }
    })

    setPreviewData(preview)
    setPreviewCalculated(true)
    setIsCalculating(false)

    addToast({
      type: 'success',
      title: 'Payroll calculated',
      description: `Calculated payroll for ${preview.length} staff members.`,
    })
  }

  const togglePreviewSelection = (staffId: string) => {
    setPreviewData(prev =>
      prev.map(p => p.id === staffId ? { ...p, selected: !p.selected } : p)
    )
  }

  const selectedPreviewData = previewData.filter(p => p.selected)
  const totalAmount = selectedPreviewData.reduce((sum, p) => sum + p.grossAmount, 0)
  const totalHours = selectedPreviewData.reduce((sum, p) => sum + p.hoursWorked, 0)

  const handleProcessPayroll = async () => {
    if (selectedPreviewData.length === 0) {
      addToast({
        type: 'warning',
        title: 'No staff selected',
        description: 'Please select at least one staff member to process.',
      })
      return
    }

    try {
      await processPayrollMutation.mutateAsync({
        period_start: formData.period_start,
        period_end: formData.period_end,
        staff_member_ids: selectedPreviewData.map(p => parseInt(p.id, 10)),
      })

      addToast({
        type: 'success',
        title: 'Payroll processed',
        description: `Payroll for ${selectedPreviewData.length} staff members has been processed.`,
      })

      navigate({ to: '/agency/billing/payroll' })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to process payroll',
        description: 'Please try again later.',
      })
    }
  }

  const getStaffInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to="/agency/billing/payroll">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Process Payroll</h1>
          <p className="text-muted-foreground">Calculate and process staff payments</p>
        </div>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Period</CardTitle>
          <CardDescription>Select the period for which to process payroll</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="period_start">Period Start</Label>
              <Input
                id="period_start"
                name="period_start"
                type="date"
                value={formData.period_start}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_end">Period End</Label>
              <Input
                id="period_end"
                name="period_end"
                type="date"
                value={formData.period_end}
                onChange={handleChange}
                min={formData.period_start}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Staff</CardTitle>
              <CardDescription>Choose which staff members to include in this payroll run</CardDescription>
            </div>
            {!previewCalculated && activeStaff.length > 0 && (
              <Button variant="outline" size="sm" onClick={selectAllStaff}>
                {selectedStaffIds.length === activeStaff.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {staffLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : activeStaff.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No active staff members found.</p>
              <Link to="/agency/staff/invite">
                <Button variant="outline" className="mt-4">Invite Staff</Button>
              </Link>
            </div>
          ) : !previewCalculated ? (
            <div className="space-y-2">
              {activeStaff.map((staff) => {
                const isSelected = selectedStaffIds.includes(staff.id)
                const staffName = staff.staff?.name ?? staff.name ?? 'Unknown'

                return (
                  <div
                    key={staff.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleStaffSelection(staff.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleStaffSelection(staff.id)}
                      aria-label={`Select ${staffName} for payroll processing`}
                      id={`staff-checkbox-${staff.id}`}
                    />
                    <Avatar aria-label={`Avatar for ${staffName}`}>
                      <AvatarFallback>{getStaffInitials(staffName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{staffName}</p>
                      <p className="text-sm text-muted-foreground">
                        {staff.staff?.email ?? staff.email ?? 'No email'}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{staff.shifts_completed ?? 0} shifts completed</p>
                      <p>{staff.total_hours ?? 0}h total</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Preview mode - show calculated amounts
            <div className="space-y-2">
              {previewData.map((preview) => (
                <div
                  key={preview.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    preview.selected ? 'border-primary bg-primary/5' : 'bg-muted/30'
                  }`}
                  onClick={() => togglePreviewSelection(preview.id)}
                >
                  <Checkbox
                    checked={preview.selected}
                    onCheckedChange={() => togglePreviewSelection(preview.id)}
                    aria-label={`Select ${preview.name} for payroll processing`}
                    id={`preview-checkbox-${preview.id}`}
                  />
                  <Avatar aria-label={`Avatar for ${preview.name}`}>
                    <AvatarFallback>{getStaffInitials(preview.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{preview.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {preview.shiftsCount} shifts - {preview.hoursWorked}h
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(preview.grossAmount)}</p>
                    <Badge variant="outline">Gross</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Summary */}
      {previewCalculated && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Staff Members</p>
                <p className="text-2xl font-bold">{selectedPreviewData.length}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours}h</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>

            {selectedPreviewData.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-700">No staff members selected. Please select at least one to process payroll.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link to="/agency/billing/payroll">
          <Button variant="outline" disabled={processPayrollMutation.isPending}>
            Cancel
          </Button>
        </Link>
        {!previewCalculated ? (
          <Button
            onClick={handleCalculatePreview}
            disabled={isCalculating || !formData.period_start || !formData.period_end || selectedStaffIds.length === 0}
          >
            {isCalculating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            Calculate Payroll
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setPreviewCalculated(false)
                setPreviewData([])
              }}
              disabled={processPayrollMutation.isPending}
            >
              Recalculate
            </Button>
            <Button
              onClick={handleProcessPayroll}
              disabled={processPayrollMutation.isPending || selectedPreviewData.length === 0}
            >
              {processPayrollMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Process Payroll ({formatCurrency(totalAmount)})
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
