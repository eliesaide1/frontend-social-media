"use client";

import { useState, useCallback, useMemo } from "react";
import { IG_ACCOUNTS } from "@/lib/constants";
import type { IgAccount } from "@/types/instagram";

interface UseIgAccountReturn {
  accounts: readonly IgAccount[];
  selectedAccount: IgAccount | null;
  setAccount: (igUserId: string) => void;
}

/**
 * Hook for Instagram account selection.
 *
 * Deliberately synchronous, unlike `useFbAccount`: the Instagram service has
 * no account-list endpoint to call, so the list comes from IG_ACCOUNTS and
 * there is nothing to fetch or fail. Each platform page owns its own hook —
 * accounts are not shared across platforms.
 */
export function useIgAccount(): UseIgAccountReturn {
  const accounts = IG_ACCOUNTS;
  const [selectedId, setSelectedId] = useState<string>(
    accounts[0]?.igUserId ?? ""
  );

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.igUserId === selectedId) ?? null,
    [accounts, selectedId]
  );

  const setAccount = useCallback(
    (igUserId: string) => {
      if (accounts.some((a) => a.igUserId === igUserId)) setSelectedId(igUserId);
    },
    [accounts]
  );

  return { accounts, selectedAccount, setAccount };
}
