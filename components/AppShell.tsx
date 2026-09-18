"use client";

import { createContext, useContext, useState } from "react";

type SidebarNavState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SidebarNavContext = createContext<SidebarNavState>({
  open: false,
  setOpen: () => {},
});

export function useSidebarNav() {
  return useContext(SidebarNavContext);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <SidebarNavContext.Provider value={{ open, setOpen }}>
      <div className="app-shell flex h-screen overflow-hidden">{children}</div>
    </SidebarNavContext.Provider>
  );
}
