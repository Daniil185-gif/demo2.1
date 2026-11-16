const URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON = process.env.SUPABASE_ANON_KEY || "";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "request-photos";

function config() {
  if (!URL || !SERVICE || !ANON) throw new Error("На сервере не настроены SUPABASE_URL, SUPABASE_ANON_KEY и SUPABASE_SERVICE_ROLE_KEY");
}
async function rest(path, options = {}) {
  config();
  const headers = Object.assign({
    apikey: SERVICE,
    Authorization: "Bearer " + SERVICE,
    "Content-Type": "application/json"
  }, options.headers || {});
  const response = await fetch(URL + path, Object.assign({}, options, { headers }));
  const body = await response.text();
  if (!response.ok) throw new Error("Supabase: " + response.status + " " + body.slice(0, 500));
  return body ? JSON.parse(body) : null;
}
async function owner(req) {
  config();
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const response = await fetch(URL + "/auth/v1/user", {
    headers: { apikey: ANON, Authorization: "Bearer " + token }
  });
  if (!response.ok) return null;
  const user = await response.json();
  const allowed = (process.env.ADMIN_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!user.email || !allowed.includes(user.email.toLowerCase())) return null;
  return user;
}
function json(res, status, data) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(data);
}
function method(req, res, allowed) {
  if (!allowed.includes(req.method)) { res.setHeader("Allow", allowed.join(", ")); json(res, 405, { error: "Метод не поддерживается" }); return false; }
  return true;
}
function cleanText(value, max = 2000) { return String(value || "").trim().slice(0, max); }
async function uploadPhotos(photos, id) {
  if (!Array.isArray(photos) || photos.length > 3) throw new Error("Можно приложить не более 3 фотографий");
  const paths = [];
  for (let i = 0; i < photos.length; i++) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(photos[i]));
    if (!match) throw new Error("Недопустимый формат фотографии");
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 5 * 1024 * 1024) throw new Error("Каждая фотография должна быть меньше 5 МБ");
    const ext = match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
    const path = id + "/" + (i + 1) + "." + ext;
    const response = await fetch(URL + "/storage/v1/object/" + BUCKET + "/" + path, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "Content-Type": match[1], "x-upsert": "true" },
      body: buffer
    });
    if (!response.ok) throw new Error("Не удалось сохранить фотографию: " + (await response.text()).slice(0, 300));
    paths.push(path);
  }
  return paths;
}
async function signedPhotos(paths) {
  const result = [];
  for (const path of paths || []) {
    const response = await fetch(URL + "/storage/v1/object/sign/" + BUCKET + "/" + path, {
      method: "POST", headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 3600 })
    });
    if (!response.ok) continue;
    const data = await response.json();
    result.push(URL + "/storage/v1" + data.signedURL);
  }
  return result;
}
module.exports = { rest, owner, json, method, cleanText, uploadPhotos, signedPhotos, BUCKET, config };
