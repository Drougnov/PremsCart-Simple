import { money } from "../api";
import { Badge, Icon, Photo } from "./UI";

export default function ListingCard({ item, manage = false }) {
  return (
    <article className="listing-card">
      <a className="card-image" href={`#/item/${item.id}`}>
        <Photo src={item.imageUrl} alt={item.title} loading="lazy" />
        <span className="image-label">{item.condition}</span>
      </a>
      <div className="card-body">
        <div className="card-meta">
          <span>{item.category}</span>
          <span>{item.negotiable ? "Open to offers" : "Fixed price"}</span>
        </div>
        <a className="card-title" href={`#/item/${item.id}`}>
          {item.title}
        </a>
        <strong className="price">{money(item.price)}</strong>
        <div className="card-footer">
          <span>{item.sellerName}</span>
          <span className="verified">
            <Icon name="shield" size={12} /> Campus
          </span>
        </div>
        {manage && (
          <div className="row">
            <Badge muted>
              {item.isHidden
                ? "Hidden"
                : !item.isApproved
                  ? "Awaiting approval"
                  : item.status}
            </Badge>
            {item.status === "Available" && (
              <a className="button edit-button" href={`#/edit/${item.id}`}>
                <Icon name="edit" size={15} />
                Edit item
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
