import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { FiFileText, FiLoader, FiSave, FiPlus, FiTrash2, FiExternalLink, FiAlertCircle } from 'react-icons/fi';
import legalPageService from '../../services/legalPageService';
import { PageHeader, Card, Toggle, Field, Button, StatusPill } from '../../components/adminUi';
import { inputClass, formatDateTime } from '../../components/adminFormat';
import { sectionsFromPage } from '../../../../components/common/legal/legalContent';
import { builtInContent } from '../../../../components/common/legal/cancellationPolicyModel';
import useBookingConfig from '../../../../hooks/useBookingConfig';
import SectionsEditor from './SectionsEditor';

// Terms and Privacy are shared by both apps; the cancellation policy and FAQ are written
// separately for customers and for professionals, so those two get a second row to pick the app.
const GROUPS = [
  { key: 'terms', label: 'Terms & Conditions', slugs: { all: 'terms-and-conditions' } },
  { key: 'privacy', label: 'Privacy Policy', slugs: { all: 'privacy-policy' } },
  { key: 'cancellation', label: 'Cancellation Policy', slugs: { user: 'cancellation-policy', worker: 'worker-cancellation-policy' } },
  { key: 'faq', label: 'FAQ', slugs: { user: 'faq', worker: 'worker-faq' } }
];
const AUDIENCES = [
  { key: 'user', label: 'Customer app' },
  { key: 'worker', label: 'Professional app' }
];
// Where each page is shown in the apps, for the Preview link
const PREVIEW_PATHS = {
  'terms-and-conditions': '/user/terms',
  'privacy-policy': '/user/privacy-policy',
  'cancellation-policy': '/user/cancellation-policy',
  faq: '/user/faq',
  'worker-cancellation-policy': '/worker/cancellation-policy',
  'worker-faq': '/worker/faq'
};
const FAQ_SLUGS = ['faq', 'worker-faq'];
const POLICY_SLUGS = ['cancellation-policy', 'worker-cancellation-policy'];

const emptyFaq = () => ({ question: '', answer: '' });

const toDraft = (page) => ({
  ...page,
  intro: page.intro || '',
  showUpdatedDate: page.showUpdatedDate !== false,
  sections: (page.sections || []).map((s) => ({ ...s })),
  faqs: (page.faqs || []).map((f) => ({ ...f }))
});

const FaqEditor = ({ faqs, onChange }) => (
  <div className="space-y-3">
    {faqs.map((f, i) => (
      <div key={f._id || i} className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <input
            value={f.question}
            onChange={(e) => onChange(faqs.map((x, xi) => (xi === i ? { ...x, question: e.target.value } : x)))}
            placeholder="Question"
            className={`${inputClass} font-semibold`}
          />
          <Button variant="ghost" className="shrink-0 px-2 text-red-600" onClick={() => onChange(faqs.filter((_, xi) => xi !== i))} aria-label="Remove question">
            <FiTrash2 />
          </Button>
        </div>
        <textarea
          value={f.answer}
          onChange={(e) => onChange(faqs.map((x, xi) => (xi === i ? { ...x, answer: e.target.value } : x)))}
          placeholder="Answer"
          rows={2}
          className={inputClass}
        />
      </div>
    ))}
    <Button variant="secondary" onClick={() => onChange([...faqs, emptyFaq()])}>
      <FiPlus /> Add question
    </Button>
  </div>
);

/**
 * Admin control of the apps' static pages: Terms & Conditions, Privacy Policy, Cancellation Policy
 * and the site-wide FAQ. Each page is a short summary plus sections (heading and plain text) that
 * can be added, reordered, hidden and published independently. The cancellation policy's fees and
 * times are not written here: they come from Booking Configuration.
 */
const LegalPages = () => {
  const [activeTab, setActiveTab] = useState(GROUPS[0].slugs.all);
  const [pages, setPages] = useState({}); // slug -> page
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null); // the page currently being edited
  const bookingConfig = useBookingConfig();

  const load = useCallback(async () => {
    try {
      const res = await legalPageService.getAll();
      if (res.success) {
        setPages(Object.fromEntries(res.pages.map((p) => [p.slug, p])));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const page = pages[activeTab];
    if (page) setDraft(toDraft(page));
  }, [activeTab, pages]);

  const isFaq = FAQ_SLUGS.includes(activeTab);
  const isCancellation = POLICY_SLUGS.includes(activeTab);
  const isWorkerPage = activeTab.startsWith('worker-');
  const activeGroup = GROUPS.find((g) => Object.values(g.slugs).includes(activeTab));
  const audience = isWorkerPage ? 'worker' : 'user';
  const isDraftSlug = (slug) => !pages[slug]?.isActive;

  const selectGroup = (group) => setActiveTab(group.slugs.all || group.slugs[audience]);
  const hasLegacyHtml = !isFaq && draft && draft.sections.length === 0 && String(draft.content || '').trim() !== '';

  const convertLegacy = () => {
    const { intro, sections } = sectionsFromPage({ content: draft.content, intro: draft.intro });
    setDraft((d) => ({
      ...d,
      intro,
      sections: sections.map((s) => ({ title: s.title || 'Section', body: s.body, isVisible: true }))
    }));
    toast.success('Converted. Review the sections, then save.');
  };

  // Fill an empty policy page with the text the apps show today, so there is something to edit
  const startFromBuiltIn = () => {
    const audience = isWorkerPage ? 'worker' : 'user';
    const grace = isWorkerPage ? bookingConfig.workerFreeCancelGraceMinutes : bookingConfig.userFreeCancelGraceMinutes;
    const text = builtInContent(audience, Number(grace) || 0);
    setDraft((d) => ({
      ...d,
      sections: text.sections.map((s) => ({ ...s, isVisible: true })),
      faqs: text.faqs.map((f) => ({ ...f }))
    }));
    toast.success('Built-in text loaded. Edit it, then save and publish.');
  };

  const save = async () => {
    if (!draft.title.trim()) return toast.error('Title is required');

    if (isFaq) {
      if (draft.faqs.length === 0) return toast.error('Add at least one question');
    } else {
      if (draft.sections.some((s) => !s.title.trim())) return toast.error('Every section needs a heading');
      if (!isCancellation && draft.sections.length === 0 && !hasLegacyHtml) return toast.error('Add at least one section');
    }
    if (draft.faqs.some((f) => !f.question.trim() || !f.answer.trim())) {
      return toast.error('Every question needs both a question and an answer');
    }

    setSaving(true);
    try {
      const body = isFaq
        ? { title: draft.title, faqs: draft.faqs, isActive: draft.isActive }
        : {
            title: draft.title,
            isActive: draft.isActive,
            showUpdatedDate: draft.showUpdatedDate,
            intro: draft.intro,
            sections: draft.sections.map(({ title, body: text, isVisible }) => ({ title, body: text, isVisible })),
            ...(isCancellation ? { faqs: draft.faqs } : {})
          };
      const res = await legalPageService.update(activeTab, body);
      if (res.success) {
        toast.success('Saved');
        setPages((prev) => ({ ...prev, [activeTab]: res.page }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft) {
    return (
      <div className="flex h-64 items-center justify-center">
        <FiLoader className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        icon={FiFileText}
        title="Legal & Help Pages"
        description="Terms and Privacy are shared by both apps. The cancellation policy and FAQ are written separately for customers and professionals. A page is live only once published."
      />

      <div className="mb-2 flex flex-wrap gap-2">
        {GROUPS.map((g) => {
          const active = g === activeGroup;
          // A shared page shows its own draft state; a two-app page shows it on the app row below
          const sharedDraft = g.slugs.all && isDraftSlug(g.slugs.all);
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => selectGroup(g)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${active ? 'border-[#163B66] bg-[#163B66] text-white' : 'border-gray-300 bg-white text-gray-600'}`}
            >
              {g.label}
              {sharedDraft && <StatusPill className="ml-2 bg-amber-50 text-amber-700">Draft</StatusPill>}
            </button>
          );
        })}
      </div>

      {/* Which app's version to edit; only for pages that differ between the two apps */}
      {activeGroup && !activeGroup.slugs.all ? (
        <div className="mb-6 mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Editing the page for the</span>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
            {AUDIENCES.map((a) => {
              const slug = activeGroup.slugs[a.key];
              const active = slug === activeTab;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setActiveTab(slug)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${active ? 'bg-[#163B66] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {a.label}
                  {isDraftSlug(slug) && <span className={`ml-1.5 rounded px-1 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'}`}>Draft</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-6" />
      )}

      <Card
        right={
          <div className="flex items-center gap-3">
            {draft.updatedAt && <span className="text-xs text-gray-400">Last saved {formatDateTime(draft.updatedAt)}{draft.lastUpdatedBy?.name ? ` by ${draft.lastUpdatedBy.name}` : ''}</span>}
            <a
              href={PREVIEW_PATHS[activeTab]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700"
            >
              Preview <FiExternalLink className="h-3 w-3" />
            </a>
          </div>
        }
      >
        <div className="space-y-5">
          {isCancellation && (
            <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                The free-cancellation time, grace time and {isWorkerPage ? 'penalty' : 'fees'} shown on this page are not written here. They come
                from <Link to="/admin/booking-config" className="font-semibold underline">Booking Configuration</Link>, so the page always matches what is charged.
                What you write here is the summary, extra sections and questions. Until you publish, built-in text is used.
              </p>
            </div>
          )}

          {isCancellation && draft.sections.length === 0 && draft.faqs.length === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-900">
                Nothing is written here yet, so the app shows its built-in explanation and questions. Load them
                to edit them as your own text.
              </p>
              <Button variant="secondary" onClick={startFromBuiltIn}>Start from the built-in text</Button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Published</p>
                <p className="text-xs text-gray-500">
                  {isCancellation ? 'When off, the page uses its built-in text.' : 'When off, the page shows “not available” in the apps.'}
                </p>
              </div>
              <Toggle checked={draft.isActive} onChange={(v) => setDraft((d) => ({ ...d, isActive: v }))} />
            </div>
            {!isFaq && (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Show “Last updated” date</p>
                  <p className="text-xs text-gray-500">A small line under the title, set from the last save.</p>
                </div>
                <Toggle checked={draft.showUpdatedDate} onChange={(v) => setDraft((d) => ({ ...d, showUpdatedDate: v }))} />
              </div>
            )}
          </div>

          <Field label="Page title">
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputClass} maxLength={150} />
          </Field>

          {isFaq ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700">Questions</span>
                {activeTab === 'worker-faq' && draft.faqs.length === 0 && (pages.faq?.faqs || []).length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => setDraft((d) => ({ ...d, faqs: pages.faq.faqs.map(({ question, answer }) => ({ question, answer })) }))}
                  >
                    Copy the {pages.faq.faqs.length} customer questions to edit
                  </Button>
                )}
              </div>
              <FaqEditor faqs={draft.faqs} onChange={(faqs) => setDraft((d) => ({ ...d, faqs }))} />
            </div>
          ) : (
            <>
              <Field label="Summary (optional)" hint="A short note shown in a tinted box above the sections. Same text format as the sections below.">
                <textarea
                  value={draft.intro}
                  onChange={(e) => setDraft((d) => ({ ...d, intro: e.target.value }))}
                  rows={3}
                  maxLength={2000}
                  className={inputClass}
                />
              </Field>

              {hasLegacyHtml && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-900">
                    This page is still one block of older HTML text, shown to customers split by its headings.
                    Convert it to sections to edit each part separately.
                  </p>
                  <Button variant="secondary" onClick={convertLegacy}>Convert to sections</Button>
                </div>
              )}

              <div>
                <span className="mb-1 block text-xs font-semibold text-gray-700">
                  {isCancellation ? 'Extra sections' : 'Sections'}
                </span>
                <p className="mb-3 text-xs text-gray-500">
                  Blank line = new paragraph. Start a line with “- ” for a bullet. Wrap words in **double stars** for bold.
                </p>
                <SectionsEditor value={draft.sections} onChange={(sections) => setDraft((d) => ({ ...d, sections }))} />
              </div>

              {isCancellation && (
                <div>
                  <span className="mb-1 block text-xs font-semibold text-gray-700">Questions (optional)</span>
                  <p className="mb-3 text-xs text-gray-500">Shown as the “Common questions” list. Leave empty to use the built-in answers.</p>
                  <FaqEditor faqs={draft.faqs} onChange={(faqs) => setDraft((d) => ({ ...d, faqs }))} />
                </div>
              )}
            </>
          )}

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? <FiLoader className="animate-spin" /> : <FiSave />} {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LegalPages;
