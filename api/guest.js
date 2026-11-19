// ឈ្មោះភ្ញៀវលើធៀប៖ link .../#g=12 → ស្រោមសំបុត្របង្ហាញឈ្មោះភ្ញៀវលេខ ១២
//
// GET  /api/guest?id=12                                → {hon, name}  (សាធារណៈ)
// GET  /api/guest?list=1            + header x-admin-key → បញ្ជីភ្ញៀវទាំងអស់
// POST /api/guest {op:"add", hon, name} + header x-admin-key → {id}  (ឈ្មោះដដែល = id ដដែល)
// POST /api/guest {op:"del", id}        + header x-admin-key → លុប

const { redis, hasRedis, ipOf, allow, checkAdmin, bodyOf, clean } = require('./_lib');

module.exports = async (req, res) => {
  if (!hasRedis) return res.status(503).json({ ok: false, error: 'storage' });
  const ip = ipOf(req);

  try {
    // ---------- admin: បន្ថែម / លុប ----------
    if (req.method === 'POST') {
      res.setHeader('Cache-Control', 'no-store');
      if (!(await checkAdmin(req))) return res.status(403).json({ ok: false, error: 'key' });
      const b = bodyOf(req);

      if (b.op === 'add') {
        const hon = clean(b.hon, 40).replace(/\n/g, ' ');
        const name = clean(b.name, 80).replace(/\n/g, ' ');
        if (!name) return res.status(400).json({ ok: false, error: 'name' });
        const key = `${hon}|${name}`;
        let id = await redis(['HGET', 'guest_keys', key]);
        if (!id) {
          id = String(await redis(['INCR', 'guest_seq']));
          await redis(['HSET', 'guests', id, JSON.stringify({ hon, name, t: Date.now() })]);
          await redis(['HSET', 'guest_keys', key, id]);
        }
        return res.status(200).json({ ok: true, id: Number(id) });
      }

      if (b.op === 'del') {
        const id = String(b.id || '').replace(/\D/g, '').slice(0, 9);
        const raw = id && await redis(['HGET', 'guests', id]);
        if (raw) {
          try { const g = JSON.parse(raw); await redis(['HDEL', 'guest_keys', `${g.hon}|${g.name}`]); } catch {}
          await redis(['HDEL', 'guests', id]);
        }
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ ok: false });
    }

    if (req.method !== 'GET') return res.status(405).json({ ok: false });
    const q = req.query || {};

    // ---------- admin: បញ្ជី ----------
    if (q.list !== undefined) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex');
      if (!(await checkAdmin(req))) return res.status(403).json({ ok: false, error: 'key' });
      const all = (await redis(['HGETALL', 'guests'])) || [];
      const rows = [];
      for (let i = 0; i < all.length; i += 2) {
        try { rows.push({ id: +all[i], ...JSON.parse(all[i + 1]) }); } catch {}
      }
      rows.sort((a, b) => a.id - b.id);
      return res.status(200).json({ ok: true, guests: rows });
    }

    // ---------- ភ្ញៀវបើក link ----------
    if (q.id) {
      // ភ្ញៀវធម្មតាសួរ ១-២ ដង; ការទាញបញ្ជីទាំងអស់ត្រូវសួររាប់រយដង → បិទ
      if (!(await allow(`gget:${ip}`, 60, 3600))) return res.status(429).json({ ok: false });
      const raw = await redis(['HGET', 'guests', String(q.id).replace(/\D/g, '').slice(0, 9)]);
      if (!raw) return res.status(404).json({ ok: false });
      const g = JSON.parse(raw);
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(200).json({ ok: true, hon: g.hon, name: g.name });
    }
    return res.status(400).json({ ok: false });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
};
