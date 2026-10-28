/**
 * Admin data export: customers and professionals (workers) as Excel or PDF.
 *
 *   GET /api/admin/users/export?format=xlsx|pdf&search=&isActive=&isPhoneVerified=&isEmailVerified=
 *   GET /api/admin/workers/export?format=xlsx|pdf&search=&approvalStatus=&isActive=
 *
 * Rules (see also the routes, which require the 'data-export' permission and rate-limit the calls):
 *  - Never exported: passwords, login/push tokens, session ids, document images.
 *  - Aadhaar, PAN and bank account numbers are masked to their last 4 characters.
 *  - Excel is the full export (streamed, so a large list does not fill the server's memory).
 *  - PDF is a readable report of the main columns, limited to PDF_ROW_CAP rows.
 *  - Every export is written to DataExportLog (who, when, filters, rows) whether it worked or not.
 */
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const User = require('../../models/User');
const Worker = require('../../models/Worker');
const DataExportLog = require('../../models/DataExportLog');
const escapeRegex = require('../../utils/escapeRegex');
const { WORKER_STATUS } = require('../../utils/constants');
const H = require('../../utils/exportHelpers');

const PDF_ROW_CAP = 2000;
const IST_OFFSET_MS = 330 * 60 * 1000;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const boolParam = (v) => (v === 'true' ? true : v === 'false' ? false : undefined);

/* ------------------------------ what to export ------------------------------ */

const firstAddress = (u) => (u.addresses || []).find((a) => a && a.isDefault) || (u.addresses || [])[0] || {};

// type: 'text' (default) | 'int' | 'money' | 'date'.  pdf: { w: width in points, align? }; no `pdf` = Excel only.
const USER_COLUMNS = [
  { key: 'name', header: 'Name', width: 24, pdf: { w: 140 }, value: (u) => u.name },
  { key: 'phone', header: 'Phone', width: 16, pdf: { w: 85 }, value: (u) => u.phone },
  { key: 'email', header: 'Email', width: 30, pdf: { w: 185 }, value: (u) => u.email },
  { key: 'account', header: 'Account', width: 10, pdf: { w: 55 }, value: (u) => (u.isActive === false ? 'Blocked' : 'Active') },
  { key: 'phoneVerified', header: 'Phone verified', width: 13, value: (u) => H.yesNo(u.isPhoneVerified) },
  { key: 'emailVerified', header: 'Email verified', width: 13, value: (u) => H.yesNo(u.isEmailVerified) },
  { key: 'joined', header: 'Joined', type: 'date', width: 20, pdf: { w: 75 }, value: (u) => u.createdAt, pdfValue: (u) => H.istDate(u.createdAt) },
  { key: 'totalBookings', header: 'Bookings', type: 'int', width: 10, pdf: { w: 55, align: 'right' }, value: (u) => u.totalBookings || 0 },
  { key: 'completedBookings', header: 'Completed', type: 'int', width: 11, value: (u) => u.completedBookings || 0 },
  { key: 'cancelledBookings', header: 'Cancelled', type: 'int', width: 11, value: (u) => u.cancelledBookings || 0 },
  { key: 'walletBalance', header: 'Wallet balance (₹)', type: 'money', width: 18, pdf: { w: 70, align: 'right', title: 'Wallet (Rs.)' }, value: (u) => H.money(u.wallet && u.wallet.balance) },
  { key: 'walletPenalty', header: 'Wallet penalty (₹)', type: 'money', width: 18, value: (u) => H.money(u.wallet && u.wallet.penalty) },
  { key: 'referralCode', header: 'Referral code', width: 14, value: (u) => u.referralCode },
  { key: 'referralEarnings', header: 'Referral earnings (₹)', type: 'money', width: 20, value: (u) => H.money(u.referralEarnings) },
  { key: 'city', header: 'City', width: 18, pdf: { w: 117 }, value: (u) => firstAddress(u).city },
  { key: 'state', header: 'State', width: 16, value: (u) => firstAddress(u).state },
  { key: 'pincode', header: 'Pincode', width: 10, value: (u) => firstAddress(u).pincode }
];

const WORKER_COLUMNS = [
  { key: 'name', header: 'Name', width: 24, pdf: { w: 120 }, value: (w) => w.name },
  { key: 'phone', header: 'Phone', width: 16, pdf: { w: 80 }, value: (w) => w.phone },
  { key: 'email', header: 'Email', width: 30, value: (w) => w.email },
  { key: 'businessName', header: 'Business name', width: 24, pdf: { w: 120 }, value: (w) => w.businessName },
  { key: 'services', header: 'Services', width: 30, value: (w) => {
    const s = Array.isArray(w.service) ? w.service : (typeof w.service === 'string' && w.service.trim() ? [w.service.trim()] : []);
    const c = Array.isArray(w.categories) ? w.categories : (typeof w.categories === 'string' && w.categories.trim() ? [w.categories.trim()] : []);
    return [...new Set([...s, ...c])].filter(Boolean).join(', ');
  } },
  { key: 'approval', header: 'Approval', width: 12, pdf: { w: 60 }, value: (w) => w.approvalStatus },
  { key: 'approvedOn', header: 'Approved on', type: 'date', width: 20, value: (w) => w.approvalDate },
  { key: 'account', header: 'Login', width: 10, pdf: { w: 50 }, value: (w) => (w.isActive === false ? 'Disabled' : 'Enabled') },
  { key: 'online', header: 'Online now', width: 11, value: (w) => H.yesNo(w.isOnline) },
  { key: 'rating', header: 'Rating', type: 'rating', width: 8, pdf: { w: 40, align: 'right' }, value: (w) => Math.round((Number(w.rating) || 0) * 10) / 10 },
  { key: 'reviews', header: 'Reviews', type: 'int', width: 9, value: (w) => w.totalReviews || 0 },
  { key: 'totalJobs', header: 'Jobs', type: 'int', width: 8, pdf: { w: 40, align: 'right' }, value: (w) => w.totalJobs || 0 },
  { key: 'completedJobs', header: 'Completed', type: 'int', width: 11, value: (w) => w.completedJobs || 0 },
  { key: 'cancelledJobs', header: 'Cancelled', type: 'int', width: 11, value: (w) => w.cancelledJobs || 0 },
  { key: 'earnings', header: 'Earnings balance (₹)', type: 'money', width: 20, pdf: { w: 65, align: 'right', title: 'Earnings (Rs.)' }, value: (w) => H.money(w.wallet && w.wallet.earnings) },
  { key: 'dues', header: 'Dues to admin (₹)', type: 'money', width: 18, pdf: { w: 60, align: 'right', title: 'Dues (Rs.)' }, value: (w) => H.money(w.wallet && w.wallet.dues) },
  { key: 'cashCollected', header: 'Total cash collected (₹)', type: 'money', width: 22, value: (w) => H.money(w.wallet && w.wallet.totalCashCollected) },
  { key: 'withdrawn', header: 'Total withdrawn (₹)', type: 'money', width: 19, value: (w) => H.money(w.wallet && w.wallet.totalWithdrawn) },
  { key: 'settled', header: 'Total settled (₹)', type: 'money', width: 17, value: (w) => H.money(w.wallet && w.wallet.totalSettled) },
  { key: 'city', header: 'City', width: 18, pdf: { w: 147 }, value: (w) => w.address && w.address.city },
  { key: 'state', header: 'State', width: 16, value: (w) => w.address && w.address.state },
  { key: 'pincode', header: 'Pincode', width: 10, value: (w) => w.address && w.address.pincode },
  { key: 'joined', header: 'Joined', type: 'date', width: 20, value: (w) => w.createdAt },
  // Identity and bank details: masked to the last 4 characters. The document images are never exported.
  { key: 'aadhaar', header: 'Aadhaar (masked)', width: 18, value: (w) => H.maskAadhaar(w.aadhar && w.aadhar.number) },
  { key: 'pan', header: 'PAN (masked)', width: 14, value: (w) => H.maskTail(w.pan && w.pan.number, 4) },
  { key: 'bankName', header: 'Bank', width: 20, value: (w) => w.bankDetails && w.bankDetails.bankName },
  { key: 'bankAccount', header: 'Bank account (masked)', width: 20, value: (w) => H.maskTail(w.bankDetails && w.bankDetails.accountNumber, 4) },
  { key: 'ifsc', header: 'IFSC', width: 14, value: (w) => w.bankDetails && w.bankDetails.ifscCode }
];

// Only these fields are read from the database. Passwords, tokens, session ids and document URLs are not here.
const USER_SELECT = 'name phone email isActive isPhoneVerified isEmailVerified createdAt totalBookings completedBookings cancelledBookings wallet referralCode referralEarnings addresses';
const WORKER_SELECT = 'name phone email businessName service categories approvalStatus approvalDate isActive isOnline rating totalReviews totalJobs completedJobs cancelledJobs wallet address createdAt aadhar.number pan.number bankDetails.bankName bankDetails.accountNumber bankDetails.ifscCode';

const searchClause = (search, fields) => {
  const safe = escapeRegex(String(search).slice(0, 100));
  return { $or: fields.map((f) => ({ [f]: { $regex: safe, $options: 'i' } })) };
};

const ENTITIES = {
  users: {
    title: 'Customers',
    file: 'helpu_customers',
    model: User,
    select: USER_SELECT,
    columns: USER_COLUMNS,
    buildQuery: (q) => {
      const query = {};
      const filters = {};
      const isActive = boolParam(q.isActive);
      const phoneVerified = boolParam(q.isPhoneVerified);
      const emailVerified = boolParam(q.isEmailVerified);
      if (isActive !== undefined) { query.isActive = isActive; filters.account = isActive ? 'Active' : 'Blocked'; }
      if (phoneVerified !== undefined) { query.isPhoneVerified = phoneVerified; filters.phoneVerified = phoneVerified ? 'Yes' : 'No'; }
      if (emailVerified !== undefined) { query.isEmailVerified = emailVerified; filters.emailVerified = emailVerified ? 'Yes' : 'No'; }
      if (q.search && String(q.search).trim()) {
        Object.assign(query, searchClause(String(q.search).trim(), ['name', 'phone', 'email']));
        filters.search = String(q.search).trim().slice(0, 100);
      }
      return { query, filters };
    }
  },
  workers: {
    title: 'Professionals',
    file: 'helpu_professionals',
    model: Worker,
    select: WORKER_SELECT,
    columns: WORKER_COLUMNS,
    buildQuery: (q) => {
      const query = {};
      const filters = {};
      if (q.approvalStatus) {
        if (!Object.values(WORKER_STATUS).includes(q.approvalStatus)) {
          const err = new Error(`Approval status must be one of: ${Object.values(WORKER_STATUS).join(', ')}`);
          err.status = 400;
          throw err;
        }
        query.approvalStatus = q.approvalStatus;
        filters.approval = q.approvalStatus;
      }
      const isActive = boolParam(q.isActive);
      if (isActive !== undefined) { query.isActive = isActive; filters.login = isActive ? 'Enabled' : 'Disabled'; }
      if (q.search && String(q.search).trim()) {
        Object.assign(query, searchClause(String(q.search).trim(), ['name', 'email', 'phone', 'businessName']));
        filters.search = String(q.search).trim().slice(0, 100);
      }
      return { query, filters };
    }
  }
};

const describeFilters = (filters) => {
  const parts = Object.entries(filters).map(([k, v]) => `${k}: ${v}`);
  return parts.length ? parts.join(', ') : 'none (everything)';
};

/* ------------------------------ Excel ------------------------------ */

const NUM_FORMATS = { int: '#,##0', money: '#,##0.00', rating: '0.0', date: 'dd mmm yyyy, hh:mm' };

const excelValue = (col, doc) => {
  const v = col.value(doc);
  if (col.type === 'date') {
    // Excel has no time zones: store India wall-clock time, so the sheet shows what the admin sees in the app
    return v && !Number.isNaN(new Date(v).getTime()) ? new Date(new Date(v).getTime() + IST_OFFSET_MS) : null;
  }
  if (col.type) return Number(v) || 0;
  return H.safeCell(v);
};

const writeXlsx = async (res, entity, cursor, meta) => {
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${meta.fileName}.xlsx"`);
  res.setHeader('Cache-Control', 'no-store');

  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true, useSharedStrings: false });
  wb.creator = 'Help U Admin';
  wb.created = new Date();

  const ws = wb.addWorksheet(entity.title, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = entity.columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: NUM_FORMATS[c.type] ? { numFmt: NUM_FORMATS[c.type] } : {}
  }));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: entity.columns.length } };
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163B66' } };
  head.alignment = { vertical: 'middle' };
  head.height = 22;
  head.commit();

  let written = 0;
  for await (const doc of cursor) {
    if (meta.aborted()) break;
    ws.addRow(entity.columns.map((c) => excelValue(c, doc))).commit();
    written += 1;
  }
  ws.commit();

  const info = wb.addWorksheet('About this file');
  info.columns = [{ width: 24 }, { width: 80 }];
  [
    ['Export', `${entity.title} (Help U)`],
    ['Created', `${H.istDateTime(new Date())} India time`],
    ['Created by', meta.adminLabel],
    ['Filters', describeFilters(meta.filters)],
    ['Rows in this file', written],
    ['Times', 'All dates and times are India time (IST).'],
    ['Privacy', 'This file contains personal data. Keep it safe and delete it when you no longer need it. Passwords, login tokens and document images are never exported; identity and bank numbers are masked to their last 4 characters.']
  ].forEach(([a, b]) => { const r = info.addRow([a, b]); r.getCell(1).font = { bold: true }; r.commit(); });
  info.commit();

  await wb.commit();
  return written;
};

/* ------------------------------ PDF ------------------------------ */

const PDF = { margin: 30, rowH: 20, headH: 22, font: 8.5, navy: '#163B66', zebra: '#F4F7FA', grey: '#6B7280' };

const pdfCell = (col, doc) => {
  if (col.pdfValue) return col.pdfValue(doc);
  const v = col.value(doc);
  if (col.type === 'money') return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (col.type === 'rating') return Number(v) ? Number(v).toFixed(1) : '-';
  return v === null || v === undefined || v === '' ? '' : String(v);
};

const writePdf = async (res, entity, cursor, meta) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${meta.fileName}.pdf"`);
  res.setHeader('Cache-Control', 'no-store');

  const cols = entity.columns.filter((c) => c.pdf);
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: PDF.margin, bottom: PDF.margin, left: PDF.margin, right: PDF.margin },
    bufferPages: true,
    info: { Title: `Help U - ${entity.title}`, Author: 'Help U Admin' }
  });
  doc.pipe(res);

  const bottomLimit = () => doc.page.height - PDF.margin - 14;
  let y = PDF.margin;
  let fallbackUsed = false;

  const tableHead = () => {
    let x = PDF.margin;
    doc.rect(PDF.margin, y, doc.page.width - PDF.margin * 2, PDF.headH).fill(PDF.navy);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(PDF.font);
    cols.forEach((c) => {
      doc.text(H.pdfText(c.pdf.title || c.header), x + 4, y + 7, { width: c.pdf.w - 8, height: 10, ellipsis: true, align: c.pdf.align || 'left' });
      x += c.pdf.w;
    });
    y += PDF.headH;
  };

  // Title block
  doc.fillColor(PDF.navy).font('Helvetica-Bold').fontSize(16).text(`Help U - ${entity.title}`, PDF.margin, y);
  y += 22;
  doc.fillColor(PDF.grey).font('Helvetica').fontSize(8.5);
  const lines = [
    `Created ${H.istDateTime(new Date())} India time by ${H.pdfText(meta.adminLabel)}`,
    `Filters: ${H.pdfText(describeFilters(meta.filters))}`,
    meta.truncated
      ? `Showing the newest ${meta.limit} of ${meta.total} matching records. Use the Excel export to get all ${meta.total}.`
      : `${meta.total} record${meta.total === 1 ? '' : 's'}`
  ];
  lines.forEach((t) => { doc.text(t, PDF.margin, y); y += 12; });
  y += 6;
  tableHead();

  let written = 0;
  for await (const row of cursor) {
    if (meta.aborted()) break;
    if (y + PDF.rowH > bottomLimit()) {
      doc.addPage();
      y = PDF.margin;
      tableHead();
    }
    if (written % 2 === 1) doc.rect(PDF.margin, y, doc.page.width - PDF.margin * 2, PDF.rowH).fill(PDF.zebra);
    doc.fillColor('#111827').font('Helvetica').fontSize(PDF.font);
    let x = PDF.margin;
    cols.forEach((c) => {
      const raw = pdfCell(c, row);
      if (H.needsPdfFallback(raw)) fallbackUsed = true;
      doc.text(H.pdfText(raw), x + 4, y + 6, { width: c.pdf.w - 8, height: 10, ellipsis: true, align: c.pdf.align || 'left' });
      x += c.pdf.w;
    });
    y += PDF.rowH;
    written += 1;
  }

  // Page footers (written last, so the total page count is known)
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0; // otherwise text this low would start a new page
    const fy = doc.page.height - 22;
    doc.fillColor(PDF.grey).font('Helvetica').fontSize(7.5);
    doc.text(
      `Help U - confidential, contains personal data${fallbackUsed ? '. Letters outside basic English show as "?" here; the Excel export has the exact text' : ''}`,
      PDF.margin, fy, { width: doc.page.width - PDF.margin * 2 - 80, lineBreak: false }
    );
    doc.text(`Page ${i + 1} of ${range.count}`, doc.page.width - PDF.margin - 80, fy, { width: 80, align: 'right', lineBreak: false });
  }

  doc.end();
  await new Promise((resolve) => { res.on('finish', resolve); res.on('close', resolve); });
  return written;
};

/* ------------------------------ request handler ------------------------------ */

const makeHandler = (entityKey) => async (req, res) => {
  const entity = ENTITIES[entityKey];
  const format = String(req.query.format || 'xlsx').toLowerCase();
  if (!['xlsx', 'pdf'].includes(format)) {
    return res.status(400).json({ success: false, message: 'Format must be xlsx or pdf.' });
  }

  let query;
  let filters;
  try {
    ({ query, filters } = entity.buildQuery(req.query));
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  const adminId = req.user && (req.user.id || req.user._id);
  const log = {
    adminId,
    adminName: (req.user && req.user.name) || '',
    adminEmail: (req.user && req.user.email) || '',
    entityType: entityKey,
    format,
    filters,
    ip: req.ip || '',
    userAgent: String(req.headers['user-agent'] || '').slice(0, 200)
  };

  try {
    const total = await entity.model.countDocuments(query);
    if (total === 0) {
      return res.status(404).json({ success: false, message: 'No records match these filters, so there is nothing to export.' });
    }

    const limit = format === 'pdf' ? PDF_ROW_CAP : 0; // 0 = no limit
    const truncated = format === 'pdf' && total > PDF_ROW_CAP;
    let aborted = false;
    res.on('close', () => { if (!res.writableFinished) aborted = true; });

    const meta = {
      fileName: `${entity.file}_${H.fileDate()}`,
      adminLabel: log.adminName || log.adminEmail || String(adminId || 'admin'),
      filters,
      total,
      limit,
      truncated,
      aborted: () => aborted
    };

    const cursor = entity.model.find(query).select(entity.select).sort({ createdAt: -1 }).limit(limit).lean().cursor();
    let written = 0;
    try {
      written = format === 'xlsx' ? await writeXlsx(res, entity, cursor, meta) : await writePdf(res, entity, cursor, meta);
    } finally {
      cursor.close().catch(() => {});
    }

    await DataExportLog.create({ ...log, rowCount: written, totalMatching: total, truncated, status: aborted ? 'failed' : 'completed', error: aborted ? 'Download was cancelled before it finished' : '' }).catch((e) => console.error('[DataExport] could not write the log:', e.message));
    console.log(`[DataExport] ${log.adminEmail || adminId} exported ${written} ${entityKey} as ${format}`);
    return undefined;
  } catch (error) {
    console.error('[DataExport] failed:', error);
    await DataExportLog.create({ ...log, status: 'failed', error: String(error.message).slice(0, 300) }).catch(() => {});
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'The export could not be created. Please try again.' });
    }
    // Part of the file is already on its way: all that can be done is to stop the download
    res.destroy(error);
    return undefined;
  }
};

module.exports = {
  exportUsers: makeHandler('users'),
  exportWorkers: makeHandler('workers'),
  PDF_ROW_CAP,
  USER_COLUMNS,
  WORKER_COLUMNS
};
