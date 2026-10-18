import { useEffect, useState } from "react";
import { api, categories, conditions } from "../api";
import {
  ActionForm,
  Icon,
  Loading,
  Notice,
  PageTitle,
  Photo,
} from "../components/UI";

export default function ListingForm({ id, user }) {
  const [photoCategory, setPhotoCategory] = useState("Books");
  const [item, setItem] = useState(null);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (id)
      api(`/listings/${id}`)
        .then((data) => {
          setItem(data);
          setPhotoCategory(data.category);
          setImage(data.imageUrl);
        })
        .catch((e) => setError(e.message));
  }, [id]);
  async function upload(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = "";
    if (file.size > 2_000_000) {
      setError("Choose an image up to 2 MB (2,000,000 bytes).");
      return;
    }
    if (file.type && !["image/png", "image/jpeg"].includes(file.type)) {
      setError("Choose a PNG or JPEG photo.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const data = await api("/listings/upload", { method: "POST", body });
      setImage(data.imageUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }
  if (id && !item)
    return error ? <Notice>{error}</Notice> : <Loading label="Loading item…" />;
  if (id && item.sellerId !== user.id)
    return (
      <Notice>
        You can only edit your own items. <a href="#/mine">Go to My items</a>
      </Notice>
    );
  if (id && item.status !== "Available")
    return (
      <Notice>
        Reserved or sold items cannot be edited.{" "}
        <a href="#/mine">Go to My items</a>
      </Notice>
    );
  return (
    <>
      <a className="back-link" href="#/mine">
        ← Back to my items
      </a>
      <PageTitle
        eyebrow="PASS SOMETHING GOOD ON"
        title={id ? "Edit your item" : "A new home for your things"}
      >
        A clear photo and honest details make a great first impression.
      </PageTitle>
      <div className="editor-layout">
        <section className="panel">
          <div className="section-heading">
            <span className="step-number">01</span>
            <div>
              <h2>Tell us about your item</h2>
              <p>Details that help someone decide.</p>
            </div>
          </div>
          <ActionForm
            disabled={uploading}
            label={id ? "Save & request approval" : "Submit item for approval"}
            onSubmit={async (values) => {
              if (uploading)
                throw new Error("Please wait for the image upload.");
              await api(id ? `/listings/${id}` : "/listings", {
                method: id ? "PUT" : "POST",
                body: {
                  ...values,
                  price: Number(values.price),
                  negotiable: values.negotiable === "on",
                  imageUrl: image,
                },
              });
              location.hash = "/mine";
            }}
          >
            <label>
              Item title
              <input
                name="title"
                required
                minLength="3"
                maxLength="100"
                defaultValue={item?.title}
                placeholder="e.g. Casio scientific calculator"
              />
            </label>
            <div className="two-columns">
              <label>
                Category
                <select
                  name="category"
                  onChange={(e) => setPhotoCategory(e.target.value)}
                  defaultValue={item?.category}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Condition
                <select
                  name="condition"
                  defaultValue={item?.condition || "Good"}
                >
                  {conditions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea
                name="description"
                required
                minLength="10"
                maxLength="2000"
                rows="5"
                defaultValue={item?.description}
                placeholder="What is included? Mention any wear or faults."
              />
            </label>
            <label>
              Price (৳)
              <input
                name="price"
                type="number"
                min="1"
                max="1000000"
                step="1"
                required
                defaultValue={item?.price}
              />
            </label>
            <label className="checkbox">
              <input
                name="negotiable"
                type="checkbox"
                defaultChecked={item?.negotiable ?? true}
              />
              I’m open to offers
            </label>
          </ActionForm>
        </section>
        <aside className="panel upload-panel">
          <span className="eyebrow">02 / THE FIRST IMPRESSION</span>
          <h2>Your item photo</h2>
          <Photo
            src={image}
            category={photoCategory}
            alt="Selected item preview"
          />
          <label className="upload-label">
            <span>
              <Icon name="camera" size={17} />{" "}
              {uploading ? "Uploading photo…" : "Choose or replace photo"}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={upload}
              disabled={uploading}
            />
          </label>
          <p className="subtle">
            PNG or JPEG · up to 2 MB. Use your own photo so buyers know what to
            expect.
          </p>
          {uploading && <p role="status">Uploading…</p>}
          <Notice>{error}</Notice>
          <div className="tip">
            <strong>Keep it honest.</strong>
            <p>
              Posts are checked by an administrator before appearing in the
              marketplace. Edits are reviewed again.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
