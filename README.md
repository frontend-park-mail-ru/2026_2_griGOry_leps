# 2026_2_griGOry_leps

Frontend-репозиторий проекта «Go&Get» команды «griGOry_leps» — маркетплейс объявлений (C2C).

## Ссылки

- [Доска задач (YouGile)](https://ru.yougile.com/team/82999ec3673c/GOSH4LEEPS)
- [Репозиторий бэкенда](https://github.com/go-park-mail-ru/2026_2_griGOry_leps)
- [Макеты в Figma](https://www.figma.com/design/azXAN6gTvGAovlElu3VP3b/GoGET-%25E2%2580%2594-Team-Workspace?node-id=0-1&p=f&t=7sQMYz0HqS3QT7iN-0)
- [Deploy](http://161.104.107.201:8001)

## Участники команды

1. [Тимур Ведмецкий](https://github.com/v0rdYT)
2. [Александр Юнцевич](https://github.com/impduckzzz)
3. [Алиса Никитина](https://github.com/AlisaNikitinaa)
4. [Максим Полтинин](https://github.com/reynyng)

## Менторы

- [Арсений](https://t.me/arseniksk) — _Backend_
- [Лёша](https://t.me/Valekirrr) — _Frontend_
- [Миша](https://t.me/mx1262) — _BD_
- [Даниил](https://t.me/Daniil_Sentery) — _UX/UI_

## Технологический стек

- **Язык:** JavaScript (ES-модули, без фреймворка)
- **Шаблоны:** [Handlebars](https://handlebarsjs.com/), шаблоны компилируются при сборке
- **Стили:** SCSS, именование классов по БЭМ
- **Сборка:** [Vite](https://vitejs.dev/)
- **Раздача собранного фронта:** [Express](https://expressjs.com/) (`server.js`)
- **Линтер:** ESLint
- **Документация кода:** JSDoc

## Как работать с задачами

Все задачи, фронтовые и бэковые, ведутся на одной [доске в YouGile](https://ru.yougile.com/team/82999ec3673c/GOSH4LEEPS).

> [!IMPORTANT]
> Название ветки и Pull Request всегда содержат номер задачи (`GOS-###`) —
> это единственное, что связывает код с задачей на доске, так как задача
> и репозиторий живут в разных системах.

1. **Взять задачу.** На доске в YouGile выбрать задачу, назначить на себя, отметить, что взяли в работу

2. **Создать ветку** от `main` с именем `GOS-###`, где `###` — номер задачи:

   ```bash
   git checkout main && git pull
   git checkout -b GOS-12
   ```

3. **Закоммитить** по шаблону `<тип>: <описание>`, типы — в таблице ниже.
   Область в скобках после типа указывать необязательно:

   ```
   feat: добавить форму входа
   fix: не сбрасывать фокус при ошибке валидации
   refactor(router): вынести обработку ссылок в отдельный модуль
   ```

4. **Открыть Pull Request** в `main`, когда код готов к ревью.
   Заголовок — по шаблону `GOS-###: description`, например `GOS-12: Форма входа`.
   В описании PR — ссылка на задачу в YouGile

5. **Получить апрув** от тимлида/ментора

6. **Влить в `main`** через Merge, задачу в YouGile перевести в «Готово» вручную

## Типы коммитов

> [!NOTE]
> Коммиты ветки попадают в `main` как есть, поэтому от их качества зависит
> читаемость истории проекта. Сверху добавляется merge-коммит с названием Pull Request

| Тип | Когда используется |
|---|---|
| `feat` | новая функциональность |
| `fix` | исправление бага |
| `refactor` | код переписан, поведение не изменилось |
| `style` | форматирование и отступы, логика не тронута |
| `test` | тесты |
| `docs` | документация |
| `chore` | конфиги, зависимости, сборка, CI |

## Установка и запуск проекта

### Системные требования

- [Node.js](https://nodejs.org/) 20.11+ (LTS)
- npm (ставится вместе с Node.js)
- запущенный бэкенд (см. [README бэкенда](https://github.com/go-park-mail-ru/2026_2_griGOry_leps))

### Пошаговая инструкция

1. Клонируйте репозиторий:

   ```bash
   git clone https://github.com/frontend-park-mail-ru/2026_2_griGOry_leps.git
   cd 2026_2_griGOry_leps
   ```

2. Создайте локальный файл окружения:

   ```bash
   cp .env.example .env
   ```

   `VITE_API_URL` — адрес API бэкенда, по умолчанию `http://localhost:8080/api`.

3. Установите зависимости:

   ```bash
   npm install
   ```

4. Запустите dev-сервер:

   ```bash
   npm run dev
   ```

Приложение будет доступно на `http://localhost:5173`. Бэкенд должен быть запущен на `http://localhost:8080`, а в его `.env` — `FRONTEND_ORIGIN=http://localhost:5173`, иначе браузер заблокирует запросы по CORS.

### Сборка и запуск как на сервере

```bash
npm run build
npm start
```

Express раздаёт собранный фронт из `dist/` на `http://localhost:8001` (порт меняется переменной `PORT`). В этом режиме в `.env` бэкенда должно быть `FRONTEND_ORIGIN=http://localhost:8001`. Адрес API вшивается в сборку, поэтому после изменения `.env` нужно пересобрать проект.

### Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | dev-сервер Vite с горячей перезагрузкой |
| `npm run build` | сборка в `dist/` |
| `npm start` | раздача `dist/` через Express |
| `npm run lint` | проверка кода ESLint |
| `npm run lint:fix` | автоисправление ошибок ESLint |
| `npm run docs` | генерация JSDoc-документации в `docs/` |
