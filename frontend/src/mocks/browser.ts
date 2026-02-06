import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * MSW browser worker for intercepting requests in the browser during development.
 *
 * To enable MSW in development, add this to your main.tsx (before createRoot):
 *
 * ```typescript
 * async function enableMocking() {
 *   if (import.meta.env.DEV) {
 *     const { worker } = await import('./mocks/browser')
 *     return worker.start({
 *       onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
 *     })
 *   }
 * }
 *
 * enableMocking().then(() => {
 *   createRoot(document.getElementById('root')!).render(...)
 * })
 * ```
 *
 * You'll also need to run: npx msw init public/ --save
 * This creates the service worker file in your public directory.
 */
export const worker = setupWorker(...handlers)
