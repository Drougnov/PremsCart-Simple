import DeleteItem from "../components/DeleteItem";
import { useRefreshTick } from "../useRefreshTick";
import { useEffect, useState } from "react";
import { api, money } from "../api";
import {
  ActionForm,
  Badge,
  Icon,
  Loading,
  Notice,
  Photo,
} from "../components/UI";

export default function ListingDetail({ id, user }) {
  const refreshTick = useRefreshTick();
  const [expanded, setExpanded] = useState(false);
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [existingDeal, setExistingDeal] = useState(null);
  const [checkingDeal, setCheckingDeal] = useState(!!user);
  const [dealError, setDealError] = useState("");
  useEffect(() => {
    if (!user) return;
    let active = true;
    api("/deals")
      .then((deals) => {
        if (active) setDealError("");
        if (active)
          setExistingDeal(
            deals.find(
              (d) =>
                d.listingId === Number(id) &&
                d.buyerId === user.id &&
                ["Pending", "Accepted", "Scheduled"].includes(d.status),
            ),
          );
      })
      .catch((e) => {
        if (active) setDealError(e.message);
      })
      .finally(() => {
        if (active) setCheckingDeal(false);
      });
    return () => {
      active = false;
    };
  }, [id, user?.id, refreshTick]);
  useEffect(() => {
    let active = true;
    api(`/listings/${id}`)
      .then((data) => {
        if (active) {
          setItem(data);
          setError("");
        }
      })
      .catch(
        (e) =>
          active &&
          setError(e.status === 404 ? "This item is unavailable." : e.message),
      );
    return () => {
      active = false;
    };
  }, [id, refreshTick]);
  if (error) return <Notice>{error}</Notice>;
  if (!item) return <Loading label="Loading this find…" />;
  return (
    <>
      <a className="back-link" href="#/">
        ← Back to marketplace
      </a>
      <section className="detail-layout">
        <div className="detail-image">
          <Photo
            src={item.imageUrl}
            alt={item.title}
            category={item.category}
          />
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{item.category}</span>
          <h1>{item.title}</h1>
          <div className="row">
            <Badge>{item.condition}</Badge>
            <Badge muted>{item.status}</Badge>
          </div>
          <div className="detail-price">{money(item.price)}</div>
          <p className="subtle">
            {item.negotiable
              ? "A fair offer is always welcome."
              : "This item has a fixed price."}
          </p>
          <div className="description">
            <p>
              {expanded ||
              (item.description.length <= 180 &&
                item.description.split("\n").length <= 4)
                ? item.description
                : `${item.description.split("\n").slice(0, 4).join("\n").slice(0, 180).trimEnd()}…`}
            </p>
            {(item.description.length > 180 ||
              item.description.split("\n").length > 4) && (
              <button
                className="text-button"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "See less" : "See more"}
              </button>
            )}
          </div>
          <a className="seller-box" href={`#/profile/${item.sellerId}`}>
            <span className="avatar">
              {item.sellerAvatarUrl ? (
                <img src={item.sellerAvatarUrl} alt="" />
              ) : (
                item.sellerName[0]
              )}
            </span>
            <span>
              <strong>{item.sellerName}</strong>
              <small>{item.department}</small>
            </span>
            {item.isVerified && (
              <span className="verified">
                <Icon name="shield" size={13} /> Verified
              </span>
            )}
          </a>
          {user?.id === item.sellerId ? (
            <div className="notice success">
              <DeleteItem id={item.id} onDeleted={() => { location.hash = "/mine"; }} />
              This is your item.{" "}
              {item.status === "Available" ? (
                <a href={`#/edit/${item.id}`}>Edit your item</a>
              ) : (
                <span>Reserved or sold items cannot be edited.</span>
              )}
            </div>
          ) : checkingDeal ? (
            <Loading label="Checking your offers…" />
          ) : existingDeal ? (
            <a className="button full" href={`#/trades/${existingDeal.id}`}>
              <Icon name="chat" size={17} />
              Open your trade
            </a>
          ) : item.status !== "Available" ? (
            <Notice>This item is already reserved or sold.</Notice>
          ) : !user ? (
            <a
              className="button full"
              href={`#/login?next=${encodeURIComponent(`/item/${id}`)}`}
            >
              Sign in to make a deal
            </a>
          ) : (
            <ActionForm
              label={
                item.negotiable ? "Send offer & start chat" : "Request to buy"
              }
              onSubmit={async (values) => {
                const result = await api("/deals", {
                  method: "POST",
                  body: {
                    listingId: item.id,
                    amount: item.negotiable
                      ? Number(values.amount)
                      : item.price,
                  },
                });
                location.hash = `/trades/${result.id}`;
              }}
            >
              {item.negotiable ? (
                <label>
                  Your offer (৳)
                  <input
                    name="amount"
                    type="number"
                    step="1"
                    min="1"
                    max="1000000"
                    defaultValue={item.price}
                    readOnly={!item.negotiable}
                    required
                  />
                </label>
              ) : (
                <div className="fixed-price-summary">
                  <strong>{money(item.price)}</strong>
                  <Badge>Fixed price</Badge>
                </div>
              )}
            </ActionForm>
          )}
          <Notice>{dealError}</Notice>
          <p className="pickup-note">
            <Icon name="pin" /> Meet at Main Gate, Library, or Cafeteria.
          </p>
          {user && user.id !== item.sellerId && !reported && (
            <button
              className="text-button report-link"
              onClick={() => setReporting(!reporting)}
            >
              {reporting ? "Close report" : "Report this item"}
            </button>
          )}
          {reported && (
            <Notice success>
              Report sent. An administrator will review this item.
            </Notice>
          )}
          {reporting && (
            <ActionForm
              label="Send report"
              successText="Thank you. An administrator will review this item."
              onSubmit={async (values) => {
                await api("/community/reports", {
                  method: "POST",
                  body: { listingId: item.id, reason: values.reason },
                });
                setReported(true);
                setReporting(false);
              }}
            >
              <label>
                What seems wrong?
                <textarea
                  name="reason"
                  required
                  maxLength="1000"
                  placeholder="Describe spam, misleading details, or another concern."
                />
              </label>
            </ActionForm>
          )}
        </div>
      </section>
    </>
  );
}
