# Облако — исходный сайт + серверная часть

Ветка содержит **исходный интерфейс проекта**. HTML-разметка, стили, тарифный калькулятор, SVG-иконки и процедурные 3D-модели Three.js оставлены в исходном виде. Изменена логика хранения данных и входа владельца.

## Что добавлено

- Серверные Vercel Functions: создание заявок, список заявок владельца, изменение статуса/цены/времени/заметки, удаление.
- Supabase Postgres для заявок и общих настроек компании/тарифов.
- Приватный Supabase Storage для фотографий заявок; владелец получает временные подписанные ссылки.
- Вход владельца через Supabase Auth (email + password). Дополнительная проверка email по списку `ADMIN_EMAILS`.
- SQL со схемой таблиц, RLS и приватным bucket.
- Service worker cache version обновлён.

## 1. Подготовить Supabase

1. Создайте проект в [Supabase](https://supabase.com/).
2. Откройте **SQL Editor → New query**.
3. Скопируйте целиком файл `supabase/schema.sql`, вставьте в редактор и нажмите **Run**.
4. Откройте **Project Settings → API** (или раздел API Keys) и скопируйте:
   - Project URL;
   - anon / publishable key.
5. Откройте **Authentication → Users** и создайте пользователя владельца (email + пароль). Подтвердите email, если Supabase попросит.

## 2. Заполнить публичную конфигурацию сайта

Откройте `config.js` и замените два значения:

```js
window.OBLAKO_SUPABASE = {
  url: "https://ВАШ-PROJECT.supabase.co",
  anonKey: "ВАШ_ANON_ИЛИ_PUBLISHABLE_KEY"
};
```

В этом файле разрешено хранить только Project URL и anon/publishable key. **Никогда не вставляйте сюда service_role key.**

## 3. Подключить Vercel

Импортируйте репозиторий/ветку `backend/fullstack-preserve-design` в Vercel.

Настройки проекта:
- Framework Preset: **Other**
- Root Directory: `./`
- Build Command: пусто
- Output Directory: пусто (оставить значение по умолчанию)
- Install Command: пусто

В **Vercel → Settings → Environment Variables** добавьте для Production (и Preview, если нужно):

| Переменная | Значение |
|---|---|
| `SUPABASE_URL` | Project URL из Supabase |
| `SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key из Supabase |
| `ADMIN_EMAILS` | email владельца, например `owner@example.com` |
| `SUPABASE_STORAGE_BUCKET` | `request-photos` |

Секрет `SUPABASE_SERVICE_ROLE_KEY` хранится **только** в Environment Variables Vercel. Не публикуйте его в GitHub, `config.js`, браузере или чате.

После добавления переменных выполните **Redeploy**.

## 4. Проверка после деплоя

1. Откройте сайт и отправьте тестовую заявку с фотографией.
2. Убедитесь, что запрос появился в Supabase → Table Editor → `requests`.
3. Откройте кабинет владельца, войдите с email/паролем из Supabase Auth.
4. Проверьте, что заявка и фото видны в кабинете.
5. Измените статус/цену/время и проверьте, что изменения сохраняются после перезагрузки.
6. Измените тариф и проверьте расчёт в приватном окне/на другом устройстве.
7. Отдельно проверьте 3D-модели на телефоне и компьютере.

## API

- `POST /api/requests` — публичное создание заявки и загрузка до 3 фото.
- `GET /api/requests` — список заявок (только владелец).
- `PATCH /api/requests/:id` — изменение заявки (только владелец).
- `DELETE /api/requests/:id` — удаление заявки (только владелец).
- `GET /api/settings` — публичные настройки и тарифы.
- `PUT /api/settings` — сохранение настроек (только владелец).

## Важные замечания

- Серверные данные не используют `localStorage`. В браузере локально остаются только текущая корзина/черновик формы.
- Авторизация требует пользователя Supabase Auth и совпадения его email со значением `ADMIN_EMAILS`.
- Фото находятся в приватном Storage bucket; ссылки для кабинета действуют 1 час и обновляются при обновлении списка.
- Для заявки нужна работающая сеть. PWA-кэширует оболочку сайта, но не очередь отправки заявок офлайн.
- Этот репозиторий не может быть объявлен полностью проверенным до подключения реального Supabase и тестового деплоя Vercel. После настройки обязательно пройдите шаги проверки выше.
