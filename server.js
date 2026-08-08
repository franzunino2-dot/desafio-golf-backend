/**
 * Desafío de golf — backend en vivo (Railway)
 * Node puro, sin dependencias. Guarda los scores y los sirve por HTTP.
 *
 * Endpoints (GET, con CORS abierto para la app):
 *   /?action=get                              → { ok, scores:{ playerId:[18] }, ts }
 *   /?action=set&player=ID&hole=N&gross=G     → guarda un score (gross vacío = borra)
 *   /?action=clear                            → limpia todo
 *   /health                                   → { ok:true } (chequeo)
 *
 * Railway setea la variable PORT sola. Para que los datos sobrevivan a un
 * reinicio, montá un Volume y apuntá DATA_DIR a esa carpeta (opcional).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(process.env.DATA_DIR || __dirname, 'scores.json');

let scores = {};
try { scores = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {}; } catch (e) { scores = {}; }

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(scores)); } catch (e) {}
  }, 300);
}

function send(res, obj, status) {
  res.writeHead(status || 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  let u;
  try { u = new URL(req.url, 'http://localhost'); } catch (e) { return send(res, { ok: false }, 400); }

  if (u.pathname === '/health') return send(res, { ok: true });

  const action = u.searchParams.get('action') || 'get';

  if (action === 'set') {
    const player = u.searchParams.get('player');
    const hole = parseInt(u.searchParams.get('hole'), 10); // 1..18
    const grossRaw = u.searchParams.get('gross');
    if (player && hole >= 1 && hole <= 18) {
      if (!scores[player]) scores[player] = new Array(18).fill(null);
      scores[player][hole - 1] = (grossRaw === '' || grossRaw == null) ? null : Number(grossRaw);
      persist();
    }
    return send(res, { ok: true });
  }

  if (action === 'clear') {
    scores = {};
    persist();
    return send(res, { ok: true });
  }

  // get (por defecto)
  return send(res, { ok: true, scores: scores, ts: Date.now() });
});

server.listen(PORT, () => console.log('Desafío backend escuchando en ' + PORT));
