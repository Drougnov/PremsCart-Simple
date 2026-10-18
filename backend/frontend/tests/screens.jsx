import assert from "node:assert/strict";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import Marketplace from "../src/pages/Marketplace";
import ListingCard from "../src/components/ListingCard";
import ListingDetail from "../src/pages/ListingDetail";
import ListingForm from "../src/pages/ListingForm";
import Auth from "../src/pages/Auth";
import Trades from "../src/pages/Trades";
import TradeDetail from "../src/components/TradeDetail";
import Chat from "../src/components/Chat";
import Profile from "../src/pages/Profile";
import Admin from "../src/pages/Admin";
import { ActionForm, Photo } from "../src/components/UI";
import { api, setSessionUser } from "../src/api";
const buyer = { id: 2, name: "Buyer Student", role: "Student" };
const seller = { id: 1, name: "Seller Student", role: "Student" };
const item = {
  id: 7,
  title: "Scientific calculator",
  description: "A working calculator in good condition.",
  imageUrl: "/images/electronics.jpg",
  category: "Electronics",
  condition: "Good",
  price: 1200,
  negotiable: true,
  status: "Available",
  sellerId: 1,
  sellerName: "Seller Student",
  department: "CSE",
  isVerified: true,
  isApproved: true,
};
const deal = {
  id: 9,
  listingId: 7,
  title: item.title,
  amount: 1100,
  imageUrl: item.imageUrl,
  buyerId: 2,
  sellerId: 1,
  buyerName: buyer.name,
  sellerName: seller.name,
  lastOfferById: 2,
  status: "Pending",
  negotiable: true,
  isSeller: true,
};
let calls = [];
function mock(handler) {
  calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const body =
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.parse(options.body)
          : undefined;
    const call = {
      path: String(url).replace("/api", ""),
      method: options.method || "GET",
      body,
      headers: options.headers,
    };
    calls.push(call);
    const result = await handler(call);
    if (result === undefined)
      throw new Error(`Unmocked request: ${call.method} ${call.path}`);
    return {
      ok: !result.__status,
      status: result.__status || 200,
      json: async () => result,
    };
  };
}
let passed = 0,
  failed = 0;
async function check(name, run) {
  cleanup();
  setSessionUser(null);
  window.history.replaceState(null, "", "/");
  try {
    await run();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL: ${name}\n${e.stack}`);
  } finally {
    cleanup();
  }
}
const click = (name) => userEvent.click(screen.getByRole("button", { name }));
const submitted = (suffix) =>
  calls.find((c) => c.method === "POST" && c.path.endsWith(suffix));

await check("Product card routes to a working item detail screen", async () => {
  mock((c) =>
    c.path === "/auth/me"
      ? buyer
      : c.path === "/listings/7"
        ? item
        : c.path === "/deals"
          ? []
          : undefined,
  );
  render(<ListingCard item={item} />);
  assert.equal(
    screen.getByRole("link", { name: item.title }).getAttribute("href"),
    "#/item/7",
  );
  cleanup();
  window.history.replaceState(null, "", "/#/item/7");
  render(<App />);
  await screen.findByRole("heading", { name: item.title });
  assert.ok(
    await screen.findByRole("button", { name: "Send offer & start chat" }),
  );
});
await check("Legacy item route remains usable", async () => {
  mock((c) =>
    c.path === "/auth/me"
      ? { __status: 401 }
      : c.path === "/listings/7"
        ? item
        : undefined,
  );
  window.history.replaceState(null, "", "/#/listing/7");
  render(<App />);
  await screen.findByRole("heading", { name: item.title });
});
await check("Unknown route shows recovery link", async () => {
  mock(() => buyer);
  window.history.replaceState(null, "", "/#/missing");
  render(<App />);
  await screen.findByRole("heading", { name: "Page not found" });
  assert.equal(
    screen
      .getByRole("link", { name: "Return to the marketplace" })
      .getAttribute("href"),
    "#/",
  );
});
await check(
  "Guest protected page preserves destination after sign-in",
  async () => {
    mock((c) =>
      c.path === "/auth/me"
        ? { __status: 401 }
        : c.path === "/auth/settings"
          ? { emailDomain: "bscse.puc.ac.bd" }
          : c.path === "/auth/login"
            ? buyer
            : undefined,
    );
    window.history.replaceState(null, "", "/#/sell");
    render(<App />);
    await screen.findByRole("button", { name: "Sign in" });
    fireEvent.change(screen.getByLabelText("University email"), {
      target: { value: "biplob_44009@bscse.puc.ac.bd" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    await click("Sign in");
    await screen.findByRole("heading", { name: "A new home for your things" });
  },
);
await check(
  "Marketplace category, search, sorting and clear filters",
  async () => {
    mock((c) => (c.path.startsWith("/listings?") ? [item] : undefined));
    render(<Marketplace mine={false} user={buyer} />);
    await screen.findByRole("link", { name: item.title });
    await click("Electronics");
    fireEvent.change(screen.getByLabelText("Search items"), {
      target: { value: "calculator" },
    });
    fireEvent.change(screen.getByLabelText("Sort items"), {
      target: { value: "price" },
    });
    await waitFor(() =>
      assert.ok(
        calls.some(
          (c) =>
            c.path.includes("category=Electronics") &&
            c.path.includes("search=calculator") &&
            c.path.includes("sort=price"),
        ),
      ),
    );
    await click("Clear filters");
    assert.equal(screen.getByLabelText("Search items").value, "");
    assert.equal(
      screen
        .getByRole("button", { name: "All finds" })
        .getAttribute("aria-pressed"),
      "true",
    );
  },
);
await check(
  "Marketplace failure offers retry, not a misleading empty result",
  async () => {
    mock(() => ({ __status: 500, error: "Server unavailable" }));
    render(<Marketplace mine={false} />);
    await screen.findByRole("button", { name: "Try again" });
    assert.equal(screen.queryByText("No finds just yet"), null);
  },
);
await check(
  "My items has a prominent edit action without another sell CTA",
  async () => {
    mock(() => [item]);
    render(<Marketplace mine user={seller} />);
    assert.equal(
      (await screen.findByRole("link", { name: "Edit item" })).getAttribute(
        "href",
      ),
      "#/edit/7",
    );
    assert.equal(screen.queryByRole("link", { name: "Sell an item" }), null);
  },
);
await check("Failed product image displays a meaningful fallback", async () => {
  render(<Photo src="/broken.jpg" alt="Calculator photo" />);
  fireEvent.error(screen.getByRole("img"));
  assert.ok(screen.getByText("Photo unavailable"));
});
await check(
  "New buyer offer uses whole-taka value and opens the trade",
  async () => {
    mock((c) =>
      c.path === "/listings/7"
        ? item
        : c.path === "/deals" && c.method === "GET"
          ? []
          : c.path === "/deals"
            ? { id: 9 }
            : undefined,
    );
    render(<ListingDetail id="7" user={buyer} />);
    await screen.findByRole("button", { name: "Send offer & start chat" });
    const input = screen.getByLabelText("Your offer (৳)");
    assert.equal(input.step, "1");
    fireEvent.change(input, { target: { value: "1100" } });
    await click("Send offer & start chat");
    assert.equal(submitted("/deals").body.amount, 1100);
    assert.equal(location.hash, "#/trades/9");
  },
);
await check(
  "Existing offer opens its conversation instead of creating a duplicate",
  async () => {
    mock((c) =>
      c.path === "/listings/7"
        ? item
        : c.path === "/deals"
          ? [deal]
          : undefined,
    );
    render(<ListingDetail id="7" user={buyer} />);
    assert.equal(
      (
        await screen.findByRole("link", { name: "Open your trade" })
      ).getAttribute("href"),
      "#/trades/9",
    );
    assert.equal(
      screen.queryByRole("button", { name: "Send offer & start chat" }),
      null,
    );
  },
);
await check("Fixed-price purchase has a read-only amount", async () => {
  mock((c) => (c.path === "/listings/7" ? { ...item, negotiable: false } : []));
  render(<ListingDetail id="7" user={buyer} />);
  await screen.findByRole("button", { name: "Request to buy" });
  assert.ok(screen.getByLabelText("Price (৳)").readOnly);
});
await check("Owner and sold-item screens suppress buying", async () => {
  mock((c) => (c.path === "/listings/7" ? item : []));
  render(<ListingDetail id="7" user={seller} />);
  await screen.findByText("This is your item.", { exact: false });
  assert.equal(screen.queryByRole("button", { name: /Send offer/ }), null);
  cleanup();
  mock((c) => (c.path === "/listings/7" ? { ...item, status: "Sold" } : []));
  render(<ListingDetail id="7" user={buyer} />);
  await screen.findByText("This item is already reserved or sold.");
});
await check("Item reporting submits once and shows confirmation", async () => {
  mock((c) =>
    c.path === "/listings/7"
      ? item
      : c.path === "/deals"
        ? []
        : c.path === "/community/reports"
          ? {}
          : undefined,
  );
  render(<ListingDetail id="7" user={buyer} />);
  await screen.findByRole("button", { name: "Report this item" });
  await click("Report this item");
  fireEvent.change(screen.getByLabelText("What seems wrong?"), {
    target: { value: "Wrong photo" },
  });
  await click("Send report");
  await screen.findByText(
    "Report sent. An administrator will review this item.",
  );
  assert.equal(screen.queryByRole("button", { name: "Send report" }), null);
});
await check(
  "PNG upload is sent as multipart, then saved with its returned path",
  async () => {
    mock((c) =>
      c.path === "/listings/upload"
        ? { imageUrl: "/uploads/test.png" }
        : c.path === "/listings"
          ? { id: 8 }
          : undefined,
    );
    render(<ListingForm user={seller} />);
    fireEvent.change(document.querySelector("input[type=file]"), {
      target: {
        files: [new File(["png"], "photo.png", { type: "image/png" })],
      },
    });
    await waitFor(() =>
      assert.equal(
        screen.getByAltText("Selected item preview").getAttribute("src"),
        "/uploads/test.png",
      ),
    );
    assert.ok(submitted("/listings/upload").body instanceof FormData);
    fireEvent.change(screen.getByLabelText("Item title"), {
      target: { value: "My calculator" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A working calculator for class." },
    });
    fireEvent.change(screen.getByLabelText("Price (৳)"), {
      target: { value: "1000" },
    });
    await click("Submit item for approval");
    assert.equal(submitted("/listings").body.imageUrl, "/uploads/test.png");
    assert.equal(location.hash, "#/mine");
  },
);
await check("Oversize photo is rejected before upload", async () => {
  mock(() => {});
  render(<ListingForm user={seller} />);
  fireEvent.change(document.querySelector("input[type=file]"), {
    target: {
      files: [
        new File([new Uint8Array(2_000_001)], "photo.png", {
          type: "image/png",
        }),
      ],
    },
  });
  assert.ok(screen.getByText(/2,000,000 bytes/));
  assert.equal(calls.length, 0);
});
await check("Editing someone else’s item is blocked in the UI", async () => {
  mock(() => item);
  render(<ListingForm id="7" user={buyer} />);
  await screen.findByText(/You can only edit your own items/);
  assert.equal(screen.queryByLabelText("Item title"), null);
});
await check(
  "Sign-in supports password visibility and keeps the email underscore",
  async () => {
    mock((c) =>
      c.path === "/auth/settings" ? { emailDomain: "bscse.puc.ac.bd" } : buyer,
    );
    let loggedIn;
    render(
      <Auth
        onLogin={(u) => {
          loggedIn = u;
        }}
        returnTo="/item/7"
      />,
    );
    fireEvent.change(screen.getByLabelText("University email"), {
      target: { value: "biplob_44009@bscse.puc.ac.bd" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    await click("Show password");
    assert.equal(screen.getByLabelText("Password").type, "text");
    await click("Sign in");
    assert.equal(loggedIn.id, 2);
    assert.equal(
      submitted("/auth/login").body.email,
      "biplob_44009@bscse.puc.ac.bd",
    );
    assert.equal(location.hash, "#/item/7");
  },
);
await check("Registration, resend and email verification flow", async () => {
  mock((c) =>
    c.path === "/auth/settings" ? { emailDomain: "bscse.puc.ac.bd" } : buyer,
  );
  render(<Auth onLogin={() => {}} />);
  await click("New here? Create an account");
  for (const [label, value] of [
    ["Full name", "A Student"],
    ["Department", "CSE"],
    ["University email", "student@bscse.puc.ac.bd"],
    ["Password", "password123"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  await click("Create account");
  await screen.findByRole("button", { name: "Verify email" });
  await click("Resend code");
  assert.ok(submitted("/auth/resend"));
  fireEvent.change(screen.getByLabelText("Verification code"), {
    target: { value: "123456" },
  });
  await click("Verify email");
  assert.equal(location.hash, "#/profile/2");
  assert.equal(calls.filter((c) => c.path === "/auth/login").length, 0);
});
await check(
  "Unavailable selected trade does not silently open another trade",
  async () => {
    mock((c) => (c.path === "/deals" ? [deal] : []));
    render(<Trades user={seller} selectedId="999" />);
    await screen.findByText("Trade not found");
    assert.equal(screen.queryByText("TRADE #9"), null);
  },
);
await check("Trade history filter isolates finished trades", async () => {
  mock((c) =>
    c.path === "/deals"
      ? [
          deal,
          { ...deal, id: 10, title: "Completed book", status: "Completed" },
        ]
      : [],
  );
  render(<Trades user={seller} selectedId="9" />);
  await screen.findByText("TRADE #9");
  await click("History (closed)");
  const list = screen.getByLabelText("Your trades");
  assert.equal(list.querySelectorAll("a").length, 1);
  assert.ok(list.textContent.includes("Completed book"));
});
await check(
  "Offer recipient can accept or submit an integer counteroffer",
  async () => {
    mock((c) => (c.path.endsWith("/messages") ? [] : {}));
    let refreshed = 0;
    render(
      <TradeDetail
        deal={deal}
        user={seller}
        refresh={async () => refreshed++}
      />,
    );
    await click("Accept ৳1,100");
    assert.equal(submitted("/action").body.action, "accept");
    fireEvent.change(screen.getByLabelText("Your counteroffer (৳)"), {
      target: { value: "1150" },
    });
    await click("Send counteroffer");
    assert.ok(
      calls.some((c) => c.body?.action === "counter" && c.body.amount === 1150),
    );
    assert.equal(refreshed, 2);
  },
);
await check("Sender cannot accept their own pending offer", async () => {
  mock(() => []);
  render(
    <TradeDetail
      deal={{ ...deal, isSeller: false }}
      user={buyer}
      refresh={async () => {}}
    />,
  );
  assert.equal(screen.queryByRole("button", { name: /Accept ৳/ }), null);
  assert.ok(screen.getByText("Your offer is waiting for a response."));
});
await check(
  "Seller pickup sends the permitted location and UTC time",
  async () => {
    mock((c) => (c.path.endsWith("/messages") ? [] : {}));
    render(
      <TradeDetail
        deal={{ ...deal, status: "Accepted" }}
        user={seller}
        refresh={async () => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("Campus location"), {
      target: { value: "Library" },
    });
    await click("Save pickup plan");
    const body = submitted("/action").body;
    assert.equal(body.action, "schedule");
    assert.equal(body.location, "Library");
    assert.ok(body.time.endsWith("Z"));
    assert.ok(new Date(body.time) > new Date());
  },
);
await check(
  "Buyer cannot schedule pickup but early handover is enabled",
  async () => {
    mock(() => []);
    render(
      <TradeDetail
        deal={{
          ...deal,
          isSeller: false,
          status: "Scheduled",
          pickupTime: new Date(Date.now() + 3600000).toISOString(),
          pickupLocation: "Library",
        }}
        user={buyer}
        refresh={async () => {}}
      />,
    );
    assert.equal(screen.queryByLabelText("Campus location"), null);
    assert.equal(
      screen.getByRole("button", { name: "Confirm handover complete" })
        .disabled,
      false,
    );
  },
);
await check("Elapsed handover requires an explicit confirmation", async () => {
  mock((c) => (c.path.endsWith("/messages") ? [] : {}));
  render(
    <TradeDetail
      deal={{
        ...deal,
        status: "Scheduled",
        pickupTime: new Date(Date.now() - 60000).toISOString(),
        pickupLocation: "Library",
      }}
      user={seller}
      refresh={async () => {}}
    />,
  );
  await click("Confirm handover complete");
  assert.equal(submitted("/action"), undefined);
  await click("Yes, confirm");
  assert.equal(submitted("/action").body.action, "complete");
});
await check(
  "Cancellation asks for confirmation; declined trades have no progress bar",
  async () => {
    mock((c) => (c.path.endsWith("/messages") ? [] : {}));
    render(<TradeDetail deal={deal} user={seller} refresh={async () => {}} />);
    await click("Cancel this trade");
    await click("Go back");
    assert.equal(submitted("/action"), undefined);
    await click("Cancel this trade");
    await click("Yes, confirm");
    assert.equal(submitted("/action").body.action, "cancel");
    cleanup();
    render(
      <TradeDetail
        deal={{ ...deal, status: "Rejected" }}
        user={seller}
        refresh={async () => {}}
      />,
    );
    assert.equal(document.querySelector(".steps"), null);
  },
);
await check(
  "Completed trade publishes a review and suppresses an already published form",
  async () => {
    mock((c) => (c.path.endsWith("/messages") ? [] : {}));
    render(
      <TradeDetail
        deal={{ ...deal, status: "Completed" }}
        user={seller}
        refresh={async () => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("Your experience"), {
      target: { value: "Friendly and on time." },
    });
    await click("Publish review");
    assert.equal(submitted("/community/reviews").body.rating, 5);
    cleanup();
    render(
      <TradeDetail
        deal={{ ...deal, status: "Completed", reviewed: true }}
        user={seller}
        refresh={async () => {}}
      />,
    );
    assert.equal(
      screen.queryByRole("button", { name: "Publish review" }),
      null,
    );
  },
);
await check("Chat sends, trims, clears and displays the message", async () => {
  let sent = false;
  mock((c) =>
    c.method === "POST"
      ? ((sent = true), {})
      : sent
        ? [
            {
              id: 1,
              senderId: 2,
              body: "Hello there",
              sentAt: new Date().toISOString(),
            },
          ]
        : [],
  );
  render(<Chat dealId={9} user={buyer} otherName={seller.name} />);
  await screen.findByText("Start with hello.");
  fireEvent.change(screen.getByLabelText("Your message"), {
    target: { value: "  Hello there  " },
  });
  await click("Send");
  assert.equal(submitted("/messages").body.body, "Hello there");
  await screen.findByText("Hello there");
  assert.equal(screen.getByLabelText("Your message").value, "");
});
await check("Chat failure retains the draft for retry", async () => {
  mock((c) =>
    c.method === "POST" ? { __status: 500, error: "Send failed" } : [],
  );
  render(<Chat dealId={9} user={buyer} />);
  fireEvent.change(screen.getByLabelText("Your message"), {
    target: { value: "Keep this draft" },
  });
  await click("Send");
  await screen.findByText("Send failed");
  assert.equal(screen.getByLabelText("Your message").value, "Keep this draft");
});
await check("Profile displays reviews, rating and empty state", async () => {
  const profile = {
    name: seller.name,
    department: "CSE",
    isVerified: true,
    joinedAt: "2026-01-01",
    completed: 2,
    rating: 4.5,
    reviews: [
      {
        author: buyer.name,
        rating: 5,
        comment: "Great trade",
        createdAt: "2026-10-01",
      },
    ],
  };
  mock(() => profile);
  render(<Profile id={1} />);
  await screen.findByText("Great trade");
  assert.ok(screen.getByLabelText("5 out of 5 stars"));
  cleanup();
  mock(() => ({ ...profile, reviews: [] }));
  render(<Profile id={1} />);
  await screen.findByText("A fresh start");
});
const adminData = {
  listings: [{ ...item, seller: seller.name, isApproved: false }],
  reports: [
    {
      id: 1,
      listingId: 7,
      title: item.title,
      reason: "Wrong description",
      reporter: buyer.name,
      isResolved: false,
    },
  ],
  users: [
    { ...buyer, email: "buyer@bscse.puc.ac.bd", isVerified: true },
    {
      id: 3,
      name: "Admin",
      role: "Admin",
      email: "admin@bscse.puc.ac.bd",
      isVerified: true,
    },
  ],
};
await check(
  "Admin approval, visibility and report resolution call correct endpoints",
  async () => {
    mock((c) => (c.path === "/admin" ? adminData : {}));
    render(<Admin />);
    await screen.findByRole("button", { name: "Approve" });
    await click("Approve");
    assert.equal(submitted("/listings/7").body.action, "approve");
    await click("Hide item");
    assert.ok(calls.some((c) => c.body?.action === "hide"));
    await click("Reports");
    await click("Mark resolved");
    assert.equal(submitted("/reports/1").body.action, "resolve");
  },
);
await check(
  "Admin user search and suspension confirmation protect against stray clicks",
  async () => {
    mock((c) => (c.path === "/admin" ? adminData : {}));
    render(<Admin />);
    await screen.findByRole("button", { name: "Users" });
    await click("Users");
    fireEvent.change(screen.getByLabelText("Search members"), {
      target: { value: "Buyer" },
    });
    assert.equal(document.querySelectorAll("tbody tr").length, 1);
    await click("Suspend");
    assert.equal(submitted("/users/2"), undefined);
    await click("Suspend account");
    assert.equal(submitted("/users/2").body.action, "suspend");
  },
);
await check("Non-admin account cannot open the admin screen", async () => {
  mock(() => buyer);
  window.history.replaceState(null, "", "/#/admin");
  render(<App />);
  await screen.findByText("Administrator access is required.");
  assert.equal(
    calls.some((c) => c.path === "/admin"),
    false,
  );
});
await check(
  "Action form prevents double submission while a save is pending",
  async () => {
    let finish,
      count = 0;
    render(
      <ActionForm
        onSubmit={() => {
          count++;
          return new Promise((r) => (finish = r));
        }}
      >
        <input name="value" defaultValue="test" />
      </ActionForm>,
    );
    const form = screen.getByRole("button", { name: "Save" }).closest("form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    assert.equal(count, 1);
    await act(async () => finish());
  },
);
await check(
  "Stale session error dispatches account-refresh event",
  async () => {
    mock(() => ({
      __status: 409,
      code: "session_changed",
      error: "Account changed",
    }));
    let notified = false;
    const listener = () => {
      notified = true;
    };
    window.addEventListener("premscart-session-change", listener);
    await assert.rejects(api("/deals"), /Account changed/);
    assert.ok(notified);
    window.removeEventListener("premscart-session-change", listener);
  },
);

await check("Decimal prices fail native form validity", async () => {
  mock(() => ({}));
  render(<ListingForm user={seller} />);
  const price = screen.getByLabelText("Price (৳)");
  fireEvent.change(price, { target: { value: "1200.5" } });
  assert.equal(price.checkValidity(), false);
  fireEvent.change(price, { target: { value: "1200" } });
  assert.equal(price.checkValidity(), true);
});
await check("Saving is disabled while a photo upload is pending", async () => {
  let finish;
  mock(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<ListingForm user={seller} />);
  fireEvent.change(document.querySelector("input[type=file]"), {
    target: { files: [new File(["png"], "photo.png", { type: "image/png" })] },
  });
  assert.ok(
    screen.getByRole("button", { name: "Submit item for approval" }).disabled,
  );
  await act(async () => finish({ imageUrl: "/uploads/new.png" }));
  assert.equal(
    screen.getByRole("button", { name: "Submit item for approval" }).disabled,
    false,
  );
});
await check(
  "Owner edits preserve photo and submit to the existing item endpoint",
  async () => {
    mock((c) => (c.method === "GET" ? item : {}));
    render(<ListingForm id="7" user={seller} />);
    await screen.findByLabelText("Item title");
    fireEvent.change(screen.getByLabelText("Item title"), {
      target: { value: "Updated calculator" },
    });
    await click("Save & request approval");
    const saved = calls.find((c) => c.method === "PUT");
    assert.equal(saved.path, "/listings/7");
    assert.equal(saved.body.title, "Updated calculator");
    assert.equal(saved.body.imageUrl, item.imageUrl);
  },
);
await check(
  "Pickup confirmation is available before the planned time",
  async () => {
    mock(() => []);
    render(
      <TradeDetail
        deal={{
          ...deal,
          isSeller: false,
          status: "Scheduled",
          pickupTime: new Date(Date.now() + 500).toISOString(),
        }}
        user={buyer}
        refresh={async () => {}}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Confirm handover complete",
    });
    assert.equal(button.disabled, false);
    await waitFor(() => assert.equal(button.disabled, false), {
      timeout: 2000,
    });
  },
);
await check(
  "Existing pickup plan is shown first and editing is an explicit action",
  async () => {
    mock(() => []);
    render(
      <TradeDetail
        deal={{
          ...deal,
          status: "Scheduled",
          pickupTime: new Date(Date.now() + 3600000).toISOString(),
          pickupLocation: "Library",
        }}
        user={seller}
        refresh={async () => {}}
      />,
    );
    assert.equal(screen.queryByLabelText("Campus location"), null);
    await click("Change pickup plan");
    assert.equal(screen.getByLabelText("Campus location").value, "Library");
    await click("Keep current plan");
    assert.equal(screen.queryByLabelText("Campus location"), null);
  },
);
await check(
  "Failed trade loading is not presented as an empty trade history",
  async () => {
    mock(() => ({ __status: 500, error: "Offline" }));
    render(<Trades user={buyer} />);
    await screen.findByText("We couldn’t load your trades");
    assert.equal(screen.queryByText("A good deal starts with hello"), null);
  },
);
await check(
  "Sign-out clears member navigation and returns to marketplace",
  async () => {
    mock((c) =>
      c.path === "/auth/me" ? buyer : c.path.startsWith("/listings?") ? [] : {},
    );
    window.history.replaceState(null, "", "/#/mine");
    render(<App />);
    await screen.findByRole("button", { name: "Sign out" });
    await click("Sign out");
    await screen.findByRole("link", { name: "Sign in" });
    assert.equal(screen.queryByRole("link", { name: "My trades" }), null);
    assert.ok(submitted("/auth/logout"));
  },
);
await check(
  "Suspended member and hidden item can be restored by admin",
  async () => {
    mock((c) =>
      c.path === "/admin"
        ? {
            ...adminData,
            listings: [{ ...adminData.listings[0], isHidden: true }],
            users: [{ ...adminData.users[0], isSuspended: true }],
          }
        : {},
    );
    render(<Admin />);
    await screen.findByRole("button", { name: "Restore visibility" });
    await click("Restore visibility");
    assert.equal(submitted("/listings/7").body.action, "restore");
    await click("Users");
    await click("Restore");
    assert.equal(submitted("/users/2").body.action, "restore");
  },
);

await check("Administrator is redirected away from student pages", async () => {
  mock((c) =>
    c.path === "/auth/me" ? { id: 3, name: "Admin", role: "Admin" } : adminData,
  );
  window.history.replaceState(null, "", "/#/trades");
  render(<App />);
  await screen.findByRole("heading", { name: "Administration" });
  await waitFor(() => assert.equal(location.hash, "#/admin"));
  for (const name of ["My trades", "My items", "Sell an item", "Marketplace"])
    assert.equal(screen.queryByRole("link", { name }), null);
  assert.equal(
    calls.some((c) => c.path === "/deals"),
    false,
  );
});
await check(
  "Deleting a closed trade requires confirmation and removes it from the list",
  async () => {
    let deleted = false;
    mock((c) =>
      c.method === "DELETE"
        ? ((deleted = true), {})
        : c.path === "/deals"
          ? deleted
            ? []
            : [{ ...deal, status: "Cancelled" }]
          : [],
    );
    render(<Trades user={seller} selectedId="9" />);
    await screen.findByRole("button", { name: "Delete trade and chat" });
    await click("Delete trade and chat");
    assert.equal(deleted, false);
    await click("Yes, confirm");
    await screen.findByText("A good deal starts with hello");
    assert.ok(
      calls.some((c) => c.method === "DELETE" && c.path === "/deals/9"),
    );
  },
);
await check("Active trades cannot be deleted directly", async () => {
  mock(() => []);
  render(<TradeDetail deal={deal} user={seller} refresh={async () => {}} />);
  assert.equal(
    screen.queryByRole("button", { name: "Delete trade and chat" }),
    null,
  );
});
await check(
  "Trades refresh automatically and preserve a chat draft",
  async () => {
    let changed = false;
    mock((c) =>
      c.path === "/deals"
        ? [{ ...deal, status: changed ? "Accepted" : "Pending" }]
        : [],
    );
    render(<Trades user={seller} selectedId="9" />);
    await screen.findByText("TRADE #9");
    fireEvent.change(screen.getByLabelText("Your message"), {
      target: { value: "Unsent draft" },
    });
    changed = true;
    await screen.findByRole(
      "button",
      { name: "Save pickup plan" },
      { timeout: 6500 },
    );
    assert.equal(screen.getByLabelText("Your message").value, "Unsent draft");
  },
);
await check(
  "Marketplace reconnect refresh preserves search filters",
  async () => {
    let changed = false;
    mock(() => [{ ...item, title: changed ? "New server title" : item.title }]);
    render(<Marketplace mine={false} user={buyer} />);
    await screen.findByRole("link", { name: item.title });
    fireEvent.change(screen.getByLabelText("Search items"), {
      target: { value: "calculator" },
    });
    changed = true;
    fireEvent(window, new Event("online"));
    await screen.findByRole("link", { name: "New server title" });
    assert.equal(screen.getByLabelText("Search items").value, "calculator");
  },
);
console.log(
  `\n${passed} frontend interaction checks passed; ${failed} failed. Simulated API responses in jsdom, not browser or backend E2E.`,
);
if (failed) process.exitCode = 1;
