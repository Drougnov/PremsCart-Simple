import { useEffect, useRef, useState } from "react";
import { api, dateTime } from "../api";
import { useRefreshTick } from "../useRefreshTick";
import { ActionForm, Empty, Icon, Loading, Notice, PageTitle } from "../components/UI";

export default function ModerationInbox({ user }) {
  const tick = useRefreshTick();
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState({});
  const log = useRef(null);
  const nearBottom = useRef(true);
  useEffect(() => {
    let active = true;
    api("/moderation-messages").then(d => { if (active) { setMessages(d); setError(""); } })
      .catch(e => active && setError(e.message));
    return () => { active = false; };
  }, [tick]);
  const groups = new Map();
  [...(messages || [])].sort((a,b) => new Date(a.sentAt) - new Date(b.sentAt) || a.id - b.id).forEach(m => {
    const outgoing = m.senderId === user.id;
    const otherId = outgoing ? m.recipientId : m.senderId;
    const key = `${m.listingId}-${otherId}`;
    if (!groups.has(key)) groups.set(key, { key, title: m.title, otherName: outgoing ? m.recipient : m.sender, messages: [] });
    groups.get(key).messages.push(m);
  });
  const threads = [...groups.values()].reverse().sort((a,b) => new Date(b.messages.at(-1).sentAt) - new Date(a.messages.at(-1).sentAt) || b.messages.at(-1).id - a.messages.at(-1).id);
  const visible = threads.filter(t => `${t.title} ${t.otherName}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = visible.find(t => t.key === selectedKey) || visible[0];
  const latest = selected?.messages.at(-1);
  useEffect(() => { nearBottom.current = true; if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [selected?.key]);
  useEffect(() => { if (nearBottom.current && log.current) log.current.scrollTop = log.current.scrollHeight; }, [latest?.id]);
  return <>
    <PageTitle eyebrow="COMMUNITY CARE" title="Moderation inbox">Discuss items and report outcomes with your campus administration.</PageTitle>
    <Notice>{error}</Notice>
    {!messages ? (!error && <Loading label="Loading conversations…" />) : !messages.length ? <Empty title="No messages yet">Admin messages and report outcomes will appear here.</Empty> :
      <div className="trades-layout inbox-layout">
        <aside className="trade-sidebar inbox-sidebar" aria-label="Inbox conversations">
          <label className="inbox-search">Search conversations<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Item or person…" /></label>
          <div className="trade-list" role="region" aria-label="Conversation list" tabIndex={0}>
            {!visible.length && <p className="subtle">No conversations match your search.</p>}
            {visible.map(t => <button type="button" key={t.key} className={`inbox-thread ${selected?.key === t.key ? "selected" : ""}`} aria-pressed={selected?.key === t.key} onClick={() => setSelectedKey(t.key)}>
              <strong>{t.title}</strong><span>{t.otherName}</span><p>{t.messages.at(-1).senderId === user.id ? "You: " : ""}{t.messages.at(-1).body}</p><small>{dateTime(t.messages.at(-1).sentAt)}</small>
            </button>)}
          </div>
        </aside>
        {selected ? <section className="panel chat-panel inbox-chat" aria-label="Selected conversation">
          <div className="chat-heading"><span className="avatar"><Icon name="chat" size={18} /></span><div><h3>{selected.otherName}</h3><small>{selected.title}</small></div></div>
          <div className="messages" role="log" aria-label="Moderation messages" aria-live="polite" aria-relevant="additions" ref={log} onScroll={e => { const el=e.currentTarget; nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight < 70; }}>
            {selected.messages.map(m => <div key={m.id} className={`message ${m.senderId === user.id ? "own" : ""}`}><p>{m.body}</p><small>{dateTime(m.sentAt)}</small></div>)}
          </div>
          <ActionForm key={selected.key} label="Send reply" className="message-form" onSubmit={async values => {
            const key = selected.key; const text = values.body.trim();
            if (!text) throw new Error("Write a message first.");
            await api(`/moderation-messages/${latest.id}/reply`, { method: "POST", body: { body: text } });
            setDrafts(old => ({...old, [key]: old[key]?.trim() === text ? "" : old[key]})); nearBottom.current = true;
          }}>
            <label className="sr-only" htmlFor="inbox-reply">Your reply</label>
            <input id="inbox-reply" name="body" required maxLength={1500} autoComplete="off" placeholder="Write a message…" value={drafts[selected.key] || ""} onChange={e => setDrafts({...drafts, [selected.key]: e.target.value})} />
          </ActionForm>
        </section> : <Empty title="Choose a conversation">Try another search to find your messages.</Empty>}
      </div>}
  </>;
}
