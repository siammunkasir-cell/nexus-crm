"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { UserProfile } from "@nexus/shared";

interface AppState {
  sidebarCollapsed: boolean;
  user: UserProfile | null;
  toggleSidebar: () => void;
  setUser: (user: UserProfile | null) => void;
}

const AppContext = createContext<AppState>({
  sidebarCollapsed: false,
  user: null,
  toggleSidebar: () => {},
  setUser: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <AppContext.Provider value={{ sidebarCollapsed, user, toggleSidebar, setUser }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
