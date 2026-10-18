import { useEffect, useState } from "react";
import { api, setSessionUser } from "./api";
import { Icon, Loading, Notice } from "./components/UI";
import Marketplace from "./pages/Marketplace";
import Auth from "./pages/Auth";
import ListingDetail from "./pages/ListingDetail";
import ListingForm from "./pages/ListingForm";
import Trades from "./pages/Trades";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";

export default function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  function updateUser(nextUser) {
    setSessionUser(nextUser);
    setUser(nextUser);
  }
  useEffect(() => {
    let active = true;
    async function refreshSession(event) {
      try {
        const current = await api("/auth/me");
        if (active) {
          updateUser(current);
          setError((previous) =>
            previous === "Cannot reach the server. Reconnecting automatically."
              ? ""
              : previous,
          );
        }
      } catch (e) {
        if (active && e.status === 401) updateUser(null);
        else if (active)
          setError("Cannot reach the server. Reconnecting automatically.");
      } finally {
        if (active) setLoading(false);
      }
      if (active && event?.type === "premscart-session-change")
        setError(
          "Your signed-in account changed or expired. Review the account shown above. Use separate browser profiles for buyer and seller.",
        );
    }
    refreshSession();
    const sessionTimer = setInterval(() => {
      if (document.visibilityState !== "hidden") refreshSession();
    }, 15000);
    const change = () => {
      setRoute(location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    window.addEventListener("focus", refreshSession);
    window.addEventListener("premscart-session-change", refreshSession);
    return () => {
      active = false;
      clearInterval(sessionTimer);
      window.removeEventListener("hashchange", change);
      window.removeEventListener("focus", refreshSession);
      window.removeEventListener("premscart-session-change", refreshSession);
    };
  }, []);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      updateUser(null);
      location.hash = "/";
    } catch (e) {
      setError(e.message);
    }
  }
  const [page, id] = route.split("?")[0].split("/").filter(Boolean);
  useEffect(() => {
    if (user?.role === "Admin" && route !== "/admin") location.hash = "/admin";
  }, [user?.role, route]);
  const protectedPage = ["sell", "edit", "mine", "trades", "admin"].includes(
    page,
  );
  let content;
  if (loading) content = <Loading label="Opening your campus marketplace…" />;
  else if (user?.role === "Admin") content = <Admin />;
  else if (page === "login" || (protectedPage && !user))
    content = (
      <Auth
        onLogin={updateUser}
        returnTo={
          protectedPage
            ? route
            : new URLSearchParams(route.split("?")[1]).get("next")
        }
      />
    );
  else if (page === "item" || page === "listing")
    content = <ListingDetail id={id} user={user} />;
  else if (page === "sell" || page === "edit")
    content = <ListingForm id={page === "edit" ? id : null} user={user} />;
  else if (page === "trades") content = <Trades user={user} selectedId={id} />;
  else if (page === "profile") content = <Profile id={id} />;
  else if (page === "admin")
    content =
      user.role === "Admin" ? (
        <Admin />
      ) : (
        <Notice>Administrator access is required.</Notice>
      );
  else if (!page || page === "mine")
    content = <Marketplace mine={page === "mine"} user={user} />;
  else
    content = (
      <div className="empty">
        <h1>Page not found</h1>
        <a href="#/">Return to the marketplace</a>
      </div>
    );

  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content").focus();
        }}
      >
        Skip to content
      </a>
      <div className="campus-strip">
        Made for the Premier University community{" "}
        <span>Buy thoughtfully. Trade locally.</span>
      </div>
      <header className="site-header">
        <div className="nav-wrap">
          <a className="brand" href={user?.role === "Admin" ? "#/admin" : "#/"}>
            <span className="brand-icon">
              <Icon name="bag" />
            </span>
            PremsCart<span className="brand-dot">.</span>
          </a>
          <nav aria-label="Main navigation">
            {user?.role !== "Admin" && (
              <a className={!page ? "active" : ""} href="#/">
                Marketplace
              </a>
            )}
            {user && user.role !== "Admin" && (
              <>
                <a
                  className={page === "trades" ? "active" : ""}
                  href="#/trades"
                >
                  My trades
                </a>
                <a className={page === "mine" ? "active" : ""} href="#/mine">
                  My items
                </a>
              </>
            )}
            {user?.role === "Admin" && (
              <a className={page === "admin" ? "active" : ""} href="#/admin">
                Admin
              </a>
            )}
          </nav>
          <div className="nav-actions">
            {user ? (
              <>
                <a
                  className="avatar"
                  title={user.name}
                  aria-label={
                    user.role === "Admin"
                      ? "Administration account"
                      : `My profile: ${user.name}`
                  }
                  href={
                    user.role === "Admin" ? "#/admin" : `#/profile/${user.id}`
                  }
                >
                  {user.name[0]}
                </a>
                <span className="account-name">{user.name.split(" ")[0]}</span>
                <button
                  className="icon-button signout"
                  aria-label="Sign out"
                  title="Sign out"
                  onClick={logout}
                >
                  <Icon name="logout" size={17} />
                </button>
              </>
            ) : (
              <a className="text-button" href="#/login">
                Sign in
              </a>
            )}
            {user?.role !== "Admin" && page !== "sell" && page !== "edit" && (
              <a className="button small" href="#/sell">
                <Icon name="plus" size={17} />
                Sell an item
              </a>
            )}
          </div>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        key={`${page === "trades" ? "/trades" : route}-${user?.id || "guest"}`}
      >
        {error && (
          <div className="global-notice">
            <Notice>{error}</Notice>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setError("")}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        {content}
      </main>
      <footer>
        <a className="brand" href="#/">
          PremsCart.
        </a>
        <p>A little less waste. A little more community.</p>
        <span>
          Premier University · Campus marketplace ·{" "}
          <a href="/photo-credits.html">Photo credits</a>
        </span>
      </footer>
    </>
  );
}
