/**
 * The user and worker apps keep their own copy of the booking configuration defaults
 * (Frontend/src/hooks/useBookingConfig.js) so screens behave sensibly before the first response
 * arrives. This fails when that copy drifts from the server's defaults (utils/bookingConfig.js):
 * a different value, a key the server sends that the frontend does not know, or a stale key.
 * No database is used. Run: node Backend/tests/configDefaults.test.js
 */
process.env.MONGODB_URI = process.env.MONGODB_URI_FOR_TESTS || 'mongodb://127.0.0.1:1/none';
const fs = require('fs');
const path = require('path');
const { getPublicBookingConfig } = require('../utils/bookingConfig');

const file = path.join(__dirname, '..', '..', 'Frontend', 'src', 'hooks', 'useBookingConfig.js');
const src = fs.readFileSync(file, 'utf8');
const start = src.indexOf('BOOKING_CONFIG_DEFAULTS = {') + 'BOOKING_CONFIG_DEFAULTS = '.length;
const front = new Function('return ' + src.slice(start, src.indexOf('\n};', start) + 2))();

(async () => {
  const server = await getPublicBookingConfig();
  const problems = [];
  Object.keys(server).forEach((k) => {
    if (!(k in front)) problems.push(`"${k}" is sent by the server but has no frontend default`);
    else if (JSON.stringify(front[k]) !== JSON.stringify(server[k])) {
      problems.push(`"${k}": server default ${JSON.stringify(server[k])} but frontend default ${JSON.stringify(front[k])}`);
    }
  });
  Object.keys(front).forEach((k) => { if (!(k in server)) problems.push(`"${k}" is in the frontend defaults but the server no longer sends it`); });

  if (problems.length) {
    console.error(`❌ ${problems.length} difference(s) between server and frontend defaults:`);
    problems.forEach((p) => console.error('   -', p));
    process.exit(1);
  }
  console.log(`✅ Frontend defaults match the server (${Object.keys(server).length} keys)`);
  process.exit(0);
})();
