import './category-page.scss';

const categoryNames = {
    auto:        'Авто',
    realty:      'Недвижимость',
    rent:        'Жильё для путешествий',
    home:        'Для дома и дачи',
    parts:       'Запчасти',
    services:    'Услуги',
    electronics: 'Электроника',
    jobs:        'Работа и подработка',
    biznes:      'Бизнес 360',
    clothes:     'Одежда, обувь',
};

export const CategoryPage = (root) => (params) => {
    const name = categoryNames[params.slug] ?? 'Неизвестная категория';

    root.innerHTML = `
        <div class="category-page">
            <nav class="breadcrumbs" aria-label="Хлебные крошки">
                <a href="/" data-link>Главная</a>
                <span class="breadcrumbs__sep" aria-hidden="true">/</span>
                <a href="/categories" data-link>Все категории</a>
                <span class="breadcrumbs__sep" aria-hidden="true">/</span>
                <span>${name}</span>
            </nav>

            <section class="section">
                <h1>${name}</h1>
                <p>Здесь будут объявления категории «${name}».</p>
            </section>
        </div>
    `;
};