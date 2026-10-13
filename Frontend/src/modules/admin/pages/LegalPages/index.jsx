import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiFileText, FiLoader, FiSave, FiPlus, FiTrash2, FiExternalLink } from 'react-icons/fi';
import legalPageService from '../../services/legalPageService';
import { PageHeader, Card, Toggle, Field, Button, StatusPill } from '../../components/adminUi';
import { inputClass, formatDateTime } from '../../components/adminFormat';

const TABS = [
  { slug: 'terms-and-conditions', label: 'Terms & Conditions', userPath: 'terms' },
  { slug: 'privacy-policy', label: 'Privacy Policy', userPath: 'privacy-policy' },
  { slug: 'faq', label: 'FAQ', userPath: 'faq' }
];

const emptyFaq = () => ({ question: '', answer: '' });

/**
 * Global CMS for the three static pages the apps need: Terms & Conditions,
 * Privacy Policy and a site-wide FAQ. Each is admin-editable and published
 * independently via the `isActive` toggle; everything else content-related
 * already has its own page (Home Content, per-service FAQs).
 */
const LegalPages = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].slug);
  const [pages, setPages] = useState({}); // slug -> page
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null); // the page currently being edited

  const load = useCallback(async () => {
    try {
      const res = await legalPageService.getAll();
      if (res.success) {
        const bySlug = Object.fromEntries(res.pages.map((p) => [p.slug, p]));
        setPages(bySlug);
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
    if (page) setDraft({ ...page, faqs: page.faqs ? page.faqs.map((f) => ({ ...f })) : [] });
  }, [activeTab, pages]);

  const isFaq = activeTab === 'faq';

  const save = async () => {
    if (!draft.title.trim()) return toast.error('Title is required');
    if (isFaq) {
      if (draft.faqs.length === 0) return toast.error('Add at least one question');
      if (draft.faqs.some((f) => !f.question.trim() || !f.answer.trim())) {
        return toast.error('Every FAQ needs both a question and an answer');
      }
    } else if (!draft.content.trim()) {
      return toast.error('Content is required');
    }

    setSaving(true);
    try {
      const body = isFaq
        ? { title: draft.title, faqs: draft.faqs, isActive: draft.isActive }
        : { title: draft.title, content: draft.content, isActive: draft.isActive };
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
        description="Terms, Privacy Policy and the site-wide FAQ shown in the user and worker apps. A page is live only once switched on."
      />

      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => setActiveTab(t.slug)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${activeTab === t.slug ? 'border-[#163B66] bg-[#163B66] text-white' : 'border-gray-300 bg-white text-gray-600'}`}
          >
            {t.label}
            {!pages[t.slug]?.isActive && <StatusPill className="ml-2 bg-amber-50 text-amber-700">Draft</StatusPill>}
          </button>
        ))}
      </div>

      <Card
        right={
          <div className="flex items-center gap-3">
            {draft.updatedAt && <span className="text-xs text-gray-400">Last saved {formatDateTime(draft.updatedAt)}{draft.lastUpdatedBy?.name ? ` by ${draft.lastUpdatedBy.name}` : ''}</span>}
            <a
              href={`/user/${TABS.find((t) => t.slug === activeTab)?.userPath}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700"
            >
              Preview <FiExternalLink className="h-3 w-3" />
            </a>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Published</p>
              <p className="text-xs text-gray-500">When off, the page returns "not found" in the apps — safe to draft here first.</p>
            </div>
            <Toggle checked={draft.isActive} onChange={(v) => setDraft((d) => ({ ...d, isActive: v }))} />
          </div>

          <Field label="Page title">
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputClass} maxLength={150} />
          </Field>

          {isFaq ? (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-gray-700">Questions</span>
              {draft.faqs.map((f, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <input
                      value={f.question}
                      onChange={(e) => setDraft((d) => ({ ...d, faqs: d.faqs.map((x, xi) => (xi === i ? { ...x, question: e.target.value } : x)) }))}
                      placeholder="Question"
                      className={`${inputClass} font-semibold`}
                    />
                    <Button
                      variant="ghost"
                      className="shrink-0 px-2 text-red-600"
                      onClick={() => setDraft((d) => ({ ...d, faqs: d.faqs.filter((_, xi) => xi !== i) }))}
                      aria-label="Remove question"
                    >
                      <FiTrash2 />
                    </Button>
                  </div>
                  <textarea
                    value={f.answer}
                    onChange={(e) => setDraft((d) => ({ ...d, faqs: d.faqs.map((x, xi) => (xi === i ? { ...x, answer: e.target.value } : x)) }))}
                    placeholder="Answer"
                    rows={2}
                    className={inputClass}
                  />
                </div>
              ))}
              <Button variant="secondary" onClick={() => setDraft((d) => ({ ...d, faqs: [...d.faqs, emptyFaq()] }))}>
                <FiPlus /> Add question
              </Button>
            </div>
          ) : (
            <Field label="Content" hint="Plain text or basic HTML (headings, paragraphs, lists). Shown as-is in the app.">
              <textarea
                value={draft.content}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                rows={18}
                className={`${inputClass} font-mono text-xs leading-relaxed`}
                placeholder={activeTab === 'terms-and-conditions' ? '<h2>1. Introduction</h2>\n<p>...</p>' : '<h2>Information we collect</h2>\n<p>...</p>'}
              />
            </Field>
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
