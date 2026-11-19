// មុខងាររួមសម្រាប់ API ទាំងអស់ (ឯកសារចាប់ផ្ដើមដោយ "_" មិនក្លាយជា endpoint ទេ)
//
// Environment Variables (Vercel → Settings → Environment Variables):
//   KV_REST_API_URL + KV_REST_API_TOKEN   Vercel បន្ថែមឲ្យស្វ័យប្រវត្តិ ពេលភ្ជាប់ Upstash Redis
//     (ឬ UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN ក៏បាន)
//   ADMIN_KEY             ពាក្យសម្ងាត់វែង (យ៉ាងតិច ១៦ តួ) សម្រាប់ទំព័រ /admin/
//   WISHES_MODERATION     ទុកទទេ = ត្រូវអនុម័តមុនបង្ហាញ | "off" = បង្ហាញភ្លាម

const crypto = require('crypto');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedis = !!(URL_ && TOKEN);

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}

// IP ពិតរបស់អ្នកផ្ញើ (Vercel ជាអ្នកកំណត់ header នេះ)
function ipOf(req) {
  const h = req.headers || {};
  return String(h['x-real-ip'] || (h['x-forwarded-for'] || '').split(',')[0] || 'unknown').trim();
}

// អនុញ្ញាតអតិបរមា max ដង ក្នុងរយៈ sec វិនាទី (Redis មានបញ្ហា → អនុញ្ញាត កុំឲ្យភ្ញៀវពិតជាប់)
async function allow(bucket, max, sec) {
  if (!hasRedis) return true;
  try {
    const k = `rl:${bucket}`;
    const n = await redis(['INCR', k]);
    if (n === 1) await redis(['EXPIRE', k, sec]);
    return n <= max;
  } catch { return true; }
}

// ប្រៀបធៀបពាក្យសម្ងាត់ ដោយមិនលេចធ្លាយតាមល្បឿន
function sameSecret(given, real) {
  if (!real || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

// ពិនិត្យ admin key + ការពារការទាយ (ខុស ១០ ដង ក្នុង ១ ម៉ោង → បិទ)
async function checkAdmin(req) {
  const given = String((req.headers || {})['x-admin-key'] || '');
  const ip = ipOf(req);
  if (hasRedis) {
    try {
      const bad = Number(await redis(['GET', `rl:adminfail:${ip}`])) || 0;
      if (bad >= 10) return false;
    } catch {}
  }
  const ok = sameSecret(given, process.env.ADMIN_KEY);
  if (!ok) await allow(`adminfail:${ip}`, 10, 3600);
  return ok;
}

function bodyOf(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

// សម្អាតអត្ថបទ: លុបតួអក្សរបញ្ជា, ចន្លោះច្រើនពេក, កាត់ប្រវែង
function clean(s, max) {
  return String(s || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

// ហាម link ក្នុងពាក្យជូនពរ (ការពារ link បោកប្រាស់)
const LINK_RE = /(https?:\/\/|www\.|t\.me\/|wa\.me\/|bit\.ly|\b[a-z0-9-]{2,}\s*(\.|\[\.\]|\(dot\))\s*(com|net|org|xyz|top|info|io|me|link|site|online|club|vip|cc|ly|app|shop|store|live|kh|asia|biz|co)\b)/i;
const hasLink = s => LINK_RE.test(s);

module.exports = { redis, hasRedis, ipOf, allow, sameSecret, checkAdmin, bodyOf, clean, hasLink };
