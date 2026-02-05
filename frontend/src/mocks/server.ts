import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW server for intercepting requests in Node.js during testing.
 *
 * Usage in test setup (e.g., vitest.setup.ts):
 *
 * ```typescript
 * import { server } from './src/mocks/server'
 *
 * // Start server before all tests
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
 *
 * // Reset handlers after each test (important for test isolation)
 * afterEach(() => server.resetHandlers())
 *
 * // Clean up after all tests
 * afterAll(() => server.close())
 * ```
 *
 * You can also add test-specific handlers:
 *
 * ```typescript
 * import { http, HttpResponse } from 'msw'
 * import { server } from './src/mocks/server'
 *
 * test('handles error response', async () => {
 *   server.use(
 *     http.get('/api/v1/users/:id', () => {
 *       return HttpResponse.json({ error: 'Not found' }, { status: 404 })
 *     })
 *   )
 *   // ... test code
 * })
 * ```
 */
export const server = setupServer(...handlers)
