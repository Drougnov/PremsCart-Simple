import { useState } from "react";
import { api } from "../api";
import { Notice } from "./UI";
export default function DeleteItem({ id, onDeleted }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="delete-item">
      <Notice>{error}</Notice>
      {confirm ? (
        <div className="confirm-box">
          <p>
            Delete this item? It will be removed from your items and the
            marketplace. Trade history stays available.
          </p>
          <div className="row actions">
            <button
              className="button danger small"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api(`/listings/${id}`, { method: "DELETE" });
                  onDeleted?.();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="button secondary small"
          onClick={() => setConfirm(true)}
        >
          Delete item
        </button>
      )}
    </div>
  );
}
