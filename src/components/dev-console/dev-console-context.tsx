import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DevConsoleContextValue = {
  isOpen: boolean;
  openConsole: () => void;
  closeConsole: () => void;
  setOpen: (value: boolean) => void;
};

const DevConsoleContext = createContext<DevConsoleContextValue | undefined>(
  undefined
);

export function DevConsoleProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<DevConsoleContextValue>(
    () => ({
      isOpen,
      openConsole: () => setIsOpen(true),
      closeConsole: () => setIsOpen(false),
      setOpen: setIsOpen,
    }),
    [isOpen]
  );

  return (
    <DevConsoleContext.Provider value={value}>
      {children}
    </DevConsoleContext.Provider>
  );
}

export function useDevConsole() {
  const context = useContext(DevConsoleContext);
  if (!context) {
    throw new Error("useDevConsole must be used within DevConsoleProvider.");
  }
  return context;
}
