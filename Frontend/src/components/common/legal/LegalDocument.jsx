import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiChevronDown, FiHelpCircle } from 'react-icons/fi';
import { sectionsFromPage, updatedLabel } from './legalContent';
import { iconForSection } from './sectionIcons';
import LegalBody from './LegalBody';

/**
 * A legal document (Terms, Privacy...): a short summary, a contents row that follows the reader,
 * and one collapsible numbered card per section. All of the text, the section order and which
 * sections show are set by the admin in Legal & Help Pages.
 */
const LegalDocument = ({ page, theme, contact }) => {
  const navigate = useNavigate();
  const { intro, sections } = useMemo(() => sectionsFromPage(page), [page]);
  const updated = updatedLabel(page);

  const [closed, setClosed] = useState(() => new Set());
  const [activeId, setActiveId] = useState(sections[0]?.id || null);
  const sectionRefs = useRef({});
  const tocRef = useRef(null);

  // Highlight the contents chip of the section being read
  useEffect(() => {
    if (sections.length < 2) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-140px 0px -60% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Keep the active chip in view in the horizontally scrolling contents row
  useEffect(() => {
    const bar = tocRef.current;
    const chip = bar?.querySelector(`[data-chip="${activeId}"]`);
    if (chip) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [activeId]);

  const toggle = (id) => setClosed((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const jumpTo = (id) => {
    setClosed((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setActiveId(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const allClosed = sections.length > 0 && closed.size === sections.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Back"
          >
            <FiArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{page.title}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        {updated && <p className="text-xs text-gray-500">Last updated {updated}</p>}

        {intro && (
          <div className="mt-3 rounded-2xl p-4" style={{ background: theme.soft }}>
            <LegalBody body={intro} accent={theme.accent} />
          </div>
        )}

        {sections.length > 1 && (
          <nav aria-label="Contents" className="sticky top-[65px] z-30 -mx-4 mt-3 bg-gray-50/90 px-4 py-2 backdrop-blur">
            <div ref={tocRef} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.map((s, i) => {
                const active = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    data-chip={s.id}
                    type="button"
                    onClick={() => jumpTo(s.id)}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={active
                      ? { background: theme.accent, borderColor: theme.accent, color: '#fff' }
                      : { background: '#fff', borderColor: '#E4E7EC', color: '#475467' }}
                  >
                    {i + 1}. {s.title}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {sections.length > 1 && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setClosed(allClosed ? new Set() : new Set(sections.map((s) => s.id)))}
              className="text-xs font-semibold"
              style={{ color: theme.accent }}
            >
              {allClosed ? 'Expand all' : 'Collapse all'}
            </button>
          </div>
        )}

        <div className="mt-2 space-y-3">
          {sections.map((s, i) => {
            const SectionIcon = iconForSection(s.title);
            const open = !closed.has(s.id);
            return (
              <section
                key={s.id}
                id={s.id}
                ref={(el) => { sectionRefs.current[s.id] = el; }}
                className="scroll-mt-32 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                {s.title ? (
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: theme.soft, color: theme.accent }}
                    >
                      <SectionIcon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-gray-900">
                      {i + 1}. {s.title}
                    </span>
                    <FiChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                ) : null}
                {open && (
                  <div className={`px-4 pb-4 ${s.title ? 'border-t border-gray-100 pt-3' : 'pt-4'}`}>
                    <LegalBody body={s.body} accent={theme.accent} />
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {contact && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: theme.soft, color: theme.accent }}>
              <FiHelpCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">Questions about this page?</p>
              <p className="text-xs text-gray-500">We are happy to help.</p>
            </div>
            <Link to={contact.path} className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white" style={{ background: theme.accent }}>
              {contact.label}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default LegalDocument;
