import template from "./product-card.hbs";
import "./product-card.scss";

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

export const ProductCard = (props) => {
  const price = Number(
    String(props.price).replace(/\s/g, "").replaceAll(",", "."),
  );

  return template({
    ...props,
    price: Number.isFinite(price) ? priceFormatter.format(price) : props.price,
  });
};
