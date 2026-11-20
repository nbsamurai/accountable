import { Link } from "react-router";
import { LateBadge } from "../components/LateBadge";
import { StagePill } from "../components/Pill";
import styles from "../components/RecordPage.module.css";
import { date, money } from "../lib/format";
import type { Deal } from "./queries";

export function LinkedDeals({
  deals,
  showCloseDate = false,
}: {
  deals: Deal[];
  showCloseDate?: boolean;
}) {
  if (!deals.length) return <p className={styles.muted}>No deals yet.</p>;

  return (
    <div className={styles.tableScroll} role="region" aria-label="Linked deals">
      <table aria-label="Deals" className={styles.relatedTable}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Stage</th>
            <th scope="col">Value</th>
            <th scope="col">
              {showCloseDate ? "Close date" : <span className="sr-only">Timing</span>}
            </th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id}>
              <td>
                <Link to={`/deals/${deal.id}`}>{deal.name}</Link>
              </td>
              <td>
                <StagePill value={deal.stage} />
              </td>
              <td className="mono">{money(deal.value)}</td>
              <td className={styles.dateCell}>
                {showCloseDate && date(deal.close_date)}
                {deal.late && <LateBadge />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
