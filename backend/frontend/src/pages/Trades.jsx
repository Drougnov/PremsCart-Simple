import { useRefreshTick } from "../useRefreshTick";
import { useEffect, useRef, useState } from "react";
import TradeDetail from "../components/TradeDetail";
import { api, money } from "../api";
import {
  Badge,
  Empty,
  Icon,
  Loading,
  Notice,
  PageTitle,
  Photo,
} from "../components/UI";

export default function Trades({ user, selectedId }) {
  const refreshTick = useRefreshTick();
  const [deals, setDeals] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const requestNumber = useRef(0);
  const alive = useRef(true);
  async function load() {
    const request = ++requestNumber.current;
    try {
      const next = await api("/deals");
      if (!alive.current || request !== requestNumber.current) return;
      setDeals(next);
      setError("");
    } catch (e) {
      if (alive.current && request === requestNumber.current)
        setError(e.message);
    } finally {
      if (alive.current && request === requestNumber.current) {
        setLoading(false);
      }
    }
  }
  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
      requestNumber.current++;
    };
  }, [refreshTick]);
  const visibleDeals = deals.filter(
    (d) =>
      filter === "all" ||
      (filter === "active"
        ? ["Pending", "Accepted", "Scheduled"].includes(d.status)
        : ["Completed", "Cancelled", "Rejected"].includes(d.status)),
  );
  const selected = selectedId
    ? deals.find((d) => d.id === Number(selectedId))
    : visibleDeals[0];
  return (
    <>
      <PageTitle eyebrow="CONVERSATIONS TO HANDOVERS" title="My trades">
        Keep your offers, pickup plans, and conversations in one place.
      </PageTitle>
      <Notice>{error}</Notice>
      {loading ? (
        <Loading label="Loading your trades…" />
      ) : error && !deals.length ? (
        <Empty title="We couldn’t load your trades">
          Reconnecting automatically…
        </Empty>
      ) : !deals.length ? (
        <Empty title="A good deal starts with hello">
          Find an item and send an offer to start a conversation.
        </Empty>
      ) : (
        <div className="trades-layout">
          <aside className="trade-list" aria-label="Your trades">
            <div className="trade-filters" aria-label="Filter trades">
              {["all", "active", "history"].map((value) => (
                <button
                  key={value}
                  className={`chip ${filter === value ? "selected" : ""}`}
                  aria-pressed={filter === value}
                  onClick={() => {
                    setFilter(value);
                    location.hash = "/trades";
                  }}
                >
                  {value === "all"
                    ? "All trades"
                    : value === "history"
                      ? "History (closed)"
                      : "Active"}
                </button>
              ))}
            </div>
            {!visibleDeals.length && (
              <p className="subtle">No trades in this view.</p>
            )}
            {visibleDeals.map((deal) => (
              <a
                key={deal.id}
                href={`#/trades/${deal.id}`}
                aria-current={selected?.id === deal.id ? "page" : undefined}
                className={`trade-item ${selected?.id === deal.id ? "selected" : ""}`}
              >
                <Photo src={deal.imageUrl} alt="" />
                <div>
                  <strong>{deal.title}</strong>
                  <small>
                    {user.id === deal.buyerId
                      ? deal.sellerName
                      : deal.buyerName}
                  </small>
                  <Badge muted>{deal.status}</Badge>
                </div>
                <span>{money(deal.amount)}</span>
              </a>
            ))}
          </aside>
          {!selected && (
            <Empty title="Trade not found">
              This trade is unavailable for your account. Choose a conversation
              from your trades.
            </Empty>
          )}
          {selected && (
            <TradeDetail
              key={selected.id}
              deal={selected}
              user={user}
              refresh={load}
            />
          )}
        </div>
      )}
    </>
  );
}
