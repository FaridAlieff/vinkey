// Parolsuz frontend (Azərbaycan dili)
const vinInput = document.getElementById('vinInput');
const genBtn = document.getElementById('genBtn');
const clearBtn = document.getElementById('clearBtn');
const resultBox = document.getElementById('result');
const logsList = document.getElementById('logsList');
const serverTime = document.getElementById('serverTime');

genBtn.addEventListener('click', async ()=> {
  const vin = vinInput.value.trim();
  if(!vin) { alert('VIN daxil edin'); return; }
  resultBox.textContent = 'Yaradılır...';
  try{
    const res = await fetch('/.netlify/functions/generate', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ vin })
    });
    const j = await res.json();
    if(res.status === 200){
      resultBox.textContent = (j.current || '') + '  (previous: ' + (j.previous || '') + ')';
      vinInput.value = '';
      fetchLogs();
    } else {
      resultBox.textContent = 'Xəta: ' + (j.error || 'unknown');
    }
  } catch(e){ resultBox.textContent = 'Xəta: ' + e.message }
});

clearBtn.addEventListener('click', ()=>{ vinInput.value=''; resultBox.textContent='Nəticə gözlənilir'; });

async function fetchLogs(){
  try{
    const res = await fetch('/.netlify/functions/generate?mode=logs');
    if(res.status === 200){
      const j = await res.json();
      serverTime.textContent = j.serverTime || '-';
      const logs = j.logs || [];
      if(logs.length === 0) logsList.textContent = 'Log yoxdur';
      else {
        logsList.innerHTML = logs.slice(-20).reverse().map(l => {
          return `<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)"><div style="font-weight:700">${l.generated || ''}</div><div class="small muted">vin: ${l.vin} • ${new Date(l.timestamp).toLocaleString()}</div></div>`;
        }).join('');
      }
    }
  } catch(e){ logsList.textContent = 'Logları yükləmək mümkün olmadı'; }
}

async function updateServerTime(){
  try{
    const res = await fetch('/.netlify/functions/generate?mode=serverTime');
    const j = await res.json(); serverTime.textContent = j.serverTime;
  }catch(e){}
}

setInterval(fetchLogs, 20000);

// start
fetchLogs();
updateServerTime();
