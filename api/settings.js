const { rest, owner, json, method } = require("./_lib/db");
const DEFAULTS = {
  company: "Облако", city: "Ваш город",
  tagline: "Выберите мебель, посмотрите примерную цену и отправьте заявку.",
  contacts: "Контакты: укажите телефон и мессенджер",
  prices: { sofa: { s2: 3500, s3: 4500, corner: 6500 }, armchair: { std: 1500, recl: 2200 }, mattress: { single: 2000, double: 3000 }, chair: { seat: 400, back: 700 } },
  minOrder: 2500, heavyPct: 25, secondSidePct: 40, outTown: 700
};
module.exports = async (req, res) => {
  if (!method(req, res, ["GET", "PUT"])) return;
  try {
    if (req.method === "GET") {
      const rows = await rest("/rest/v1/settings?select=value&id=eq.main&limit=1");
      return json(res, 200, rows[0] ? rows[0].value : DEFAULTS);
    }
    if (!await owner(req)) return json(res, 401, { error: "Требуется вход владельца" });
    const value = req.body || {};
    const safe = Object.assign({}, DEFAULTS, value, { ownerPassword: undefined });
    delete safe.ownerPassword;
    await rest("/rest/v1/settings?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: "main", value: safe }) });
    return json(res, 200, { ok: true });
  } catch (e) { return json(res, 500, { error: e.message || "Ошибка сервера" }); }
};
