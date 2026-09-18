import "server-only";

import { p, query, queryOne } from "@/lib/db";

/**
 * Resolving which rows a request is allowed to see.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE
 * Analytics rows do not hang off the Facebook page id. They hang off `page_ref_id`,
 * a surrogate key, because two accounts can legitimately link the same Facebook
 * Page — an agency and the brand it works for — and a natural key would let one
 * tenant's rows answer the other's queries. A page id is only meaningful once
 * paired with an account.
 *
 * Every read in src/server/queries takes a `pageRefId` obtainable only from
 * `requirePageRef`, which demands an account. That is the whole protection: a query
 * that forgets to scope cannot be written, because it has no way to name a page
 * without coming through here. This mirrors GetPageRefAsync in
 * SqlServerPageRepository, which carries the same warning.
 *
 * One difference from the .NET original: that one MERGEs a page row into existence
 * when ingestion reaches a page before discovery does. This does not — it is a read
 * path, and a page the warehouse has never heard of is a miss, not something to
 * create.
 */

/** (accountId, pageId) -> page_ref_id. Pages are never re-keyed, so this is safe to hold. */
const pageRefCache = new Map<string, string>();

/**
 * Short-lived cache of the linked accounts.
 *
 * Every scoped read begins by resolving an account, and with no explicit id that
 * meant a round trip to the database before the query it actually wanted. Against a
 * remote host that doubled or tripled the cost of each Server Action — measurably:
 * ~500ms per action, of which two thirds was resolution.
 *
 * The TTL is short because linking or unlinking an account must not need a restart
 * to show up, and long enough that a page rendering four widgets resolves once.
 */
const ACCOUNTS_TTL_MS = 30_000;
let accountsCache: { at: number; rows: AccountRow[] } | null = null;

/** Drops the cached accounts — call after linking or unlinking through the API. */
export function invalidateAccountsCache(): void {
  accountsCache = null;
}

export interface AccountRow {
  accountId: string;
  label: string;
  status: string;
  metaUserId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

/** Every linked account. Safe to expose: no token material is selected. */
export async function listAccounts(): Promise<AccountRow[]> {
  const cached = accountsCache;
  if (cached && Date.now() - cached.at < ACCOUNTS_TTL_MS) return cached.rows;

  const rows = await query<{
    account_id: string;
    label: string;
    status: string;
    meta_user_id: string | null;
    expires_at: Date | null;
    created_at: Date;
  }>(
    `SELECT account_id, label, [status], meta_user_id, expires_at, created_at
     FROM meta.accounts
     ORDER BY created_at;`,
    [],
    { label: "tenancy.listAccounts" }
  );

  const accounts = rows.map((r) => ({
    accountId: r.account_id,
    label: r.label,
    status: r.status,
    metaUserId: r.meta_user_id,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));

  accountsCache = { at: Date.now(), rows: accounts };
  return accounts;
}

/**
 * The account a request acts for.
 *
 * Mirrors AccountResolutionMiddleware: an explicit id wins; otherwise the single
 * linked account is used. With two or more linked and none named this REFUSES
 * rather than picking the first — guessing is how one tenant quietly reads
 * another's data, and it fails silently when it happens.
 */
export async function resolveAccountId(explicit?: string | null): Promise<string> {
  const accounts = await listAccounts();

  if (explicit) {
    // Validated against the cached list rather than its own SELECT: the id must be
    // one of these anyway, and the comparison is case-insensitive because SQL Server
    // returns uniqueidentifier uppercase while a browser may send it lowercase.
    const found = accounts.find(
      (a) => a.accountId.toLowerCase() === explicit.toLowerCase()
    );
    if (!found) throw new Error(`No linked account with id ${explicit}.`);
    return found.accountId;
  }

  if (accounts.length === 0)
    throw new Error("No Meta account is linked. Link one before reading analytics.");
  if (accounts.length > 1)
    throw new Error(
      `${accounts.length} accounts are linked; pass an accountId so the read is scoped to one.`
    );

  return accounts[0].accountId;
}

/**
 * page_id -> page_ref_id within one account. Null when that account has not linked
 * that page — which is also what makes an unauthorised page id a miss, not a leak.
 */
export async function resolvePageRef(
  accountId: string,
  pageId: string
): Promise<string | null> {
  if (!accountId || !pageId) return null;

  const key = `${accountId}::${pageId}`;
  const cached = pageRefCache.get(key);
  if (cached) return cached;

  const row = await queryOne<{ page_ref_id: string }>(
    `SELECT page_ref_id
     FROM meta.pages
     WHERE account_id = @accountId AND page_id = @pageId;`,
    [p.uuid("accountId", accountId), p.str("pageId", pageId)],
    { label: "tenancy.resolvePageRef" }
  );

  if (!row) return null;
  pageRefCache.set(key, row.page_ref_id);
  return row.page_ref_id;
}

/**
 * Resolves account and page together, throwing when the pairing is not linked.
 * The single entry point every page-scoped read should use.
 */
export async function requirePageRef(
  pageId: string,
  accountId?: string | null
): Promise<{ accountId: string; pageRefId: string }> {
  const resolvedAccount = await resolveAccountId(accountId);
  const pageRefId = await resolvePageRef(resolvedAccount, pageId);

  if (!pageRefId)
    throw new Error(
      `Page ${pageId} is not linked to the account in scope, or has never been ingested.`
    );

  return { accountId: resolvedAccount, pageRefId };
}

export interface PageRow {
  pageId: string;
  name: string | null;
}

/** Pages this account has linked. */
export async function listPages(accountId: string): Promise<PageRow[]> {
  const rows = await query<{ page_id: string; name: string | null }>(
    `SELECT page_id, [name]
     FROM meta.pages
     WHERE account_id = @accountId
     ORDER BY [name], page_id;`,
    [p.uuid("accountId", accountId)],
    { label: "tenancy.listPages" }
  );

  return rows.map((r) => ({ pageId: r.page_id, name: r.name }));
}
