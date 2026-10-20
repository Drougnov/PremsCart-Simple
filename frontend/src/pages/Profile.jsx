import { useRefreshTick } from "../useRefreshTick";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, Empty, Icon, Loading, Notice } from "../components/UI";

export default function Profile({ id, user }) {
  const refreshTick = useRefreshTick();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api(`/community/profiles/${id}`)
      .then((data) => {
        if (active) {
          setProfile(data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, refreshTick]);
  if (error) return <Notice>{error}</Notice>;
  if (!profile) return <Loading label="Loading profile…" />;
  return (
    <div className="profile-page">
      <a className="back-link" href={user?.role === "Admin" ? "#/admin" : "#/"}>
        ←{" "}
        {user?.role === "Admin"
          ? "Back to administration"
          : "Back to marketplace"}
      </a>
      <section className="profile-header panel">
        <span className="avatar large">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" />
          ) : (
            profile.name[0]
          )}
        </span>
        <span className="eyebrow">YOUR CAMPUS COMMUNITY</span>
        <h1>{profile.name}</h1>
        <p>{profile.department}</p>
        {user?.role === "Admin" && (
          <p>
            {profile.email} · {profile.isSuspended ? "Suspended" : "Active"}
          </p>
        )}
        <div className="profile-actions">
          {user?.id === profile.id && (
            <a className="button secondary" href="#/account">
              Edit profile
            </a>
          )}
          {profile.isVerified && <Badge>✓ University email verified</Badge>}
        </div>
        <div className="profile-stats">
          <div>
            <strong>{profile.completed}</strong>
            <span>Completed trades</span>
          </div>
          <div>
            <strong>{profile.rating ? profile.rating.toFixed(1) : "—"}</strong>
            <span>Average rating / 5</span>
          </div>
          <div>
            <strong>{new Date(profile.joinedAt).getFullYear()}</strong>
            <span>Joined the community</span>
          </div>
        </div>
      </section>
      {user?.role === "Admin" && (
        <section className="panel">
          <h2>Member items</h2>
          {!profile.listings?.length ? (
            <p>No items posted.</p>
          ) : (
            profile.listings.map((l) => (
              <div className="row" key={l.id}>
                <strong>{l.title}</strong>
                <span>
                  {l.isDeleted
                    ? "Deleted"
                    : l.isHidden
                      ? "Hidden"
                      : !l.isApproved
                        ? "Pending approval"
                        : l.status}
                </span>
              </div>
            ))
          )}
        </section>
      )}
      <h2>From the community</h2>
      {profile.reviews.length ? (
        profile.reviews.map((review, i) => (
          <article className="panel review" key={i}>
            <div className="row">
              <strong>{review.author}</strong>
              <span
                className="stars"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
            </div>
            <p>{review.comment}</p>
            <small>{new Date(review.createdAt).toLocaleDateString()}</small>
          </article>
        ))
      ) : (
        <Empty title="A fresh start">
          Reviews appear after completed trades.
        </Empty>
      )}
    </div>
  );
}
