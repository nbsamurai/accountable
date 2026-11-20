import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { SkeletonLines } from "../components/Skeleton";
import { dateFull, todayIso } from "../lib/format";
import styles from "./Dashboard.module.css";
import { DealsWonChart } from "./DealsWonChart";
import { FollowUps } from "./FollowUps";
import { Funnel } from "./Funnel";
import { useDashboard } from "./queries";
import { RecentActivity } from "./RecentActivity";
import { RevenueChart } from "./RevenueChart";
import { Scoreboard } from "./Scoreboard";

export default function DashboardPage() {
  const dashboard = useDashboard();
  const data = dashboard.data;
  const today = data?.today ?? todayIso();
  return (
    <>
      <PageHeader title="Dashboard" aside={<p className={styles.tagline}>Here's how sales are going.</p>}
        actions={<time className={styles.today} dateTime={today}>{dateFull(today)}</time>} />
      {dashboard.isPending && <Panel as="div"><SkeletonLines label="Loading dashboard" /></Panel>}
      {dashboard.isError && <Panel title="Couldn't load the dashboard"><Button onPress={() => void dashboard.refetch()}>Try again</Button></Panel>}
      {data && (
        <div className={styles.layout}>
          <div className={styles.stack}>
            <FollowUps activities={data.follow_ups} today={today} />
            <RecentActivity activities={data.recent_activity} today={today} />
          </div>
          <div className={styles.stack}>
            <Scoreboard data={data} />
            <RevenueChart months={data.months} />
            <div className={styles.pair}>
              <Funnel steps={data.funnel} />
              <DealsWonChart months={data.months} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
