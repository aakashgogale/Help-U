/**
 * Admin data export (customers and professionals as Excel or PDF): access rules, what is and is not in the
 * file, filters, masking, the PDF row limit, the audit log and the rate limit.
 * Runs against an in-memory MongoDB, never the real database. Run: node tests/dataExport.test.js
 */
process.env.JWT_SECRET = 'x'; process.env.JWT_REFRESH_SECRET = 'y'; process.env.EXPORT_RATE_LIMIT_MAX = '1000';
const path = require('path');
const R = path.join(__dirname, '..') + path.sep;
const express = require(R + 'node_modules/express');
const request = require(R + 'node_modules/supertest');
const mongoose = require(R + 'node_modules/mongoose');
const ExcelJS = require(R + 'node_modules/exceljs');
const { MongoMemoryServer } = require(R + 'node_modules/mongodb-memory-server');

const Admin = require(R + 'models/Admin');
const User = require(R + 'models/User');
const Worker = require(R + 'models/Worker');
const DataExportLog = require(R + 'models/DataExportLog');
const { generateAccessToken } = require(R + 'utils/tokenService');
const H = require(R + 'utils/exportHelpers');

let ok = 0, bad = 0;
const check = (name, cond, extra = '') => { cond ? ok++ : bad++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`); };
const binary = (res, cb) => { const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks))); };

const loadSheet = async (buffer, name) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return { wb, ws: wb.getWorksheet(name) };
};
const allCellText = (wb) => {
  const out = [];
  wb.eachSheet((ws) => ws.eachRow((row) => row.eachCell((c) => out.push(String(c.value && c.value.text ? c.value.text : c.value)))));
  return out.join('\n');
};
const headers = (ws) => ws.getRow(1).values.slice(1);

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([Admin.init(), User.init(), Worker.init(), DataExportLog.init()]);

  // ---- admins
  const mkAdmin = (name, role, permissions = []) => Admin.create({ name, email: `${name}@helpu.test`, password: 'Password#12345', role, permissions, isActive: true });
  const superA = await mkAdmin('super', 'super_admin');
  const plain = await mkAdmin('plain', 'admin');
  const subNoExport = await mkAdmin('subnoexport', 'sub_admin', ['users', 'workers']);
  const subExportOnly = await mkAdmin('subexportonly', 'sub_admin', ['data-export']);
  const subUsersExport = await mkAdmin('subusersexport', 'sub_admin', ['users', 'data-export']);
  const tok = (a) => ({ Authorization: 'Bearer ' + generateAccessToken({ userId: String(a._id), role: a.role === 'super_admin' ? 'super_admin' : 'ADMIN' }) });

  // ---- data
  await User.create([
    { name: 'Asha Verma', phone: '9100000001', email: 'asha@x.com', password: 'SECRETHASH-1', isActive: true, isPhoneVerified: true, isEmailVerified: false, wallet: { balance: 1234.5, penalty: 20 }, totalBookings: 7, completedBookings: 5, cancelledBookings: 2, referralCode: 'ASHA1', fcmTokens: ['fcm-token-xyz'], loginSessionId: 'session-abc', addresses: [{ city: 'Pune', state: 'MH', pincode: '411001', isDefault: false }, { city: 'Mumbai', state: 'MH', pincode: '400001', isDefault: true }], createdAt: new Date('2026-10-05T20:00:00Z') },
    { name: '=HYPERLINK("http://evil.example","click")', phone: '9100000002', email: 'evil@x.com', password: 'SECRETHASH-2', isActive: true },
    { name: 'रमेश कुमार', phone: '9100000003', email: 'ramesh@x.com', password: 'SECRETHASH-3', isActive: false },
    { name: 'Blocked Bhavna', phone: '9100000004', email: 'bhavna@x.com', password: 'SECRETHASH-4', isActive: false, isPhoneVerified: true }
  ]);
  const mkWorker = (n, over = {}) => ({
    name: n.name, email: `${n.key}@w.com`, phone: n.phone, password: 'SECRETHASH-W', businessName: n.biz || '', service: ['AC Repair'], categories: ['Appliance'],
    aadhar: { number: '1234 1234 1234', document: 'https://cdn.test/aadhar-front-SECRET.jpg', backDocument: 'https://cdn.test/aadhar-back-SECRET.jpg' },
    pan: { number: 'ABCDE1234F', document: 'https://cdn.test/pan-SECRET.jpg' },
    bankDetails: { bankName: 'HDFC', accountNumber: '000123456789', ifscCode: 'HDFC0001234', accountHolderName: 'Holder', upiId: 'secret@upi' },
    approvalStatus: 'approved', isActive: true, rating: 4.46, totalReviews: 12, totalJobs: 30, completedJobs: 25, cancelledJobs: 5,
    wallet: { earnings: 5000.25, dues: 300, totalCashCollected: 9000, totalWithdrawn: 2000, totalSettled: 1500 }, address: { city: 'Indore', state: 'MP', pincode: '452001' }, fcmTokens: ['fcm-worker-secret'], ...over
  });
  await Worker.create([
    mkWorker({ name: 'Ravi Singh', key: 'ravi', phone: '9200000001', biz: 'Ravi Cool Care' }),
    mkWorker({ name: 'Pending Pooja', key: 'pooja', phone: '9200000002' }, { approvalStatus: 'pending' }),
    mkWorker({ name: 'Rejected Raj', key: 'raj', phone: '9200000003' }, { approvalStatus: 'rejected', isActive: false })
  ]);

  const app = express(); app.use(express.json());
  app.use('/api/admin', require(R + 'routes/admin-routes/userManagement.routes'));
  app.use('/api/admin', require(R + 'routes/admin-routes/workerManagement.routes'));
  const get = (url, admin, parse) => { const r = request(app).get(url).set(admin ? tok(admin) : {}); return parse ? r.buffer(true).parse(binary) : r; };

  console.log('\n== who is allowed ==');
  let r = await get('/api/admin/users/export?format=xlsx', null);
  check('no login -> 401', r.status === 401, String(r.status));
  r = await get('/api/admin/users/export?format=xlsx', plain);
  check('a normal admin (no Data Export permission) -> refused', r.status === 403 && /data-export/.test(r.body.message || ''), `${r.status} ${r.body.message || ''}`);
  r = await get('/api/admin/users/export?format=xlsx', subNoExport);
  check('a sub-admin with Users and Workers but not Data Export -> refused', r.status === 403);
  r = await get('/api/admin/users/export?format=xlsx', subExportOnly);
  check('a sub-admin with Data Export but not Users -> refused', r.status === 403);
  r = await get('/api/admin/users/export?format=xlsx', subUsersExport, true);
  check('a sub-admin with Users + Data Export -> allowed for customers', r.status === 200);
  r = await get('/api/admin/workers/export?format=xlsx', subUsersExport);
  check('...but not for professionals (no Workers permission)', r.status === 403);
  r = await get('/api/admin/workers/export?format=xlsx', superA, true);
  check('the super admin can export professionals', r.status === 200);
  check('the export route is not mistaken for a customer id (/users/:id)', (await get('/api/admin/users/export?format=xlsx', superA, true)).status === 200);

  console.log('\n== customers: Excel ==');
  r = await get('/api/admin/users/export?format=xlsx', superA, true);
  check('it is an Excel file with a dated file name', r.status === 200 && /spreadsheetml/.test(r.headers['content-type']) && /helpu_customers_\d{4}-\d{2}-\d{2}\.xlsx/.test(r.headers['content-disposition']), r.headers['content-disposition']);
  check('it is not cached', /no-store/.test(r.headers['cache-control'] || ''));
  let { wb, ws } = await loadSheet(r.body, 'Customers');
  check('the sheet is named Customers and has a header row', !!ws && headers(ws)[0] === 'Name' && headers(ws).includes('Wallet balance (₹)'), headers(ws).join(' | '));
  check('every customer is a row (4)', ws.rowCount === 5, String(ws.rowCount));
  const all = allCellText(wb);
  check('no password anywhere in the file', !/SECRETHASH/.test(all) && !headers(ws).some((h) => /password/i.test(h)));
  check('no push token and no login session anywhere', !/fcm-token-xyz|session-abc/.test(all));
  const rowFor = (sheet, nameCell) => { let found = null; sheet.eachRow((row) => { if (String(row.getCell(1).value).includes(nameCell)) found = row; }); return found; };
  const asha = rowFor(ws, 'Asha');
  const col = (name) => headers(ws).indexOf(name) + 1;
  check('numbers are real numbers (wallet 1234.5, bookings 7)', asha.getCell(col('Wallet balance (₹)')).value === 1234.5 && asha.getCell(col('Bookings')).value === 7);
  check('the default address is used for the city', asha.getCell(col('City')).value === 'Mumbai');
  check('yes/no and status columns read in plain words', asha.getCell(col('Phone verified')).value === 'Yes' && asha.getCell(col('Email verified')).value === 'No' && asha.getCell(col('Account')).value === 'Active');
  const joined = asha.getCell(col('Joined')).value;
  check('dates show India time (20:00 UTC on 5 Oct is 01:30 on 6 Oct)', joined instanceof Date && joined.getUTCDate() === 6 && joined.getUTCHours() === 1 && joined.getUTCMinutes() === 30, String(joined));
  const evil = rowFor(ws, 'HYPERLINK');
  const evilCell = evil.getCell(1);
  check('a name that looks like a formula stays plain text', typeof evilCell.value === 'string' && evilCell.value.startsWith("'=") && !evilCell.formula, JSON.stringify(evilCell.value));
  check('Hindi names are kept exactly in Excel', !!rowFor(ws, 'रमेश कुमार'));
  check('the phone number keeps its digits as text', rowFor(ws, 'Asha').getCell(col('Phone')).value === '9100000001');
  const about = wb.getWorksheet('About this file');
  const aboutText = about ? allCellText({ eachSheet: (cb) => cb(about) }) : '';
  check('a second sheet says who created it, the filters and the row count', /super/.test(aboutText) && /Filters/.test(aboutText) && /Rows in this file/.test(aboutText) && /none \(everything\)/.test(aboutText));
  check('the header row is frozen and filterable', ws.views && ws.views[0] && ws.views[0].state === 'frozen' && !!ws.autoFilter);

  console.log('\n== customers: filters ==');
  r = await get('/api/admin/users/export?format=xlsx&isActive=false', superA, true);
  ({ wb, ws } = await loadSheet(r.body, 'Customers'));
  check('isActive=false -> only the 2 blocked customers', ws.rowCount === 3 && !rowFor(ws, 'Asha'), String(ws.rowCount));
  check('the filter is written on the About sheet', /account: Blocked/.test(allCellText({ eachSheet: (cb) => cb(wb.getWorksheet('About this file')) })));
  r = await get('/api/admin/users/export?format=xlsx&search=9100000004', superA, true);
  ({ ws } = await loadSheet(r.body, 'Customers'));
  check('search by phone -> that one customer', ws.rowCount === 2 && !!rowFor(ws, 'Bhavna'));
  r = await get('/api/admin/users/export?format=xlsx&search=.*', superA);
  check('a search made of regex characters is taken literally (matches nothing)', r.status === 404, String(r.status));
  r = await get('/api/admin/users/export?format=xlsx&search=zzzz-nobody', superA);
  check('nothing matches -> a clear 404 message, no empty file', r.status === 404 && /nothing to export/.test(r.body.message || ''));
  r = await get('/api/admin/users/export?format=csv', superA);
  check('an unknown format is refused', r.status === 400);

  console.log('\n== professionals: Excel ==');
  r = await get('/api/admin/workers/export?format=xlsx', superA, true);
  ({ wb, ws } = await loadSheet(r.body, 'Professionals'));
  check('all 3 professionals are rows', ws.rowCount === 4, String(ws.rowCount));
  const text = allCellText(wb);
  const wcol = (name) => headers(ws).indexOf(name) + 1;
  const ravi = rowFor(ws, 'Ravi');
  check('Aadhaar is masked to the last 4 digits', ravi.getCell(wcol('Aadhaar (masked)')).value === 'XXXX XXXX 1234', ravi.getCell(wcol('Aadhaar (masked)')).value);
  check('PAN is masked to the last 4 characters', ravi.getCell(wcol('PAN (masked)')).value === 'XXXXXX234F', ravi.getCell(wcol('PAN (masked)')).value);
  check('the bank account number is masked to the last 4', ravi.getCell(wcol('Bank account (masked)')).value === 'XXXXXXXX6789', ravi.getCell(wcol('Bank account (masked)')).value);
  check('the full Aadhaar, PAN and bank account number appear nowhere', !/1234 1234 1234|123412341234|ABCDE1234F|000123456789/.test(text));
  check('no document image links and no UPI id anywhere', !/cdn\.test|aadhar-front|pan-SECRET|secret@upi/.test(text));
  check('no password and no push token anywhere', !/SECRETHASH|fcm-worker-secret/.test(text));
  check('IFSC and bank name are included (they are not secret)', ravi.getCell(wcol('IFSC')).value === 'HDFC0001234' && ravi.getCell(wcol('Bank')).value === 'HDFC');
  check('rating is rounded to one decimal and earnings are numbers', ravi.getCell(wcol('Rating')).value === 4.5 && ravi.getCell(wcol('Earnings balance (₹)')).value === 5000.25 && ravi.getCell(wcol('Dues to admin (₹)')).value === 300);
  check('services list both service and category names', /AC Repair/.test(ravi.getCell(wcol('Services')).value) && /Appliance/.test(ravi.getCell(wcol('Services')).value));
  r = await get('/api/admin/workers/export?format=xlsx&approvalStatus=pending', superA, true);
  ({ ws } = await loadSheet(r.body, 'Professionals'));
  check('approvalStatus=pending -> only the pending professional', ws.rowCount === 2 && !!rowFor(ws, 'Pending'));
  r = await get('/api/admin/workers/export?format=xlsx&approvalStatus=banana', superA);
  check('an unknown approval status is refused with the allowed values', r.status === 400 && /approved/.test(r.body.message || ''));

  console.log('\n== PDF ==');
  r = await get('/api/admin/users/export?format=pdf', superA, true);
  const pdfText = r.body.toString('latin1');
  check('customers PDF: a real PDF with a dated file name', r.status === 200 && pdfText.startsWith('%PDF') && /application\/pdf/.test(r.headers['content-type']) && /helpu_customers_.*\.pdf/.test(r.headers['content-disposition']));
  check('landscape A4 page', /\/MediaBox \[0 0 841\.89 595\.28\]/.test(pdfText), (pdfText.match(/\/MediaBox \[[^\]]*\]/) || [''])[0]);
  r = await get('/api/admin/workers/export?format=pdf&approvalStatus=approved', superA, true);
  check('professionals PDF works with filters', r.status === 200 && r.body.toString('latin1').startsWith('%PDF'));
  check('PDF text never contains characters its fonts cannot draw', H.pdfText('रमेश ₹5') === '???? ?5' || H.pdfText('रमेश ₹5').replace(/\?/g, '') === ' 5');

  console.log('\n== big lists ==');
  const bulk = Array.from({ length: 2100 }, (_, i) => ({ name: `Bulk ${i}`, phone: `93${String(i).padStart(8, '0')}`, email: `bulk${i}@x.com`, password: 'SECRETHASH-B', isActive: true, createdAt: new Date(Date.now() - i * 1000) }));
  await User.insertMany(bulk, { ordered: false });
  const totalUsers = await User.countDocuments();
  r = await get('/api/admin/users/export?format=xlsx', superA, true);
  ({ ws } = await loadSheet(r.body, 'Customers'));
  check(`Excel has every customer, no limit (${totalUsers} rows)`, ws.rowCount === totalUsers + 1, `${ws.rowCount - 1} rows`);
  r = await get('/api/admin/users/export?format=pdf', superA, true);
  const pages = (r.body.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
  check('PDF stops at 2000 rows and spans many pages', r.status === 200 && pages > 40 && pages < 200, `${pages} pages`);

  console.log('\n== audit log ==');
  const logs = await DataExportLog.find().sort({ createdAt: 1 }).lean();
  const last = logs[logs.length - 1];
  check('every successful export was logged', logs.length >= 12, String(logs.length));
  check('the PDF of 2,100+ customers is logged as limited to 2000 of the total', last.format === 'pdf' && last.entityType === 'users' && last.rowCount === 2000 && last.totalMatching === totalUsers && last.truncated === true, JSON.stringify({ r: last.rowCount, t: last.totalMatching, tr: last.truncated }));
  const filtered = logs.find((l) => l.filters && l.filters.account === 'Blocked');
  check('filters, admin and file type are recorded', !!filtered && String(filtered.adminId) === String(superA._id) && filtered.format === 'xlsx' && filtered.rowCount === 2 && filtered.adminEmail === 'super@helpu.test');
  check('refused requests (403) and empty results (404) are not logged as exports', logs.every((l) => l.rowCount > 0));
  check('the log holds metadata only, never the exported data', !JSON.stringify(logs).match(/SECRETHASH|9100000001|asha@x\.com/));

  console.log('\n== rate limit ==');
  delete require.cache[require.resolve(R + 'middleware/exportRateLimiter')];
  process.env.EXPORT_RATE_LIMIT_MAX = '2';
  const limiter = require(R + 'middleware/exportRateLimiter');
  const mini = express(); mini.use((req, res, next) => { req.user = { id: req.headers['x-admin'] }; next(); });
  mini.get('/x', limiter, (req, res) => res.json({ ok: true }));
  const codes = []; for (let i = 0; i < 4; i += 1) codes.push((await request(mini).get('/x').set('x-admin', 'A')).status);
  check('after the allowed number, the next export is refused with 429', codes.join(',') === '200,200,429,429', codes.join(','));
  check('another admin is counted separately', (await request(mini).get('/x').set('x-admin', 'B')).status === 200);

  console.log('\n== helpers ==');
  check('maskTail keeps the last 4', H.maskTail('9876543210') === 'XXXXXX3210' && H.maskTail('123') === 'XXX' && H.maskTail('') === '');
  check('safeCell neutralises = and @ but leaves +91 phones and negatives', H.safeCell('=1+1') === "'=1+1" && H.safeCell('@x') === "'@x" && H.safeCell('+919999999999') === '+919999999999' && H.safeCell('-5') === '-5');
  check('dates are formatted in India time', H.istDate('2026-10-05T20:00:00Z') === '06 Oct 2026' && H.istDateTime('2026-10-05T20:00:00Z').includes('01:30'), `${H.istDate('2026-10-05T20:00:00Z')} / ${H.istDateTime('2026-10-05T20:00:00Z')}`);
  check('a bad date gives an empty cell, not "Invalid Date"', H.istDate('nope') === '' && H.istDate(null) === '');

  console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
  await mongoose.disconnect(); await mongod.stop();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
