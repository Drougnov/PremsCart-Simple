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
      const groups = new Map();
      const rank = (d) =>
        ["Pending", "Accepted", "Scheduled"].includes(d.status)
          ? 2
          : d.status === "Completed"
            ? 1
            : 0;
      next.forEach((d) => {
        const key = `${d.listingId}-${d.buyerId}`;
        const old = groups.get(key);
        if (!old) groups.set(key, { ...d, relatedIds: [d.id] });
        else {
          const relatedIds = [...old.relatedIds, d.id];
          groups.set(
            key,
            rank(d) > rank(old) || (rank(d) === rank(old) && d.id > old.id)
              ? { ...d, relatedIds }
              : { ...old, relatedIds },
          );
        }
      });
      setDeals([...groups.values()]);
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
        : d.status === "Rejected"),
  );
  const selected = selectedId
    ? deals.find((d) => d.relatedIds.includes(Number(selectedId)))
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
              {["all", "active", "rejected"].map((value) => (
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
                    : value === "rejected"
                      ? "Rejected"
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
                <span className="trade-thumbnail">
                  <Photo src={deal.imageUrl} category={deal.category} alt="" />
                </span>
                <div className="trade-card-copy">
                  <strong title={deal.title}>{deal.title}</strong>
                  <small>
                    {user.id === deal.buyerId
                      ? deal.sellerName
                      : deal.buyerName}
                  </small>
                  <div className="trade-card-footer">
                    <Badge muted>{deal.status}</Badge>
                    <span className="trade-price">{money(deal.amount)}</span>
                  </div>
                </div>
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
