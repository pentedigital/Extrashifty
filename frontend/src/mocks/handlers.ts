import { http, HttpResponse } from 'msw'

// Example API base URL - adjust to match your backend
const API_BASE = '/api/v1'

/**
 * MSW request handlers for mocking API responses in tests and development.
 *
 * Add handlers here to mock specific API endpoints. These handlers will be
 * used by both the browser worker (development) and the test server (testing).
 *
 * Example usage:
 * - http.get() for GET requests
 * - http.post() for POST requests
 * - http.put() for PUT requests
 * - http.patch() for PATCH requests
 * - http.delete() for DELETE requests
 */
export const handlers = [
  // Example: Mock a health check endpoint
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: 'ok' })
  }),

  // Example: Mock a user endpoint
  http.get(`${API_BASE}/users/:id`, ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      name: 'Test User',
      email: 'test@example.com',
    })
  }),

  // Example: Mock a POST endpoint
  http.post(`${API_BASE}/users`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      {
        id: 'new-user-id',
        ...body,
      },
      { status: 201 }
    )
  }),

  // Example: Mock an error response
  // http.get(`${API_BASE}/error-endpoint`, () => {
  //   return HttpResponse.json(
  //     { error: 'Something went wrong' },
  //     { status: 500 }
  //   )
  // }),
]
