Vinkey — Parolsuz versiya (Netlify-ready)
========================================

Bu repo Netlify üzərində işləyən parolsuz VIN generatorudur. Hər sorğu GitHub-dakı `logs.json` faylına yazılır.

Gerekli env vars (Netlify > Site settings > Build & deploy > Environment > Environment variables):
- GITHUB_TOKEN : GitHub personal access token (repo contents write icazəsi)
- LOGS_REPO : owner/repo for logs (example: yourname/vinkey_logs)
- LOGS_PATH : path to logs file (default: logs.json)

Deploy:
1. Push this repo to GitHub.
2. Create a repo for logs (e.g. vinkey_logs) and add an empty logs.json with content: []
3. In Netlify, connect repo and set the env vars above.
4. Deploy site. Test by opening site and entering a VIN then Generate.

Notes:
- This version removes any password/auth; generator is open. Logs still record vin and timestamp.
- If you want to hide logs or secure the generator, consider adding an API key or auth later.
