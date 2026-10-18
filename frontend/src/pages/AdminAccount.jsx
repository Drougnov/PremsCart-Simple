import { useState } from "react";
import { api } from "../api";
import { ActionForm, Notice, PageTitle } from "../components/UI";
export default function AdminAccount({ user, onUpdate }) {
  const [saved, setSaved] = useState("");
  return (
    <section className="admin-account">
      <PageTitle eyebrow="ADMINISTRATION" title="Account settings">
        Manage your administrator name and password.
      </PageTitle>
      <Notice success>{saved}</Notice>
      <div className="panel">
        <ActionForm
          label="Save account changes"
          onSubmit={async (values, form) => {
            if (
              values.newPassword &&
              values.newPassword !== values.confirmPassword
            )
              throw new Error("New passwords do not match.");
            const updated = await api("/auth/account", {
              method: "PUT",
              body: { ...values, newPassword: values.newPassword || null },
            });
            onUpdate(updated);
            form.reset();
            setSaved("Account updated successfully.");
          }}
        >
          <label>
            Display name
            <input
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </label>
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            New password (optional)
            <input
              name="newPassword"
              type="password"
              minLength={8}
              maxLength={100}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
            />
          </label>
          <small>Leave the new password blank to change only your name.</small>
        </ActionForm>
      </div>
    </section>
  );
}
