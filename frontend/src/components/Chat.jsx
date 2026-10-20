import { useEffect, useRef, useState } from "react";
import { api, dateTime } from "../api";
import { ActionForm, Icon, Loading, Notice } from "./UI";

export default function Chat({ dealId, listingId, user, otherName }) {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(false);
  const box = useRef(null);
  const stickToBottom = useRef(true);
  const requestNumber = useRef(0);
  const active = useRef(true);

  async function loadMessages() {
    const request = ++requestNumber.current;
    const data = await api(`/deals/${dealId}/messages`);
    if (active.current && request === requestNumber.current) {
      setMessages(data);
      setError("");
    }
  }
  useEffect(() => {
    active.current = true;
    let timer;
    async function poll() {
      try {
        await loadMessages();
      } catch (e) {
        if (active.current) setError(e.message);
      } finally {
        if (active.current) {
          setLoading(false);
          timer = setTimeout(poll, 4000);
        }
      }
    }
    poll();
    return () => {
      active.current = false;
      clearTimeout(timer);
      requestNumber.current++;
    };
  }, [dealId]);

  function scrollToLatest() {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
    stickToBottom.current = true;
    setUnread(false);
  }
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (stickToBottom.current) scrollToLatest();
    else if (lastId) setUnread(true);
  }, [lastId]);

  return (
    <div className="panel chat-panel">
      <div className="chat-heading">
        <span className="avatar">
          <Icon name="chat" size={18} />
        </span>
        <div>
          <h3>{otherName || "Your conversation"}</h3>
          <small>Private trade conversation</small>
          {listingId && <a className="chat-item-link" href={`#/item/${listingId}`}>View item →</a>}
        </div>
      </div>
      <Notice>{error}</Notice>
      <div
        className="messages"
        ref={box}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Chat messages"
        onScroll={() => {
          const el = box.current;
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 70;
          if (stickToBottom.current) setUnread(false);
        }}
      >
        {loading ? (
          <Loading label="Loading messages…" />
        ) : !messages.length ? (
          <div className="chat-empty">
            <Icon name="chat" size={28} />
            <h3>Start with hello.</h3>
            <p>Ask about the item or agree on a campus pickup.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              className={`message ${message.senderId === user.id ? "own" : ""}`}
              key={message.id}
            >
              <p>{message.body}</p>
              <small>{dateTime(message.sentAt)}</small>
            </div>
          ))
        )}
      </div>
      {unread && (
        <button className="chip latest-messages" onClick={scrollToLatest}>
          New messages ↓
        </button>
      )}
      <ActionForm
        label={
          <>
            <Icon name="arrow" size={16} />
            <span>Send</span>
          </>
        }
        className="message-form"
        onSubmit={async (values, form) => {
          if (!values.body.trim()) throw new Error("Write a message first.");
          await api(`/deals/${dealId}/messages`, {
            method: "POST",
            body: { body: values.body.trim() },
          });
          form.reset();
          stickToBottom.current = true;
          try {
            await loadMessages();
          } catch {
            setError(
              "Message sent. Reconnecting to load the latest conversation…",
            );
          }
        }}
      >
        <label className="sr-only" htmlFor="message">
          Your message
        </label>
        <input
          id="message"
          name="body"
          required
          maxLength="1500"
          autoComplete="off"
          placeholder="Write a message…"
        />
      </ActionForm>
    </div>
  );
}
