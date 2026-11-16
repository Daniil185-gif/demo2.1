const { rest, owner, json, method } = require("../_lib/db");
module.exports = async (req, res) => {
  if (!method(req, res, ["PATCH", "DELETE"])) return;
  if (!await owner(req)) return json(res, 401, { error: "Требуется вход владельца" });
  const id = String(req.query.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: "Некорректный номер заявки" });
  try {
    const rows = await rest("/rest/v1/requests?id=eq." + id + "&select=id,data");
    if (!rows.length) return json(res, 404, { error: "Заявка не найдена" });
    if (req.method === "DELETE") {
      await rest("/rest/v1/requests?id=eq." + id, { method: "DELETE" });
      return json(res, 200, { ok: true });
    }
    const old = rows[0].data || {}, body = req.body || {};
    const status = ["new", "agreed", "done", "cancelled"].includes(body.status) ? body.status : old.status;
    if (status === "agreed" && (!body.final || !body.at)) return json(res, 400, { error: "Для согласованной заявки укажите цену и время" });
    const next = Object.assign({}, old, {
      status, final: String(body.final || ""), at: String(body.at || ""),
      note: String(body.note || "").slice(0, 3000),
      hist: (Array.isArray(old.hist) ? old.hist : []).concat(new Date().toLocaleString("ru-RU") + ": обновлено владельцем")
    });
    await rest("/rest/v1/requests?id=eq." + id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status, data: next }) });
    return json(res, 200, { ok: true });
  } catch (e) { return json(res, 500, { error: e.message || "Ошибка сервера" }); }
};
