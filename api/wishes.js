// សារជូនពរ
//
// GET  /api/wishes                         → ពរដែលបានអនុម័ត
// POST /api/wishes {name, message}         → ផ្ញើពរថ្មី
// GET  /api/wishes?manage=1   + header x-admin-key → {pending, live}
// POST /api/wishes {op:"approve"|"unapprove"|"del", id, from} + header x-admin-key

const { redis, hasRedis, ipOf, allow, checkAdmin, bodyOf, clean, hasLink } = require('./_lib');

const LIVE = 'wishes';            // បង្ហាញជាសាធារណៈ
const PENDING = 'wishes_pending'; // រង់ចាំអនុម័ត
const MODERATE = (process.env.WISHES_MODERATION || '').toLowerCase() !== 'off';

async function list(key) {
  const raw = (await redis(['LRANGE', key, 0, 499])) || [];
  return raw.map(x => { try { return { raw: x, w: JSON.parse(x) }; } catch { return null; } }).filter(Boolean);
}

module.exports = async (req, res) => {
  if (!hasRedis) return res.status(200).json({ wishes: [], disabled: true });

  try {
    // ---------- អនុម័ត / លុប (admin) ----------
    if (req.method === 'POST' && req.headers['x-admin-key'] !== undefined) {
      res.setHeader('Cache-Control', 'no-store');
      if (!(await checkAdmin(req))) return res.status(403).json({ ok: false, error: 'key' });
      const b = bodyOf(req), id = String(b.id || '');
      if (!['approve', 'unapprove', 'del'].includes(b.op) || !id) return res.status(400).json({ ok: false });
      const from = b.op === 'approve' ? PENDING : b.op === 'unapprove' ? LIVE : (b.from === 'pending' ? PENDING : LIVE);
      const found = (await list(from)).find(x => x.w.id === id);
      if (found) {
        await redis(['LREM', from, 1, found.raw]);
        if (b.op === 'approve') await redis(['LPUSH', LIVE, found.raw]);
        if (b.op === 'unapprove') await redis(['LPUSH', PENDING, found.raw]);
      }
      return res.status(200).json({ ok: true, found: !!found });
    }

    // ---------- ភ្ញៀវផ្ញើពរ ----------
    if (req.method === 'POST') {
      const ip = ipOf(req);
      // IP មួយ ១០ ដង/ម៉ោង, សរុប ១២០ ដង/ម៉ោង
      if (!(await allow(`wish:${ip}`, 10, 3600)) || !(await allow('wish:all', 120, 3600))) {
        return res.status(429).json({ ok: false, error: 'too_many' });
      }
      const b = bodyOf(req);
      const name = clean(b.name, 60).replace(/\n/g, ' ');
      const msg = clean(b.message, 500);
      if (msg.length < 2) return res.status(400).json({ ok: false, error: 'empty' });
      if (hasLink(name) || hasLink(msg)) return res.status(400).json({ ok: false, error: 'link' });

      const wish = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name, msg, t: Date.now() };
      const key = MODERATE ? PENDING : LIVE;
      await redis(['LPUSH', key, JSON.stringify(wish)]);
      await redis(['LTRIM', key, 0, 499]);
      return res.status(200).json({ ok: true, wish, pending: MODERATE });
    }

    if (req.method !== 'GET') return res.status(405).json({ ok: false });
    const q = req.query || {};

    // ---------- ទំព័រ admin ----------
    if (q.manage !== undefined) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex');
      if (!(await checkAdmin(req))) return res.status(403).json({ ok: false, error: 'key' });
      const pend = await list(PENDING), live = await list(LIVE);
      return res.status(200).json({ ok: true, moderate: MODERATE, pending: pend.map(x => x.w), live: live.map(x => x.w) });
    }

    // ---------- បញ្ជីសាធារណៈ ----------
    const wishes = (await list(LIVE)).slice(0, 100).map(x => x.w);
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
    return res.status(200).json({ wishes });
  } catch (e) {
    return res.status(500).json({ ok: false, wishes: [] });
  }
};
