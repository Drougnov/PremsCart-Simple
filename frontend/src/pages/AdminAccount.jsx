import DepartmentSelect from "../components/DepartmentSelect";
import { useState } from "react";
import { api } from "../api";
import { ActionForm, Notice, PageTitle } from "../components/UI";
export default function AdminAccount({ user, onUpdate }) {
  const [avatar, setAvatar] = useState(user.avatarUrl || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saved, setSaved] = useState("");
  return (
    <section className="admin-account">
      <PageTitle
        eyebrow={user.role === "Admin" ? "ADMINISTRATION" : "YOUR ACCOUNT"}
        title={user.role === "Admin" ? "Account settings" : "Edit profile"}
      >
        Update your photo, personal information, and password.
      </PageTitle>
      <Notice success>{saved}</Notice>
      <div className="panel">
        <h2>Personal information</h2>
        <div className="profile-photo-editor">
          <span className="avatar large">
            {avatar ? <img src={avatar} alt="Profile preview" /> : user.name[0]}
          </span>
          <div className="profile-photo-controls">
            <label className="photo-upload-button">
              <span aria-hidden="true">
                {uploading ? "Uploading…" : "Change photo"}
              </span>
              <input
                type="file"
                aria-label="Profile photo"
                accept="image/png,image/jpeg"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadError("");
                  if (file.size > 2000000) {
                    setUploadError("Choose a photo smaller than 2 MB.");
                    return;
                  }
                  setUploading(true);
                  try {
                    const body = new FormData();
                    body.append("file", file);
                    const result = await api("/auth/photo", {
                      method: "POST",
                      body,
                    });
                    setAvatar(result.imageUrl);
                  } catch (e) {
                    setUploadError(e.message);
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            <small>PNG or JPEG · Maximum 2 MB</small>
            {avatar && (
              <button
                type="button"
                className="text-button"
                disabled={uploading}
                onClick={() => setAvatar("")}
              >
                Remove photo
              </button>
            )}
            <small className="photo-save-hint">
              Save your profile to apply photo changes.
            </small>
          </div>
        </div>
        <Notice>{uploadError}</Notice>
        <ActionForm
          label={uploading ? "Uploading photo…" : "Save profile"}
          onSubmit={async (values) => {
            if (uploading)
              throw new Error("Wait for your photo to finish uploading.");
            const updated = await api("/auth/profile", {
              method: "PUT",
              body: { ...values, avatarUrl: avatar },
            });
            onUpdate(updated);
            setSaved("Profile updated successfully.");
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
            Department
            <DepartmentSelect value={user.department} admin={user.role === "Admin"} />
          </label>
          <label>
            Email
            <input value={user.email} readOnly />
          </label>
          <small>Your verified email stays linked to this account.</small>
        </ActionForm>
      </div>
      <div className="panel">
        <h2>Change password</h2>
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
              body: {
                ...values,
                name: user.name,
                newPassword: values.newPassword || null,
              },
            });
            onUpdate(updated);
            form.reset();
            setSaved("Account updated successfully.");
          }}
        >
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
            New password
            <input
              name="newPassword"
              required
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
          <small>Changing your password signs out your other sessions.</small>
        </ActionForm>
      </div>
    </section>
  );
}
