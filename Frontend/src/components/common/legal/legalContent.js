/**
 * Page text format. A section body is plain text: blank lines separate paragraphs, lines starting
 * with "- " are bullets, and **word** is bold. Nothing is rendered as HTML.
 */

/** Paragraph and bullet blocks of a body: [{ type: 'p', text } | { type: 'ul', items }] */
export const parseBody = (body) => {
  const blocks = [];
  String(body || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .forEach((chunk) => {
      const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
      let list = null;
      lines.forEach((line) => {
        const bullet = line.match(/^[-•*]\s+(.*)$/);
        if (bullet) {
          if (!list) {
            list = { type: 'ul', items: [] };
            blocks.push(list);
          }
          list.items.push(bullet[1]);
        } else {
          list = null;
          blocks.push({ type: 'p', text: line });
        }
      });
    });
  return blocks;
};

const inlineText = (node) =>
  Array.from(node.childNodes)
    .map((n) => {
      if (n.nodeType === 3) return n.textContent;
      if (n.nodeType !== 1) return '';
      const text = inlineText(n);
      return n.tagName === 'STRONG' || n.tagName === 'B' ? (text.trim() ? `**${text.trim()}**` : '') : text;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

/** Older pages were stored as HTML; this turns that HTML into the plain-text format above. */
export const htmlToBody = (html) => {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  const parts = [];

  Array.from(root ? root.childNodes : []).forEach((node) => {
    if (node.nodeType === 3) {
      if (node.textContent.trim()) parts.push(node.textContent.trim());
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.tagName === 'UL' || node.tagName === 'OL') {
      const items = Array.from(node.querySelectorAll(':scope > li')).map((li) => `- ${inlineText(li)}`);
      if (items.length) parts.push(items.join('\n'));
    } else if (/^H[3-6]$/.test(node.tagName)) {
      const text = inlineText(node).replace(/\*\*/g, '');
      if (text) parts.push(`**${text}**`);
    } else {
      const text = inlineText(node);
      if (text) parts.push(text);
    }
  });

  return parts.join('\n\n');
};

/** Leading "1. " in a heading is dropped because the cards are numbered. */
const cleanTitle = (title) => String(title || '').replace(/^\s*\d+[.)]\s*/, '').trim();

/**
 * The intro and sections of a page, whichever way it was written: structured sections when the
 * admin has them, otherwise the older HTML split at each <h2>.
 * Returns { intro: string, sections: [{ id, title, body }] }.
 */
export const sectionsFromPage = (page) => {
  if (Array.isArray(page?.sections) && page.sections.length > 0) {
    return {
      intro: String(page.intro || '').trim(),
      sections: page.sections.map((s, i) => ({ id: `section-${i + 1}`, title: cleanTitle(s.title), body: s.body || '' }))
    };
  }

  const doc = new DOMParser().parseFromString(`<div>${page?.content || ''}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  const introHtml = [];
  const sections = [];
  let current = null;

  Array.from(root ? root.childNodes : []).forEach((node) => {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      current = { id: `section-${sections.length + 1}`, title: cleanTitle(node.textContent), html: '' };
      sections.push(current);
      return;
    }
    const part = node.nodeType === 1 ? node.outerHTML : (node.nodeType === 3 ? node.textContent : '');
    if (current) current.html += part;
    else introHtml.push(part);
  });

  const intro = String(page?.intro || '').trim() || htmlToBody(introHtml.join(''));
  if (sections.length === 0) {
    const body = htmlToBody(introHtml.join(''));
    return { intro: String(page?.intro || '').trim(), sections: body ? [{ id: 'section-1', title: '', body }] : [] };
  }
  return { intro, sections: sections.map(({ id, title, html }) => ({ id, title, body: htmlToBody(html) })) };
};

/** Value for the "Last updated" line, or null when it should not be shown. */
export const updatedLabel = (page) => {
  if (page?.showUpdatedDate === false) return null;
  const d = page?.updatedAt ? new Date(page.updatedAt) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
