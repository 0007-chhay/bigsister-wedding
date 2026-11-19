# wedding-sage — ធៀបការ វ៉ាន ច័ន្ទគ្រឹស្នា & មិន ស្រីលក្ខ (ពណ៌បៃតង Sage)

## ឯកសារ
```
index.html          ធៀបការ (ស្រោមសំបុត្រ + ៣ ផ្ទាំង៖ ព័ត៌មានគូ / របៀបវារៈ / សារជូនពរ)
admin/index.html    ទំព័រគ្រប់គ្រង៖ បង្កើត link ភ្ញៀវ + អនុម័តពាក្យជូនពរ
api/guest.js        ឈ្មោះភ្ញៀវលើធៀប (#g=ID)
api/wishes.js       សារជូនពរ
api/_lib.js         មុខងាររួម (Redis, ពាក្យសម្ងាត់, rate limit)
img/  music.mp3  wedding.ics  og.jpg
```

## ដាក់ឡើង Vercel ថ្មី (ប្រហែល ១០ នាទី)

1. **GitHub** — បង្កើត repo ថ្មី (ឧ. `wedding-sage`) រួច push៖
   ```bash
   cd wedding-sage
   git remote add origin https://github.com/<username>/wedding-sage.git
   git push -u origin main
   ```
2. **Vercel** — vercel.com → **Add New… → Project** → Import repo `wedding-sage` → Framework: **Other** → **Deploy**។
3. **Database ថ្មី** — ក្នុង project ថ្មី → **Storage → Create Database → Upstash (Redis)** → ឈ្មោះ `wedding-sage-db` → Region ជិត Singapore → **Connect** ទៅ project នេះ។
   Vercel នឹងបន្ថែម `KV_REST_API_URL` និង `KV_REST_API_TOKEN` ដោយស្វ័យប្រវត្តិ។
4. **Settings → Environment Variables** បន្ថែម៖
   | Name | Value |
   |---|---|
   | `ADMIN_KEY` | ពាក្យសម្ងាត់វែង (យ៉ាងតិច ១៦ តួ) |
   | `WISHES_MODERATION` | (ស្រេចចិត្ត) `off` = ពរបង្ហាញភ្លាម មិនបាច់អនុម័ត |
5. **Deployments → Redeploy** (ដើម្បីឲ្យ env ថ្មីដំណើរការ)។
6. បើក `https://<project>.vercel.app/admin/` → វាយ `ADMIN_KEY` → បង្កើត link ភ្ញៀវ។

## ក្រោយមាន domain
ក្នុង `index.html` ប្ដូរ `<meta property="og:image" content="/og.jpg">`
ទៅជា URL ពេញ ឧ. `https://<project>.vercel.app/og.jpg` ដើម្បីឲ្យរូបបង្ហាញពេលផ្ញើ link ក្នុង Telegram / Facebook។

## សាកល្បង
- `/#g=1` → ស្រោមសំបុត្របង្ហាញឈ្មោះភ្ញៀវលេខ ១
- ផ្ញើពរពីធៀប → ចូល `/admin/#wishes` → ចុច **អនុម័ត**
