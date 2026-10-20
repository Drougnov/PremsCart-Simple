import { useRefreshTick } from "../useRefreshTick";
import { useEffect, useRef, useState } from "react";
import { api, money } from "../api";
import {
  ActionForm,
  Badge,
  Empty,
  Icon,
  Loading,
  Notice,
  PageTitle,
  Photo,
} from "../components/UI";

export default function Admin() {
  const refreshTick = useRefreshTick();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("listings");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [compose, setCompose] = useState(null);
  const [message, setMessage] = useState("");
  const requestNumber = useRef(0);
  async function load() {
    const request = ++requestNumber.current;
    try {
      const next = await api("/admin");
      if (request !== requestNumber.current) return;
      setData(next);
      setError("");
    } catch (e) {
      if (request === requestNumber.current) setError(e.message);
    }
  }
  useEffect(() => {
    load();
    return () => {
      requestNumber.current++;
    };
  }, [refreshTick]);
  async function act(type, id, action) {
    setBusy(true);
    setMessage("");
    try {
      await api(`/admin/${type}/${id}`, { method: "POST", body: { action } });
      setConfirmation(null);
      await load();
      setMessage("Changes saved successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const matching = (value) =>
    value.toLowerCase().includes(query.trim().toLowerCase());
  const visibleItems =
    data?.listings.filter(
      (item) =>
        matching(`${item.title} ${item.seller}`) &&
        (!pendingOnly || !item.isApproved),
    ) || [];
  const visibleUsers =
    data?.users.filter((member) =>
      matching(`${member.name} ${member.email}`),
    ) || [];
  return (
    <>
      <PageTitle eyebrow="COMMUNITY CARE" title="Administration">
        Review items, resolve reports, and keep your campus marketplace
        trustworthy.
      </PageTitle>
      <Notice>{error}</Notice>
      <Notice success>{message}</Notice>
      {compose && (
        <section className="panel" aria-label="Message item owner">
          <h2>Message owner: {compose.title}</h2>
          <p>
            Discuss this item before approving, hiding, or resolving its report.
          </p>
          <ActionForm
            label="Send message"
            onSubmit={async (values) => {
              await api(`/admin/listings/${compose.id}/message`, {
                method: "POST",
                body: values,
              });
              setCompose(null);
              setMessage("Message sent. Replies will appear in your inbox.");
            }}
          >
            <label>
              Message
              <textarea name="body" required maxLength={1500} />
            </label>
          </ActionForm>
          <button className="text-button" onClick={() => setCompose(null)}>
            Cancel
          </button>
        </section>
      )}
      {confirmation && (
        <div
          className="confirm-box"
          role="region"
          aria-label="Confirm account suspension"
        >
          <h3>Suspend {confirmation.name}?</h3>
          <p>They will lose access until you restore their account.</p>
          <div className="row actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => act("users", confirmation.id, "suspend")}
            >
              Suspend account
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Keep account active
            </button>
          </div>
        </div>
      )}
      {!data ? (
        error ? (
          <Empty title="Administration is unavailable">
            Reconnecting automatically…
          </Empty>
        ) : (
          <Loading label="Loading administration…" />
        )
      ) : (
        <>
          <div className="admin-stats">
            <div className="panel">
              <strong>
                {data.listings.filter((l) => !l.isApproved).length}
              </strong>
              <span>Awaiting approval</span>
            </div>
            <div className="panel">
              <strong>
                {data.reports.filter((r) => !r.isResolved).length}
              </strong>
              <span>Open reports</span>
            </div>
            <div className="panel">
              <strong>{data.users.length}</strong>
              <span>Community members</span>
            </div>
          </div>
          <div className="category-row">
            {["listings", "reports", "users"].map((t) => (
              <button
                key={t}
                className={`chip ${tab === t ? "selected" : ""}`}
                aria-pressed={tab === t}
                onClick={() => {
                  setTab(t);
                  setQuery("");
                  setMessage("");
                  setConfirmation(null);
                }}
              >
                {t === "listings" ? "Items" : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {tab !== "reports" && (
            <div className="admin-tools">
              <div className="search-field">
                <Icon name="search" size={17} />
                <input
                  aria-label={
                    tab === "users"
                      ? "Search members"
                      : "Search items for moderation"
                  }
                  placeholder={
                    tab === "users"
                      ? "Search by name or email…"
                      : "Search by item or seller…"
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {tab === "listings" && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={pendingOnly}
                    onChange={(e) => setPendingOnly(e.target.checked)}
                  />
                  Awaiting approval only
                </label>
              )}
            </div>
          )}
          {tab === "listings" && !visibleItems.length && (
            <Empty title="No items in this view">
              Try a different search or turn off the approval filter.
            </Empty>
          )}
          {tab === "listings" &&
            visibleItems.map((item) => (
              <article className="panel moderation-item" key={item.id}>
                <Photo src={item.imageUrl} alt={item.title} />
                <div className="grow">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <small>
                    {item.seller} · {money(item.price)}
                  </small>
                  <div className="row">
                    <Badge muted>{item.status}</Badge>
                    <Badge>
                      {item.isHidden
                        ? "Hidden"
                        : item.isApproved
                          ? "Approved"
                          : "Pending approval"}
                    </Badge>
                  </div>
                </div>
                <div className="stack">
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setCompose({ id: item.id, title: item.title });
                      window.scrollTo(0, 0);
                    }}
                  >
                    Message owner
                  </button>
                  {!item.isApproved && (
                    <button
                      className="button small"
                      disabled={busy}
                      onClick={() => act("listings", item.id, "approve")}
                    >
                      Approve
                    </button>
                  )}
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() =>
                      act(
                        "listings",
                        item.id,
                        item.isHidden ? "restore" : "hide",
                      )
                    }
                  >
                    {item.isHidden ? "Restore visibility" : "Hide item"}
                  </button>
                </div>
              </article>
            ))}
          {tab === "reports" &&
            (!data.reports.length ? (
              <Empty title="All clear">There are no reports to review.</Empty>
            ) : (
              data.reports.map((report) => (
                <article className="panel" key={report.id}>
                  <div className="row">
                    <h3>{report.title}</h3>
                    <Badge muted>
                      {report.isResolved ? "Resolved" : "Open"}
                    </Badge>
                  </div>
                  <p>{report.reason}</p>
                  <small>Reported by {report.reporter}</small>
                  <div className="row actions">
                    <button
                      className="button secondary small"
                      onClick={() => {
                        setCompose({
                          id: report.listingId,
                          title: report.title,
                        });
                        window.scrollTo(0, 0);
                      }}
                    >
                      Message item owner
                    </button>
                  </div>
                  {!report.isResolved && (
                    <div className="row actions">
                      <button
                        className="button secondary small"
                        disabled={busy}
                        onClick={() => act("reports", report.id, "hide")}
                      >
                        Hide item
                      </button>
                      <button
                        className="button small"
                        disabled={busy}
                        onClick={() => act("reports", report.id, "resolve")}
                      >
                        Mark resolved
                      </button>
                    </div>
                  )}
                </article>
              ))
            ))}
          {tab === "users" && (
            <div className="table-scroll panel">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.name}</strong>
                        <small>{member.email}</small>
                      </td>
                      <td>{member.role}</td>
                      <td>
                        {member.isSuspended
                          ? "Suspended"
                          : member.isVerified
                            ? "Verified"
                            : "Unverified"}
                      </td>
                      <td>
                        <a
                          className="button secondary small"
                          href={`#/profile/${member.id}`}
                        >
                          View profile
                        </a>
                        {member.role !== "Admin" && (
                          <button
                            className="button secondary small"
                            disabled={busy}
                            onClick={() =>
                              member.isSuspended
                                ? act("users", member.id, "restore")
                                : setConfirmation(member)
                            }
                          >
                            {member.isSuspended ? "Restore" : "Suspend"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!visibleUsers.length && (
                    <tr>
                      <td colSpan="4">No members match your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
