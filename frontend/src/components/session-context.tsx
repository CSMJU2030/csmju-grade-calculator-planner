"use client";

import { createContext, useContext, useEffect, useId, useRef, useMemo, useCallback, type ReactNode } from "react";
import type { CurrentUser } from "@/lib/user";

const SessionContext = createContext<{
  user: CurrentUser | null;
  subsystemId: string;
  hasDraft: () => boolean;
  setDraft: (id: string, dirty: boolean) => void;
}>({ user: null, subsystemId: "", hasDraft: () => false, setDraft: () => {} });

export function SessionProvider({ user, subsystemId, children }: {
  user: CurrentUser | null;
  subsystemId: string;
  children: ReactNode;
}) {
  const drafts = useRef(new Set<string>());
  const hasDraft = useCallback(() => drafts.current.size > 0, []);
  const setDraft = useCallback((id: string, dirty: boolean) => {
    if (dirty) drafts.current.add(id);
    else drafts.current.delete(id);
  }, []);
  const value = useMemo(() => ({ user, subsystemId, hasDraft, setDraft }), [user, subsystemId, hasDraft, setDraft]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export function useUnsavedChanges(dirty: boolean) {
  const { setDraft } = useSession();
  const id = useId();
  useEffect(() => {
    setDraft(id, dirty);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", beforeUnload);
    return () => {
      setDraft(id, false);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [dirty, id, setDraft]);
}
