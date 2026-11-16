const { rest, owner, json, method, cleanText, uploadPhotos, signedPhotos } = require("./_lib/db");
module.exports = async (req, res) => {
  if (!method(req, res, ["GET", "POST"])) return;
  try {
    if (req.method === "POST") {
      const body = req.body || {};
      if (!cleanText(body.name, 120) || !cleanText(body.phone, 40) || !cleanText(body.addr, 500)) return json(res, 400, { error: "Заполните имя, телефон и адрес" });
      const id = require("crypto").randomUUID();
      const photoPaths = await uploadPhotos(body.photos || [], id);
      const data = Object.assign({}, body, { id, createdAt: new Date().toISOString(), status: "new", final: "", at: "", note: "", hist: [new Date().toLocaleString("ru-RU") + ": заявка создана"], photoPaths });
      delete data.photos;
      const rows = await rest("/rest/v1/requests", {
        method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id, name: cleanText(body.name, 120), phone: cleanText(body.phone, 40), status: "new", data })
      });
      return json(res, 201, { ok: true, id: rows[0].id });
    }
    if (!await owner(req)) return json(res, 401, { error: "Требуется вход владельца" });
    const rows = await rest("/rest/v1/requests?select=id,created_at,data&order=created_at.desc&limit=500");
    const result = [];
    for (const row of rows) {
      const data = row.data || {};
      data.id = row.id;
      data.createdAt = row.created_at;
      data.photos = await signedPhotos(data.photoPaths || []);
      result.push(data);
    }
    return json(res, 200, result);
  } catch (e) { return json(res, 500, { error: e.message || "Ошибка сервера" }); }
};
