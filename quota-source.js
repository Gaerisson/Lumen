const fs = require('fs'), path = require('path'), os = require('os');
function readQuota(root = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions')) {
  const files = [];
  function walk(dir, depth = 0) {
    if (depth > 4) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file, depth + 1);
      else if (entry.name.endsWith('.jsonl')) files.push({ file, mtime: fs.statSync(file).mtimeMs });
    }
  }
  try { walk(root); } catch { return null; }
  files.sort((a, b) => b.mtime - a.mtime);
  let latest = null;
  for (const { file } of files.slice(0, 12)) {
    try {
      const size = fs.statSync(file).size, fd = fs.openSync(file, 'r');
      const buffer = Buffer.alloc(Math.min(size, 524288));
      try { fs.readSync(fd, buffer, 0, buffer.length, Math.max(0, size - buffer.length)); }
      finally { fs.closeSync(fd); }
      for (const line of buffer.toString('utf8').split('\n').reverse()) {
        if(!line.includes('rate_limits'))continue;
        try {
          const event = JSON.parse(line), limits = event.payload?.rate_limits;
          if (!limits?.primary || limits.limit_id&&limits.limit_id!=='codex' || !Number.isFinite(Date.parse(event.timestamp))) continue;
          if (!latest || Date.parse(event.timestamp) > Date.parse(latest.timestamp)) latest = {
            primary: limits.primary, secondary: limits.secondary, credits: limits.credits?{hasCredits:limits.credits.has_credits??limits.credits.hasCredits,unlimited:limits.credits.unlimited,balance:limits.credits.balance}:null, timestamp: event.timestamp, source: 'Journal local Codex'
          };
          break;
        } catch { /* Ignore partially written lines. */ }
      }
    } catch { /* A session file may be concurrently rotated. */ }
  }
  return latest;
}
module.exports = { readQuota };
