import { useEffect, useState } from "react";
import { api, dateTime, money } from "../api";
import { ActionForm, Badge, Icon, Notice } from "./UI";
import Chat from "./Chat";

export default function TradeDetail({ deal, user, refresh }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState("");
  const [now, setNow] = useState(Date.now());
  const [editingPickup, setEditingPickup] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  function localTime(value) {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  const seller = deal.isSeller;
  const otherTurn = deal.lastOfferById !== user.id;
  const pending = deal.status === "Pending";
  const confirmed = seller ? deal.sellerConfirmed : deal.buyerConfirmed;
  const stages = ["Pending", "Accepted", "Scheduled", "Completed"];
  async function action(name, extra = {}) {
    setError("");
    setBusy(true);
    try {
      await api(`/deals/${deal.id}/action`, {
        method: "POST",
        body: { action: name, ...extra },
      });
      setConfirming("");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="trade-workspace">
      <div className="panel trade-summary">
        <div className="row">
          <div>
            <span className="eyebrow">TRADE #{deal.id}</span>
            <h2>{deal.title}</h2>
            <p>
              <strong>You are the {seller ? "seller" : "buyer"}.</strong>
            </p>
            <p>
              With{" "}
              <a href={`#/profile/${seller ? deal.buyerId : deal.sellerId}`}>
                {seller ? deal.buyerName : deal.sellerName}
              </a>
            </p>
          </div>
          <strong className="price">{money(deal.amount)}</strong>
        </div>
        {["Rejected", "Cancelled"].includes(deal.status) ? (
          <Badge muted>{deal.status}</Badge>
        ) : (
          <div className="steps" aria-label={`Trade progress: ${deal.status}`}>
            {stages.map((stage, i) => (
              <div
                key={stage}
                className={stages.indexOf(deal.status) >= i ? "done" : ""}
              >
                <span>{i + 1}</span>
                {stage === "Pending"
                  ? "Offer"
                  : stage === "Scheduled"
                    ? "Pickup"
                    : stage}
              </div>
            ))}
          </div>
        )}
        <Notice>{error}</Notice>
        {pending && (
          <>
            <p>
              {otherTurn
                ? "You have an offer to review."
                : "Your offer is waiting for a response."}
            </p>
            {otherTurn && (
              <>
                <div className="row actions">
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => action("accept")}
                  >
                    Accept {money(deal.amount)}
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setConfirming("reject")}
                  >
                    Decline offer
                  </button>
                </div>
                {deal.negotiable && (
                  <ActionForm
                    label="Send counteroffer"
                    onSubmit={async (values) => {
                      await api(`/deals/${deal.id}/action`, {
                        method: "POST",
                        body: {
                          action: "counter",
                          amount: Number(values.amount),
                        },
                      });
                      await refresh();
                    }}
                  >
                    <label>
                      Your counteroffer (৳)
                      <input
                        name="amount"
                        type="number"
                        min="1"
                        max="1000000"
                        step="1"
                        defaultValue={deal.amount}
                        required
                      />
                    </label>
                  </ActionForm>
                )}
              </>
            )}
          </>
        )}
        {["Accepted", "Scheduled"].includes(deal.status) && (
          <>
            <div className="pickup-box">
              <strong>
                {deal.pickupLocation || "Arrange your campus pickup"}
              </strong>
              <p>{dateTime(deal.pickupTime)}</p>
              <small>
                Agree in chat first. The seller records the plan here. Pay
                directly at handover.
              </small>
            </div>
            {seller &&
              deal.pickupTime &&
              !deal.buyerConfirmed &&
              !deal.sellerConfirmed && (
                <button
                  className="button secondary"
                  onClick={() => setEditingPickup(!editingPickup)}
                >
                  <Icon name="edit" size={15} />
                  {editingPickup ? "Keep current plan" : "Change pickup plan"}
                </button>
              )}
            {seller &&
              (!deal.pickupTime || editingPickup) &&
              !deal.buyerConfirmed &&
              !deal.sellerConfirmed && (
                <ActionForm
                  key={deal.pickupTime || "new-pickup"}
                  label={deal.pickupTime ? "Update pickup" : "Save pickup plan"}
                  onSubmit={async (values) => {
                    await api(`/deals/${deal.id}/action`, {
                      method: "POST",
                      body: {
                        action: "schedule",
                        location: values.location,
                        time: new Date(values.time).toISOString(),
                      },
                    });
                    setEditingPickup(false);
                    await refresh();
                  }}
                >
                  <div className="two-columns">
                    <label>
                      Campus location
                      <select
                        name="location"
                        defaultValue={deal.pickupLocation || "Main Gate"}
                      >
                        <option>Main Gate</option>
                        <option>Library</option>
                        <option>Cafeteria</option>
                      </select>
                    </label>
                    <label>
                      Pickup time (your local time)
                      <input
                        name="time"
                        type="datetime-local"
                        min={localTime(now + 60000)}
                        defaultValue={
                          deal.pickupTime
                            ? localTime(deal.pickupTime)
                            : localTime(Date.now() + 15 * 60000)
                        }
                        required
                      />
                    </label>
                  </div>
                </ActionForm>
              )}
            {deal.status === "Scheduled" && (
              <>
                <p className="subtle">
                  Buyer:{" "}
                  {deal.buyerConfirmed ? "confirmed" : "awaiting handover"} ·
                  Seller:{" "}
                  {deal.sellerConfirmed ? "confirmed" : "awaiting handover"}
                </p>
                <button
                  className="button"
                  disabled={
                    busy ||
                    confirmed ||
                    new Date(deal.pickupTime).getTime() > now
                  }
                  onClick={() => setConfirming("complete")}
                >
                  {confirmed
                    ? "Waiting for the other person"
                    : "Confirm handover complete"}
                </button>
                <small className="block">
                  {new Date(deal.pickupTime).getTime() > now
                    ? "Confirmation opens automatically at the pickup time."
                    : "Confirm only after exchanging the item and payment. Refresh trades to check the other person’s confirmation."}
                </small>
              </>
            )}
          </>
        )}
        {["Pending", "Accepted", "Scheduled"].includes(deal.status) &&
          !deal.buyerConfirmed &&
          !deal.sellerConfirmed && (
            <button
              className="text-button danger"
              disabled={busy}
              onClick={() => setConfirming("cancel")}
            >
              Cancel this trade
            </button>
          )}
        {confirming && (
          <div className="confirm-box">
            <p>
              {confirming === "complete"
                ? "Confirm only after the item and payment have been exchanged."
                : `Are you sure you want to ${confirming === "reject" ? "decline this offer" : "cancel this trade"}?`}
            </p>
            <div className="row">
              <button
                className="button small"
                disabled={busy}
                onClick={() => action(confirming)}
              >
                Yes, confirm
              </button>
              <button
                className="button secondary small"
                onClick={() => setConfirming("")}
              >
                Go back
              </button>
            </div>
          </div>
        )}
        {["Rejected", "Cancelled"].includes(deal.status) && (
          <Notice>
            This trade is {deal.status.toLowerCase()}. Your conversation remains
            in your history.
          </Notice>
        )}
        {deal.status === "Completed" &&
          (deal.reviewed ? (
            <Notice success>
              Your review has been published. Thank you for helping your
              community.
            </Notice>
          ) : (
            <ActionForm
              label="Publish review"
              onSubmit={async (values) => {
                await api("/community/reviews", {
                  method: "POST",
                  body: {
                    dealId: deal.id,
                    rating: Number(values.rating),
                    comment: values.comment,
                  },
                });
                await refresh();
              }}
            >
              <h3>How was your trade?</h3>
              <label>
                Overall rating
                <select name="rating">
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option value={r} key={r}>
                      {r} / 5
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Your experience
                <textarea
                  name="comment"
                  required
                  maxLength="1000"
                  placeholder="Share how communication, promptness, item condition, and handover went."
                />
              </label>
            </ActionForm>
          ))}
      </div>
      <Chat
        dealId={deal.id}
        user={user}
        otherName={seller ? deal.buyerName : deal.sellerName}
      />
    </section>
  );
}
