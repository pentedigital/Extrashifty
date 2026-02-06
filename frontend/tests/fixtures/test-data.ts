/**
 * Test data for E2E tests
 */

export const testUsers = {
  staff: {
    email: 'staff@test.extrashifty.com',
    password: 'TestPassword123!',
    name: 'Test Staff User',
    type: 'staff' as const,
  },
  company: {
    email: 'company@test.extrashifty.com',
    password: 'TestPassword123!',
    name: 'Test Company User',
    type: 'company' as const,
  },
  agency: {
    email: 'agency@test.extrashifty.com',
    password: 'TestPassword123!',
    name: 'Test Agency User',
    type: 'agency' as const,
  },
}

export const testShift = {
  title: 'Test Bartender Shift',
  description: 'E2E test shift for automation',
  hourlyRate: 18,
  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  startTime: '18:00',
  endTime: '00:00',
  location: 'Test Venue',
  city: 'Dublin',
}

export const invalidCredentials = {
  email: 'invalid@test.com',
  password: 'wrongpassword',
}
