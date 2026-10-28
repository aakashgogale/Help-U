import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiSearch, FiCheckCircle, FiClock, FiNavigation, FiMapPin, FiChevronDown,
  FiCreditCard, FiRefreshCw, FiCalendar
} from 'react-icons/fi';
import useBookingConfig from '../../../hooks/useBookingConfig';
import { configService } from '../../../services/configService';
import legalPageService from '../../../services/legalPageService';
import { themeFor } from './legalThemes';
import { updatedLabel } from './legalContent';
import LegalBody from './LegalBody';
import { userPolicy, workerPolicy, builtInContent } from './cancellationPolicyModel';

const STAGE_ICONS = { search: FiSearch, check: FiCheckCircle, clock: FiClock, navigation: FiNavigation, pin: FiMapPin };
const TONES = {
  green: { dot: '#16A34A', soft: '#F0FDF4', text: '#15803D', border: '#DCFCE7' },
  amber: { dot: '#D97706', soft: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  orange: { dot: '#EA580C', soft: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  red: { dot: '#DC2626', soft: '#FEF2F2', text: '#B91C1C', border: '#FECACA' }
};

const Tile = ({ label, value, hint, theme }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm">
    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
    <p className="mt-1 text-lg font-extrabold leading-tight" style={{ color: theme.accent }}>{value}</p>
    <p className="mt-0.5 text-[11px] font-medium text-gray-500">{hint}</p>
  </div>
);

const Stage = ({ stage, last }) => {
  const tone = TONES[stage.tone];
  const Icon = STAGE_ICONS[stage.icon] || FiClock;
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span className="absolute left-[17px] top-9 bottom-0 w-0.5 bg-gray-100" aria-hidden />}
      <span
        className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white text-white shadow-sm"
        style={{ background: tone.dot }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-gray-900">{stage.title}</h3>
        <p className="mt-0.5 text-xs font-medium text-gray-500">{stage.when}</p>
        <span
          className="mt-2 inline-block rounded-lg border px-3 py-1 text-xs font-bold"
          style={{ background: tone.soft, color: tone.text, borderColor: tone.border }}
        >
          {stage.result}
        </span>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">{stage.detail}</p>
      </div>
    </li>
  );
};

const Faq = ({ items, theme }) => {
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <div key={f.q} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <span className="text-sm font-bold text-gray-900">{f.q}</span>
            <FiChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open === i ? 'rotate-180' : ''}`} style={open === i ? { color: theme.accent } : undefined} />
          </button>
          {open === i && <p className="px-4 pb-4 text-sm leading-relaxed text-gray-600">{f.a}</p>}
        </div>
      ))}
    </div>
  );
};

const freeUntilExample = (hours) => {
  // A 6:00 PM slot, as a worked example
  const slot = new Date();
  slot.setHours(18, 0, 0, 0);
  const until = new Date(slot.getTime() - hours * 3600 * 1000);
  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return { slot: fmt(slot), until: fmt(until) };
};

/**
 * The cancellation policy as a visual page: key numbers, a stage-by-stage timeline, how fees are
 * collected, and answers to common questions. Every number comes from the admin's settings; the
 * summary, extra sections and questions can be written in Admin > Legal & Help Pages (built-in
 * text is used until then). `audience` is 'user' (customer app) or 'worker' (professional app).
 */
const CancellationPolicyView = ({ audience = 'user' }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const theme = themeFor(pathname);
  const config = useBookingConfig();
  const [settings, setSettings] = useState({ cancellationPenalty: 49, visitedCharges: 149 });
  const [page, setPage] = useState(null); // the admin-written page, if published
  const isUser = audience === 'user';

  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let active = true;
    configService.getSettings().then((res) => {
      if (active && res?.success && res.settings) {
        setSettings({
          cancellationPenalty: res.settings.cancellationPenalty ?? 49,
          visitedCharges: res.settings.visitedCharges ?? 149
        });
      }
    });
    legalPageService.get(isUser ? 'cancellation-policy' : 'worker-cancellation-policy')
      .then((res) => { if (active && res?.success) setPage(res.page || null); })
      .catch(() => {});
    return () => { active = false; };
  }, [isUser]);

  const policy = isUser ? userPolicy(config, settings) : workerPolicy(config);
  const example = policy.hours > 0 ? freeUntilExample(policy.hours) : null;

  const adminFaqs = (page?.faqs || []).map((f) => ({ q: f.question, a: f.answer }));
  const adminSections = page?.sections || [];
  const updated = updatedLabel(page);

  const builtIn = builtInContent(audience, policy.grace);
  const faqs = adminFaqs.length > 0 ? adminFaqs : builtIn.faqs.map((f) => ({ q: f.question, a: f.answer }));
  const sections = adminSections.length > 0 ? adminSections : builtIn.sections;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)} className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100" aria-label="Back">
            <FiArrowLeft className="h-6 w-6 text-gray-800" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Cancellation Policy</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 pt-4">
        {updated && <p className="-mb-2 text-xs text-gray-500">Last updated {updated}</p>}

        {page?.intro && (
          <div className="rounded-2xl p-4" style={{ background: theme.soft }}>
            <LegalBody body={page.intro} accent={theme.accent} />
          </div>
        )}

        {/* Key numbers */}
        <div className="grid grid-cols-3 gap-3">
          <Tile theme={theme} label="Free window" value={policy.hours > 0 ? `${policy.hours} hr${policy.hours === 1 ? '' : 's'}` : 'None'} hint="before the slot" />
          <Tile theme={theme} label="Grace time" value={policy.grace > 0 ? `${policy.grace} min` : 'None'} hint="after accepting" />
          <Tile theme={theme} label={isUser ? 'Late fee' : 'Penalty'} value={(isUser ? policy.lateFee : policy.penalty) || 'Free'} hint="after that" />
        </div>

        {/* Timeline */}
        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-gray-900">{isUser ? 'What it costs, step by step' : 'When a penalty applies'}</h2>
          <ol>
            {policy.stages.map((stage, i) => (
              <Stage key={stage.key} stage={stage} last={i === policy.stages.length - 1} />
            ))}
          </ol>
        </section>

        {/* Worked example */}
        {example && (
          <section className="flex items-start gap-3 rounded-2xl border p-4" style={{ background: theme.soft, borderColor: theme.soft }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white" style={{ color: theme.accent }}>
              <FiCalendar className="h-[18px] w-[18px]" />
            </span>
            <p className="text-sm leading-relaxed text-gray-700">
              <span className="font-bold text-gray-900">Example: </span>
              {isUser ? 'A booking for' : 'A job for'} <strong>{example.slot}</strong> can be cancelled for free until <strong>{example.until}</strong>.
            </p>
          </section>
        )}

        {/* How the fee is collected */}
        {isUser ? (
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-gray-900">How a fee is collected</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <FiCreditCard className="mb-2 h-5 w-5" style={{ color: theme.accent }} />
                <p className="text-sm font-bold text-gray-900">Paid online</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">The fee is deducted from your refund. The rest goes to your wallet.</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <FiRefreshCw className="mb-2 h-5 w-5" style={{ color: theme.accent }} />
                <p className="text-sm font-bold text-gray-900">Pay after service</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">The fee is added to your next booking, so nothing is charged today.</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">A fee is never more than the booking amount. We show the exact amount before you confirm.</p>
          </section>
        ) : (
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-bold text-gray-900">How a penalty is applied</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              It is deducted from your earnings the moment you cancel and appears in your wallet history. The cancel screen shows the exact amount before you confirm.
            </p>
          </section>
        )}

        {/* Written by the admin, or the built-in explanation */}
        {sections.map((section) => (
          <section key={section._id || section.title} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-bold text-gray-900">{section.title}</h2>
            <LegalBody body={section.body} accent={theme.accent} />
          </section>
        ))}

        {/* FAQ */}
        <section>
          <h2 className="mb-3 text-base font-bold text-gray-900">Common questions</h2>
          <Faq items={faqs} theme={theme} />
        </section>

        {isUser && (
          <section className="rounded-3xl border p-5" style={{ background: theme.soft, borderColor: theme.soft }}>
            <h3 className="font-bold text-gray-900">Need to change plans?</h3>
            <p className="mt-1 text-sm text-gray-600">You can move your booking to another time instead of cancelling.</p>
            <Link
              to="/user/my-bookings"
              className="mt-4 block rounded-xl bg-white py-3 text-center text-sm font-bold shadow-sm active:scale-95"
              style={{ color: theme.accent }}
            >
              Go to my bookings
            </Link>
          </section>
        )}
      </main>
    </div>
  );
};

export default CancellationPolicyView;
