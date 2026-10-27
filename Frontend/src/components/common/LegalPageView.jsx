import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiFileText, FiChevronDown } from 'react-icons/fi';
import legalPageService from '../../services/legalPageService';
import LegalDocument from './legal/LegalDocument';
import { themeFor } from './legal/legalThemes';

/**
 * Renders one of the admin-managed legal/help pages (Terms & Conditions,
 * Privacy Policy, FAQ) by slug. Shared by the user and worker apps so the
 * same content and layout appears in both — only the back-navigation target
 * differs by whichever route mounts this.
 */
const LegalPageView = ({ slug, fallbackTitle = 'Page' }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [page, setPage] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    legalPageService.get(slug)
      .then((res) => {
        if (!active) return;
        if (res.success && res.page) {
          setPage(res.page);
          setStatus('ready');
        } else {
          setStatus('missing');
        }
      })
      .catch((err) => {
        if (!active) return;
        setStatus(err.response?.status === 404 ? 'missing' : 'error');
      });
    return () => { active = false; };
  }, [slug]);

  const isFaq = slug === 'faq' || slug === 'worker-faq';

  // Terms and Privacy get the structured document layout
  if (status === 'ready' && !isFaq) {
    const isWorker = pathname.startsWith('/worker');
    return (
      <LegalDocument
        page={page}
        theme={themeFor(pathname)}
        contact={isWorker ? { label: 'View FAQ', path: '/worker/faq' } : { label: 'Help & Support', path: '/user/help-support' }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Back"
          >
            <FiArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{page?.title || fallbackTitle}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {status === 'loading' && (
          <div className="space-y-3">
            <div className="h-5 w-2/3 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-gray-100 animate-pulse" />
          </div>
        )}

        {(status === 'missing' || status === 'error') && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FiFileText className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-700 font-medium">
              {status === 'missing' ? 'This page is not available yet' : 'Could not load this page'}
            </p>
            <p className="text-sm text-gray-400 mt-1">Please check back later.</p>
          </div>
        )}

        {status === 'ready' && isFaq && (
          <div className="space-y-3">
            {(page.faqs || []).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-10">No questions added yet.</p>
            )}
            {(page.faqs || []).map((f, i) => (
              <div key={f._id || i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-bold text-gray-900">{f.question}</span>
                  <FiChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{f.answer}</div>
                )}
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
};

export default LegalPageView;
