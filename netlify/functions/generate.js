const crypto = require('crypto');
const fetch = require('node-fetch');

const INTERVAL_MS = 0x927c0; // 600000
const MIN_VIN_LEN = 6;

function sha256HexUpper(text){
  return crypto.createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex').toUpperCase();
}
function md5Hex(text){
  return crypto.createHash('md5').update(Buffer.from(text,'utf8')).digest('hex');
}
function computePassword(vin, usePrev=false, nowMs=Date.now()){
  if(!vin || vin.length < MIN_VIN_LEN) return { error: 'vin length < 6' };
  const last6 = vin.substring(vin.length - 6);
  let t = nowMs;
  if(usePrev) t -= INTERVAL_MS;
  const windowIndex = Math.floor(t / INTERVAL_MS);
  const composite = `${last6}&&${windowIndex}#`;
  const sha = sha256HexUpper(composite);
  const md5 = md5Hex(sha);
  if(!md5 || md5.length < MIN_VIN_LEN) return { error: '' };
  return { password: md5.substring(md5.length - MIN_VIN_LEN) };
}

// GitHub helpers
async function getFileContent(owner, repo, pathFile, token){
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(pathFile)}`;
  const res = await fetch(url, { headers: { Authorization: `token ${token}`, 'User-Agent':'vinkey' } });
  if(res.status === 404) return null;
  if(!res.ok) throw new Error('GitHub get file failed: ' + res.status);
  return await res.json();
}
async function putFileContent(owner, repo, pathFile, token, contentBase64, message, sha=null){
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(pathFile)}`;
  const body = { message, content: contentBase64 };
  if(sha) body.sha = sha;
  const res = await fetch(url, { method:'PUT', headers:{ Authorization:`token ${token}`, 'User-Agent':'vinkey', 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  if(!res.ok) { const text = await res.text(); throw new Error('GitHub put failed: ' + res.status + ' ' + text); }
  return await res.json();
}

exports.handler = async function(event, context){
  try{
    const ghToken = process.env.GITHUB_TOKEN;
    const ownerRepo = process.env.LOGS_REPO;
    const logsPath = process.env.LOGS_PATH || 'logs.json';

    if(event.httpMethod === 'GET'){
      const q = event.queryStringParameters || {};
      if(q.mode === 'logs'){
        if(!ownerRepo || !ghToken) return { statusCode:500, body: JSON.stringify({ error:'LOGS_REPO or GITHUB_TOKEN not configured' }) };
        const [owner,repo] = ownerRepo.split('/');
        const file = await getFileContent(owner, repo, logsPath, ghToken).catch(()=>null);
        let logs = [];
        if(file && file.content){
          const raw = Buffer.from(file.content,'base64').toString('utf8');
          try{ logs = raw.trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)) }catch(e){ try{ logs = JSON.parse(raw) }catch(e2){ logs = [] } }
        }
        return { statusCode:200, body: JSON.stringify({ serverTime: new Date().toISOString(), logs }) };
      }
      if(q.mode === 'serverTime'){
        return { statusCode:200, body: JSON.stringify({ serverTime: new Date().toISOString() }) };
      }
    }

    if(event.httpMethod === 'POST'){
      const body = JSON.parse(event.body || '{}');
      const vin = (body.vin||'').toString();
      const curr = computePassword(vin, false);
      const prev = computePassword(vin, true);
      const now = new Date().toISOString();
      const entry = { vin, generated: curr.password || null, timestamp: now };

      if(!ownerRepo || !ghToken) {
        return { statusCode:200, body: JSON.stringify({ current: curr.password, previous: prev.password, warning: 'Logging not configured' }) };
      }

      const [owner,repo] = ownerRepo.split('/');
      const file = await getFileContent(owner, repo, logsPath, ghToken).catch(()=>null);
      let raw = '';
      let sha = null;
      if(file && file.content){ raw = Buffer.from(file.content,'base64').toString('utf8'); sha = file.sha }
      const newRaw = raw + (raw && !raw.endsWith('\n') ? '\n' : '') + JSON.stringify(entry) + '\n';
      const base64 = Buffer.from(newRaw,'utf8').toString('base64');
      await putFileContent(owner, repo, logsPath, ghToken, base64, `Add log ${now}`, sha);

      return { statusCode:200, body: JSON.stringify({ current: curr.password, previous: prev.password }) };
    }

    return { statusCode:405, body: JSON.stringify({ error:'Method not allowed' }) };
  }catch(err){
    return { statusCode:500, body: JSON.stringify({ error: err.message }) };
  }
};
