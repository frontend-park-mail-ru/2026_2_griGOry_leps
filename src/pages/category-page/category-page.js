import template from './category-page.hbs';
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

    root.innerHTML = template({ name });
};
