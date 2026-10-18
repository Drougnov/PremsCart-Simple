import { useRefreshTick } from "../useRefreshTick";
import { useEffect, useState } from "react";
import { api, categories, conditions } from "../api";
import ListingCard from "../components/ListingCard";
import { Empty, Icon, Loading, Notice, PageTitle } from "../components/UI";

export default function Marketplace({ mine, user }) {
  const refreshTick = useRefreshTick();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    condition: "",
    maxPrice: "",
    sort: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (refreshTick === 0) setLoading(true);
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ ...filters, mine });
      api(`/listings?${query}`)
        .then((data) => {
          if (active) {
            setItems(data);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, mine, refreshTick]);
  const update = (name, value) =>
    setFilters((old) => ({ ...old, [name]: value }));
  const hasFilters = Object.values(filters).some(Boolean);
  const resetFilters = () =>
    setFilters({
      search: "",
      category: "",
      condition: "",
      maxPrice: "",
      sort: "",
    });
  const categoryIcons = {
    "": "grid",
    Books: "book",
    Electronics: "laptop",
    Stationery: "pen",
    "Project parts": "parts",
    Other: "bag",
  };
  return (
    <>
      {mine ? (
        <PageTitle eyebrow="YOUR SPACE" title="My items">
          Give your pre-loved things a new beginning.
        </PageTitle>
      ) : (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">YOUR CAMPUS. YOUR COMMUNITY.</span>
              <h1>
                Good finds.
                <br />
                Closer to home.
              </h1>
              <p>
                From next-semester textbooks to your next project.
                <br className="desktop-only" /> Buy and sell with students you
                can trust.
              </p>
              <a
                className="button light"
                href="#campus-finds"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("campus-finds").scrollIntoView({
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "instant"
                      : "smooth",
                  });
                  document
                    .getElementById("market-search")
                    .focus({ preventScroll: true });
                }}
              >
                Explore the goods <Icon name="arrow" size={16} />
              </a>
              <div className="hero-note">
                <Icon name="shield" size={17} />
                University-verified students · Campus pickup
              </div>
            </div>
            <div className="hero-art">
              <img
                src="/images/hero.jpg"
                alt="Books and study materials on a student desk"
              />
              <div className="art-caption">
                <Icon name="leaf" size={18} />
                <span>
                  <strong>Good things deserve a second chapter.</strong>
                  <small>Pass it on, right here on campus.</small>
                </span>
              </div>
            </div>
          </section>
          <section className="benefits">
            <div>
              <Icon name="shield" />
              <span>Students you can trust</span>
            </div>
            <div>
              <Icon name="chat" />
              <span>A conversation, then a deal</span>
            </div>
            <div>
              <Icon name="pin" />
              <span>Meet right here on campus</span>
            </div>
          </section>
          <PageTitle
            eyebrow="THE CAMPUS EDIT"
            title={
              user
                ? `Find something for your next chapter`
                : "Your next great find"
            }
          >
            Useful things, fair prices, familiar faces.
          </PageTitle>
        </>
      )}
      <section
        id="campus-finds"
        className="market-controls"
        aria-label="Filter items"
      >
        <div className="search-field">
          <Icon name="search" />
          <input
            id="market-search"
            aria-label="Search items"
            placeholder="Search books, calculators, project parts…"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
          />
        </div>
        <select
          aria-label="Item condition"
          value={filters.condition}
          onChange={(e) => update("condition", e.target.value)}
        >
          <option value="">Any condition</option>
          {conditions.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className="price-filter"
          type="number"
          min="1"
          step="1"
          aria-label="Maximum price in taka"
          placeholder="Max ৳"
          value={filters.maxPrice}
          onChange={(e) => update("maxPrice", e.target.value)}
        />
        <select
          aria-label="Sort items"
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="">Newest first</option>
          <option value="price">Price: low to high</option>
        </select>
      </section>
      <div className="category-row">
        {["", ...categories].map((c) => (
          <button
            key={c}
            aria-pressed={filters.category === c}
            className={`chip ${filters.category === c ? "selected" : ""}`}
            onClick={() => update("category", c)}
          >
            <Icon name={categoryIcons[c]} size={14} />
            {c || "All finds"}
          </button>
        ))}
        {hasFilters && (
          <button className="text-button clear-filters" onClick={resetFilters}>
            <Icon name="close" size={12} /> Clear filters
          </button>
        )}
        <span className="result-count" aria-live="polite">
          {loading ? "Searching…" : `${items.length} items`}
        </span>
      </div>
      <Notice>{error}</Notice>
      {loading ? (
        <Loading cards label="Finding your campus picks…" />
      ) : error ? (
        <Empty
          title="We couldn’t load the items"
          action={
            <button
              className="button secondary"
              onClick={() => setFilters({ ...filters })}
            >
              Try again
            </button>
          }
        >
          Check your connection and try again.
        </Empty>
      ) : items.length ? (
        <div className="listing-grid">
          {items.map((item) => (
            <ListingCard key={item.id} item={item} manage={mine} />
          ))}
        </div>
      ) : (
        <Empty
          title={mine ? "Your first item starts here" : "No finds just yet"}
        >
          {mine
            ? "Use “Sell an item” above to offer something to your campus."
            : "Try a different search or clear the filters."}
        </Empty>
      )}
    </>
  );
}
