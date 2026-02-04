import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserType } from '@/types/user'

interface AppState {
  user: User | null
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'

  setUser: (user: User | null) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      sidebarCollapsed: false,
      theme: 'system',

      setUser: (user) => set({ user }),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setTheme: (theme) => set({ theme }),

      logout: () => set({ user: null }),
    }),
    {
      name: 'extrashifty-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
)

// Selector hooks for common patterns
export const useUser = () => useAppStore((state) => state.user)
export const useUserType = (): UserType | null =>
  useAppStore((state) => state.user?.user_type ?? null)
export const useIsStaff = () =>
  useAppStore((state) => state.user?.user_type === 'staff')
export const useIsCompany = () =>
  useAppStore((state) => state.user?.user_type === 'company')
export const useIsAgency = () =>
  useAppStore((state) => state.user?.user_type === 'agency')
export const useIsAdmin = () =>
  useAppStore((state) => state.user?.user_type === 'admin')
export const useIsSuperAdmin = () =>
  useAppStore((state) => state.user?.user_type === 'super_admin')
export const useSidebarCollapsed = () =>
  useAppStore((state) => state.sidebarCollapsed)
export const useTheme = () => useAppStore((state) => state.theme)
