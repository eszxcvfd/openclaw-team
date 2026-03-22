import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => {
        set({ session })
      },
      clearSession: () => {
        set({ session: null })
      },
    }),
    {
      name: 'openclaw-auth-session',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
