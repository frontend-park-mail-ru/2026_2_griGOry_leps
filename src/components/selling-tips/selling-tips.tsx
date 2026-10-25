import './selling-tips.scss';

const TIPS = [
    'Сделайте 3–5 фото при дневном свете',
    'В названии — модель и состояние',
    'Цена чуть ниже рынка — продаётся в 2 раза быстрее',
    'Отвечайте на сообщения в течение часа',
];

export const SellingTips = () => (
    <section class="selling-tips">
        <h2 class="selling-tips__title">Как продать быстрее</h2>
        <ul class="selling-tips__list">
            {TIPS.map((tip) => <li key={tip} class="selling-tips__item">{tip}</li>)}
        </ul>
    </section>
);
