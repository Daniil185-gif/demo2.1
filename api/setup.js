const { rest, json, method, config } = require("./_lib/db");
const URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

module.exports = async (req, res) => {
  if (!method(req, res, ["GET", "POST"])) return;
  try {
    config();
    if (req.method === "GET") {
      const rows = await rest("/rest/v1/owners?select=id&limit=1");
      return json(res, 200, { initialized: !!rows.length });
    }

    const email = String((req.body || {}).email || "").trim().toLowerCase();
    const password = String((req.body || {}).password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: "Введите корректный email" });
    if (password.length < 8 || password.length > 128) return json(res, 400, { error: "Пароль должен содержать от 8 до 128 символов" });

    // Сначала занимаем единственное место владельца: параллельная регистрация второго аккаунта не пройдёт.
    const existing = await rest("/rest/v1/owners?select=id&limit=1");
    if (existing.length) return json(res, 409, { error: "Аккаунт владельца уже создан. Войдите с его email и паролем." });
    await rest("/rest/v1/owners", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ id: 1, email })
    });

    const response = await fetch(URL + "/auth/v1/admin/users", {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, email_confirm: true })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      await rest("/rest/v1/owners?id=eq.1&email=eq." + encodeURIComponent(email), { method: "DELETE" }).catch(() => {});
      const message = result.msg || result.message || result.error_description || "Не удалось создать аккаунт";
      return json(res, 400, { error: message });
    }
    return json(res, 201, { ok: true });
  } catch (e) {
    return json(res, 500, { error: e.message || "Ошибка первичной настройки" });
  }
};
