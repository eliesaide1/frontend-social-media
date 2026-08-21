"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as fb from "@/services/facebookService";
import { fbApiClient } from "@/services/apiClient";
import type { LinkedAccount, PageDto } from "@/types/facebook";

const DEFAULT_PAGE_ID = process.env.NEXT_PUBLIC_DEFAULT_PAGE_ID || "";

interface AccountContextType {
  accounts: LinkedAccount[];
  selectedAccount: LinkedAccount | null;
  setAccount: (accountId: string) => void;
  pages: PageDto[];
  selectedPage: PageDto | null;
  setPage: (pageId: string) => void;
  loading: boolean;
  error: string | null;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LinkedAccount | null>(null);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to discover pages for the current account
  const fetchPages = useCallback(async (accountId: string) => {
    fbApiClient.setAccountId(accountId);

    // Strategy 1: Try businesses-with-pages
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

    // Strategy 2: Discover pages from warehouse (stored posts have pageId + pageName)
    if (DEFAULT_PAGE_ID) {
      try {
        const posts = await fb.getStoredPosts(DEFAULT_PAGE_ID);
        if (posts.length > 0) {
          // Extract unique pages from stored posts
          const pageMap = new Map<string, PageDto>();
          for (const p of posts) {
            if (!pageMap.has(p.pageId)) {
              pageMap.set(p.pageId, { pageId: p.pageId, pageName: p.pageName });
            }
          }
          const discoveredPages = Array.from(pageMap.values());
          setPages(discoveredPages);
          setSelectedPage(discoveredPages[0]);
          return;
        }
      } catch {
        // warehouse also failed
      }

      // Strategy 3: Fall back to the env var pageId with a generic name
      const fallbackPage: PageDto = { pageId: DEFAULT_PAGE_ID, pageName: `Page ${DEFAULT_PAGE_ID}` };
      setPages([fallbackPage]);
      setSelectedPage(fallbackPage);
      return;
    }

    // No pages discoverable
    setPages([]);
    setSelectedPage(null);
  }, []);

  // On mount: fetch linked accounts
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
        } else {
          setError("No linked accounts found. Link a Facebook account to get started.");
        }
      })
      .catch(async () => {
        // If listAccounts fails entirely, try to work with just the default page
        if (DEFAULT_PAGE_ID) {
          const fallbackPage: PageDto = { pageId: DEFAULT_PAGE_ID, pageName: `Page ${DEFAULT_PAGE_ID}` };
          setPages([fallbackPage]);
          setSelectedPage(fallbackPage);
        } else {
          setError("Failed to load accounts. Check your API connection.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchPages]);

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

  const setPageById = useCallback(
    (pageId: string) => {
      const page = pages.find((p) => p.pageId === pageId);
      if (page) setSelectedPage(page);
    },
    [pages]
  );

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccount,
        setAccount,
        pages,
        selectedPage,
        setPage: setPageById,
        loading,
        error,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
