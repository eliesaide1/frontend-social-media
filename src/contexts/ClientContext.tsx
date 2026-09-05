"use client";

import { createContext, useContext, ReactNode } from "react";
import { useFbAccount } from "@/hooks/useFbAccount";

type AccountContextType = ReturnType<typeof useFbAccount>;

const AccountContext = createContext<AccountContextType | undefined>(undefined);

/**
 * Shares one account/page selection across pages.
 *
 * Wrap the app in this when more than one route needs the same selection —
 * each bare useFbAccount() call otherwise runs its own discovery and can end
 * up on a different page than its neighbour. The API client's account scoping
 * is process-wide, so two hooks disagreeing about the account is a real hazard.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const value = useFbAccount();
  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
