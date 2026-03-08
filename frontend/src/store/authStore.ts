import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    user: {
        _id: string;
        username: string;
        role: string;
    } | null;
    isHydrated: boolean;
    setAuth: (token: string, user: any) => void;
    logout: () => void;
    setHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isHydrated: false,
            setAuth: (token, user) => set({ token, user }),
            logout: () => set({ token: null, user: null }),
            setHydrated: (val) => set({ isHydrated: val }),
        }),
        {
            name: 'jewellery-auth',
            onRehydrateStorage: (state) => {
                return () => state.setHydrated(true);
            },
        }
    )
);
