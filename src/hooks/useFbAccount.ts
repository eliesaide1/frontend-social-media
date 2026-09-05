"use client";

import { useState, useEffect, useCallback } from "react";
import * as fb from "@/services/facebookService";
import type {
  AuthStatus,
  BusinessWithPagesDto,
  MetaAccountDto,
  PageDto,
} from "@/types/facebook";

const DEFAULT_PAGE_ID = process.env.NEXT_PUBLIC_DEFAULT_PAGE_ID || "";

interface UseFbAccountReturn {
  accounts: MetaAccountDto[];
  selectedAccount: MetaAccountDto | null;
  setAccount: (accountId: string) => void;
  businesses: BusinessWithPagesDto[];
  pages: PageDto[];
  selectedPage: PageDto | null;
  setPage: (pageId: string) => void;
  /** Token health per account, from /auth/facebook/status */
  authStatus: AuthStatus | null;
  /** True when nothing is linked — the operator must run the OAuth flow */
  needsLogin: boolean;
  loginUrl: string;
  /** Runs sync-businesses-as-pages, then re-reads the registry. Slow. */
  syncPages: () => Promise<void>;
  syncing: boolean;
  refresh: () => void;
  loading: boolean;
  error: string | null;
}

/**
 * Facebook account and page selection.
 *
 * Every analytics endpoint is scoped to a linked Meta account, resolved from
 * the X-Account-Id header. With two or more accounts linked the API refuses an
 * unscoped request rather than guessing, so the account must be set on the
 * client before any page-level call is made — that ordering is why page
 * discovery runs only after an account is selected.
 */
export function useFbAccount(): UseFbAccountReturn {
  const [accounts, setAccounts] = useState<MetaAccountDto[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MetaAccountDto | null>(
    null
  );
  const [businesses, setBusinesses] = useState<BusinessWithPagesDto[]>([]);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageDto | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const applyPages = useCallback((discovered: PageDto[]) => {
    setPages(discovered);
    setSelectedPage((current) => {
      const stillPresent =
        current && discovered.find((p) => p.pageId === current.pageId);
      return stillPresent || discovered[0] || null;
    });
  }, []);

  /**
   * Page discovery, in order of fidelity.
   *
   * There is no "list this account's pages" endpoint. businesses-with-pages is
   * the closest, but its query starts FROM meta.businesses — a Page reached
   * directly by a system user, with no Business Manager above it, has no
   * business row to join to and so comes back as an empty array even though
   * meta.pages holds it and the account reports pageCount > 0.
   *
   * The ingestion checkpoints carry pageId and pageName for every page the
   * pipeline actually runs against, so they cover exactly that case. Both
   * reads hit SQL Server rather than Meta, so page discovery keeps working
   * with an expired token — which is when the stored history matters most.
   */
  const loadPages = useCallback(
    async (accountId: string) => {
      fb.setActiveAccount(accountId);

      const [businessRes, statusRes] = await Promise.allSettled([
        fb.getBusinessesWithPages(),
        fb.getIngestionStatus(),
      ]);

      const byId = new Map<string, PageDto>();

      if (businessRes.status === "fulfilled") {
        const list = businessRes.value ?? [];
        setBusinesses(list);
        for (const business of list) {
          // A page can sit under more than one business — dedupe by id.
          for (const page of business.pages ?? []) {
            if (!byId.has(page.pageId)) byId.set(page.pageId, page);
          }
        }
      } else {
        setBusinesses([]);
      }

      if (byId.size === 0 && statusRes.status === "fulfilled") {
        // One checkpoint row per page per jobType, so dedupe here too.
        for (const cp of statusRes.value?.checkpoints ?? []) {
          if (cp.pageId && !byId.has(cp.pageId)) {
            byId.set(cp.pageId, {
              pageId: cp.pageId,
              pageName: cp.pageName || `Page ${cp.pageId}`,
            });
          }
        }
      }

      if (byId.size > 0) {
        applyPages(Array.from(byId.values()));
        return;
      }

      if (DEFAULT_PAGE_ID) {
        applyPages([
          { pageId: DEFAULT_PAGE_ID, pageName: `Page ${DEFAULT_PAGE_ID}` },
        ]);
        return;
      }

      setPages([]);
      setSelectedPage(null);

      if (businessRes.status === "rejected") {
        setError(
          businessRes.reason instanceof Error
            ? businessRes.reason.message
            : "Failed to load Facebook pages."
        );
      } else {
        setError(
          "No pages found for this account. Run a page sync, or trigger an ingestion run."
        );
      }
    },
    [applyPages]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      // /auth/facebook/status always answers 200 and reports token health per
      // account, so it can explain an empty list without failing the load.
      const [statusRes, accountsRes] = await Promise.allSettled([
        fb.getAuthStatus(),
        fb.listAccounts(),
      ]);
      if (cancelled) return;

      setAuthStatus(statusRes.status === "fulfilled" ? statusRes.value : null);

      if (accountsRes.status !== "fulfilled") {
        setError(
          accountsRes.reason instanceof Error
            ? accountsRes.reason.message
            : "Failed to load linked accounts."
        );
        setLoading(false);
        return;
      }

      const list = accountsRes.value ?? [];
      setAccounts(list);

      if (list.length === 0) {
        setError(
          "No Meta account is linked. Open the OAuth login, or link a token, to get started."
        );
        setLoading(false);
        return;
      }

      const active = list.find((a) => a.status === "active") || list[0];
      setSelectedAccount(active);
      await loadPages(active.accountId);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce, loadPages]);

  const setAccount = useCallback(
    (accountId: string) => {
      const account = accounts.find((a) => a.accountId === accountId);
      if (!account) return;

      setSelectedAccount(account);
      setSelectedPage(null);
      setLoading(true);
      setError(null);
      loadPages(account.accountId).finally(() => setLoading(false));
    },
    [accounts, loadPages]
  );

  const syncPages = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      await fb.syncBusinesses();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Page sync failed.");
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  const setPage = useCallback(
    (pageId: string) => {
      const page = pages.find((p) => p.pageId === pageId);
      if (page) setSelectedPage(page);
    },
    [pages]
  );

  return {
    accounts,
    selectedAccount,
    setAccount,
    businesses,
    pages,
    selectedPage,
    setPage,
    authStatus,
    needsLogin: authStatus !== null && !authStatus.has_account,
    loginUrl: fb.getLoginUrl(),
    syncPages,
    syncing,
    refresh,
    loading,
    error,
  };
}
