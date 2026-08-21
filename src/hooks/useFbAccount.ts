"use client";

import { useState, useEffect, useCallback } from "react";
import * as fb from "@/services/facebookService";
import { fbApiClient } from "@/services/apiClient";
import type { LinkedAccount, PageDto } from "@/types/facebook";

const DEFAULT_PAGE_ID = process.env.NEXT_PUBLIC_DEFAULT_PAGE_ID || "";

interface UseFbAccountReturn {
  accounts: LinkedAccount[];
  selectedAccount: LinkedAccount | null;
  setAccount: (accountId: string) => void;
  pages: PageDto[];
  selectedPage: PageDto | null;
  setPage: (pageId: string) => void;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for Facebook account & page selection.
 * Fetches linked accounts, discovers pages, and manages selection state.
 * Each platform page uses its own hook — accounts are not shared globally.
 */
export function useFbAccount(): UseFbAccountReturn {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LinkedAccount | null>(null);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Discover pages for a given account
  const fetchPages = useCallback(async (accountId: string) => {
    fbApiClient.setAccountId(accountId);

    // Try businesses-with-pages first
    try {
      const businesses = await fb.getBusinessesWithPages();
      const allPages = businesses.flatMap((b) => b.pages);
      if (allPages.length > 0) {
        setPages(allPages);
        setSelectedPage(allPages[0]);
        return;
      }
    } catch {
      // endpoint failed, try fallback
    }

    // Fallback: discover pages from warehouse stored posts
    if (DEFAULT_PAGE_ID) {
      try {
        const posts = await fb.getStoredPosts(DEFAULT_PAGE_ID);
        if (posts.length > 0) {
          const pageMap = new Map<string, PageDto>();
          for (const p of posts) {
            if (!pageMap.has(p.pageId)) {
              pageMap.set(p.pageId, { pageId: p.pageId, pageName: p.pageName });
            }
          }
          const discovered = Array.from(pageMap.values());
          setPages(discovered);
          setSelectedPage(discovered[0]);
          return;
        }
      } catch {
        // warehouse also failed
      }

      // Last resort: use env var page ID
      const fallback: PageDto = { pageId: DEFAULT_PAGE_ID, pageName: `Page ${DEFAULT_PAGE_ID}` };
      setPages([fallback]);
      setSelectedPage(fallback);
      return;
    }

    setPages([]);
    setSelectedPage(null);
  }, []);

  // On mount: fetch accounts
  useEffect(() => {
    setLoading(true);
    setError(null);

    fb.listAccounts()
      .then(async (accts) => {
        setAccounts(accts);
        if (accts.length > 0) {
          const active = accts.find((a) => a.status === "active") || accts[0];
          setSelectedAccount(active);
          await fetchPages(active.accountId);
        } else if (DEFAULT_PAGE_ID) {
          // No accounts but we have a default page
          const fallback: PageDto = { pageId: DEFAULT_PAGE_ID, pageName: `Page ${DEFAULT_PAGE_ID}` };
          setPages([fallback]);
          setSelectedPage(fallback);
        } else {
          setError("No linked Facebook accounts found.");
        }
      })
      .catch(async () => {
        if (DEFAULT_PAGE_ID) {
          const fallback: PageDto = { pageId: DEFAULT_PAGE_ID, pageName: `Page ${DEFAULT_PAGE_ID}` };
          setPages([fallback]);
          setSelectedPage(fallback);
        } else {
          setError("Failed to load Facebook accounts.");
        }
      })
      .finally(() => setLoading(false));
  }, [fetchPages]);

  // Switch account
  const setAccount = useCallback(
    (accountId: string) => {
      const account = accounts.find((a) => a.accountId === accountId);
      if (account) {
        setSelectedAccount(account);
        setLoading(true);
        fetchPages(account.accountId).finally(() => setLoading(false));
      }
    },
    [accounts, fetchPages]
  );

  // Switch page
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
    pages,
    selectedPage,
    setPage,
    loading,
    error,
  };
}
