"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type CopilotExtra = Record<string, unknown> | null;
type CopilotCtxValue = { extra: CopilotExtra; setExtra: (e: CopilotExtra) => void };

const CopilotPageContext = createContext<CopilotCtxValue | null>(null);

export function CopilotPageContextProvider({ children }: { children: ReactNode }) {
  const [extra, setExtra] = useState<CopilotExtra>(null);
  // setExtra is stable across renders (useState setter) — memoize so the
  // provider value's identity only changes when `extra` itself changes.
  const value = useMemo(() => ({ extra, setExtra }), [extra]);
  return (
    <CopilotPageContext.Provider value={value}>
      {children}
    </CopilotPageContext.Provider>
  );
}

/** Pages with meaningful filters/open objects call this so the "Спросить ИИ
 * об этой странице" button can pass that context along. Optional — pages
 * that don't call it just send their path. */
export function useCopilotPageContext(extra: Record<string, unknown> | undefined) {
  const setExtra = useContext(CopilotPageContext)?.setExtra;
  const key = JSON.stringify(extra ?? null);
  useEffect(() => {
    if (!setExtra) return;
    setExtra(extra ?? null);
    return () => setExtra(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setExtra, key]);
}

export function useCopilotExtraValue(): CopilotExtra {
  const ctx = useContext(CopilotPageContext);
  return ctx?.extra ?? null;
}
