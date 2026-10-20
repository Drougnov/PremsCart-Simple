import { useEffect, useState } from "react";
import { api, dateTime } from "../api";
import { useRefreshTick } from "../useRefreshTick";
import {
  ActionForm,
  Empty,
  Loading,
  Notice,
  PageTitle,
} from "../components/UI";
export default function ModerationInbox({ user }) {
  const tick = useRefreshTick();
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState(null);
  useEffect(() => {
    let active = true;
    api("/moderation-messages")
      .then((d) => {
        if (active) {
          setMessages(d);
          setError("");
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [tick]);
  return (
    <>
      <PageTitle eyebrow="COMMUNITY CARE" title="Moderation inbox">
        Messages about your items and reports. Reply here to discuss a
        moderation decision.
      </PageTitle>
      <Notice>{error}</Notice>
      {!messages ? (
        !error && <Loading />
      ) : !messages.length ? (
        <Empty title="No messages yet">
          Admin messages and report outcomes will appear here.
        </Empty>
      ) : (
        messages.map((m) => (
          <article className="panel moderation-message" key={m.id}>
            <div className="row">
              <strong>
                {m.senderId === user.id
                  ? `To ${m.recipient}`
                  : `From ${m.sender}`}
              </strong>
              <small>{dateTime(m.sentAt)}</small>
            </div>
            <h3>{m.title}</h3>
            <p>{m.body}</p>
            {m.recipientId === user.id && (
              <button
                className="button secondary small"
                onClick={() => setReply(reply === m.id ? null : m.id)}
              >
                {reply === m.id ? "Close reply" : "Reply"}
              </button>
            )}
            {reply === m.id && (
              <ActionForm
                label="Send reply"
                onSubmit={async (v) => {
                  await api(`/moderation-messages/${m.id}/reply`, {
                    method: "POST",
                    body: v,
                  });
                  setReply(null);
                }}
              >
                <label>
                  Your reply
                  <textarea name="body" required maxLength={1500} />
                </label>
              </ActionForm>
            )}
          </article>
        ))
      )}
    </>
  );
}
