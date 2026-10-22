import { useState } from "react";
import { BellOff, CheckCheck } from "lucide-react";
import Button from "../components/Button.jsx";
import NotificationList from "../components/NotificationList.jsx";
import Card, { PageHeader } from "../components/ui/Card.jsx";
import { FilterSelect } from "../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../components/ui/states.jsx";
import { useAction, useQuery } from "../hooks/useQuery.js";
import { getNotifications, markNotificationsRead } from "../services/core.js";

// The signed-in user's inbox. The service only ever returns their own notifications.
export default function NotificationsPage() {
  const query = useQuery(() => getNotifications({ limit: null }));
  const [filter, setFilter] = useState("all");
  const [run, pending] = useAction();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Updates about applications, interviews and offers. Open one to go to the related record."
        actions={
          query.data?.unread > 0 && (
            <Button variant="secondary" size="sm" loading={pending} onClick={() => run(markNotificationsRead, { success: "All notifications marked as read." })}>
              <CheckCheck aria-hidden="true" size={16} /> Mark all as read
            </Button>
          )
        }
      />
      <Card
        bodyClassName=""
        title={query.data ? `${query.data.unread} unread of ${query.data.total}` : "Inbox"}
        action={
          <FilterSelect
            label="Show"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: "all", label: "All" },
              { value: "unread", label: "Unread only" },
            ]}
          />
        }
      >
        <QueryBoundary query={query} rows={5}>
          {({ items }) => {
            const shown = filter === "unread" ? items.filter((n) => !n.read) : items;
            return shown.length === 0 ? (
              <EmptyState icon={BellOff} title={filter === "unread" ? "No unread notifications" : "No notifications yet"}>
                You'll be notified here when something changes on your applications or interviews.
              </EmptyState>
            ) : (
              <NotificationList items={shown} />
            );
          }}
        </QueryBoundary>
      </Card>
    </div>
  );
}
