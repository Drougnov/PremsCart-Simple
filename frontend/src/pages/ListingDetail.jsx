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
  }, [id, user?.id]);
  useEffect(() => {
    api(`/listings/${id}`)
      .then(setItem)
      .catch((e) =>
        setError(e.status === 404 ? "This item is unavailable." : e.message),
      );
  }, [id]);
  if (error) return <Notice>{error}</Notice>;
  if (!item) return <Loading label="Loading this find…" />;
  return (
    <>
      <a className="back-link" href="#/">
        ← Back to marketplace
      </a>
      <section className="detail-layout">
        <div className="detail-image">
          <Photo src={item.imageUrl} alt={item.title} />
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
          <p className="description">{item.description}</p>
          <a className="seller-box" href={`#/profile/${item.sellerId}`}>
            <span className="avatar">{item.sellerName[0]}</span>
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
              This is your item. <a href="#/mine">Manage your items</a>
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
                  body: { listingId: item.id, amount: Number(values.amount) },
                });
                location.hash = `/trades/${result.id}`;
              }}
            >
              <label>
                {item.negotiable ? "Your offer (৳)" : "Price (৳)"}
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
