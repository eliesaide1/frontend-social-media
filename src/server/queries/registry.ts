import "server-only";

import { p, query } from "@/lib/db";
import { resolveAccountId } from "@/lib/tenancy";
import type { BusinessWithPagesDto } from "@/types/facebook";

/**
 * The account's businesses and their pages — the page picker's source.
 *
 * A straight read of what page sync stored. Unlike the API's businesses-with-pages,
 * which starts FROM meta.businesses, this also returns pages that have no Business
 * Manager above them (a page reached directly by a system user). Those are grouped
 * under a "No business" entry with an empty businessId. Discovering NEW pages still
 * needs Meta, which is what "Sync pages" (sync-businesses-as-pages on the API) does;
 * it writes meta.businesses / meta.pages, and the picker then re-reads them here.
 */
export async function getBusinessesWithPages(
  accountId?: string | null
): Promise<BusinessWithPagesDto[]> {
  const account = await resolveAccountId(accountId);

  const rows = await query<{
    business_id: string | null;
    business_name: string | null;
    discovered_at: Date | null;
    page_id: string | null;
    page_name: string | null;
  }>(
    `SELECT b.business_id, b.[name] AS business_name, b.discovered_at,
            p.page_id, p.[name] AS page_name
     FROM meta.businesses AS b
     LEFT JOIN meta.pages AS p
       ON p.business_ref_id = b.business_ref_id AND p.account_id = b.account_id
     WHERE b.account_id = @accountId
     UNION ALL
     SELECT NULL, NULL, NULL, p.page_id, p.[name]
     FROM meta.pages AS p
     WHERE p.account_id = @accountId AND p.business_ref_id IS NULL
     ORDER BY business_name, page_name;`,
    [p.uuid("accountId", account)],
    { label: "fb.businessesWithPages" }
  );

  // One row per page; a business with no pages still arrives once, with a null page.
  const grouped = new Map<string, BusinessWithPagesDto>();
  for (const r of rows) {
    const key = r.business_id ?? "";
    let business = grouped.get(key);
    if (!business) {
      business = {
        businessId: key,
        businessName: r.business_id ? r.business_name ?? "" : "No business",
        createdAt: r.discovered_at ? r.discovered_at.toISOString() : null,
        pageCount: 0,
        pages: [],
      };
      grouped.set(key, business);
    }
    if (r.page_id) business.pages.push({ pageId: r.page_id, pageName: r.page_name ?? "" });
  }
  for (const b of grouped.values()) b.pageCount = b.pages.length;
  return [...grouped.values()];
}
