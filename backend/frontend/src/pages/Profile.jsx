import { useRefreshTick } from "../useRefreshTick";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, Empty, Icon, Loading, Notice } from "../components/UI";

export default function Profile({ id }) {
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
      <a className="back-link" href="#/">
        ← Back to marketplace
      </a>
      <section className="profile-header panel">
        <span className="avatar large">{profile.name[0]}</span>
        <span className="eyebrow">YOUR CAMPUS COMMUNITY</span>
        <h1>{profile.name}</h1>
        <p>{profile.department}</p>
        {profile.isVerified && <Badge>✓ University email verified</Badge>}
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
