let sessionUserId = null;
export function setSessionUser(user) {
  sessionUserId = user?.id ?? null;
}

// All pages use this one function to talk to the C# backend.
export async function api(path, options = {}) {
  const isFile = options.body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "X-PremsCart": "1",
      ...(sessionUserId ? { "X-PremsCart-User": String(sessionUserId) } : {}),
      ...(isFile ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body
      ? isFile
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      data.code === "session_changed" ||
      (response.status === 401 && !path.startsWith("/auth"))
    ) {
      window.dispatchEvent(new Event("premscart-session-change"));
    }
    const validation = data.errors
      ? Object.values(data.errors).flat().join(" ")
      : "";
    const error = new Error(
      data.error ||
        validation ||
        (response.status === 401
          ? "Please sign in to continue."
          : "Could not complete your request. Please try again."),
    );
    error.status = response.status;
    throw error;
  }
  if (options.method && options.method.toUpperCase() !== "GET")
    window.dispatchEvent(new Event("premscart-data-change"));
  return data;
}

export const money = (value) => `৳${Number(value).toLocaleString("en-BD")}`;
export const categories = [
  "Books",
  "Electronics",
  "Stationery",
  "Project parts",
  "Other",
];
export const conditions = ["New", "Like new", "Good", "Fair"];
export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not scheduled";

// Old sample records keep their IDs and history; only their built-in artwork changes.
export function itemPhoto(url) {
  return /^\/images\/(books|electronics|stationery|parts|other)\.svg$/.test(
    url || "",
  )
    ? url.replace(".svg", ".jpg")
    : url || "/images/other.jpg";
}
