import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SidebarCtx {
  isOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarCtx>({
  isOpen: true, isMobile: false, toggle: () => {}, close: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isOpen,   setIsOpen]   = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsOpen(true);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <SidebarContext.Provider value={{
      isOpen, isMobile,
      toggle: () => setIsOpen(p => !p),
      close:  () => setIsOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
