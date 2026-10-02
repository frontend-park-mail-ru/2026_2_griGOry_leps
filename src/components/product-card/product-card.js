import template from "./product-card.hbs";
import "./product-card.scss";

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("ru-RU");

export const ProductCard = (props) => {
  const price = Number(
    String(props.price).replace(/\s/g, "").replaceAll(",", "."),
  );
  const createdAt = props.created_at ? new Date(props.created_at) : null;

  return template({
    ...props,
    price: Number.isFinite(price) ? priceFormatter.format(price) : props.price,
    createdAt:
      createdAt && !Number.isNaN(createdAt.getTime())
        ? dateFormatter.format(createdAt)
        : "",
  });
};
