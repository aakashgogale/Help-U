import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX, FiUser, FiBriefcase, FiShoppingBag, FiFileText, FiCornerDownLeft, FiClock } from 'react-icons/fi';
import { adminUserService } from '../../../../services/adminUserService';
import adminWorkerService from '../../../../services/adminWorkerService';
import { adminBookingService } from '../../../../services/adminBookingService';
import { buildPageIndex, matches, readAdminUser } from '../../utils/adminNav';

/**
 * Admin header search.
 *
 * Pages are matched instantly from the menu. Users, workers and bookings are searched on the
 * server (after a short pause) and open the matching list pre-filtered to the result, because the
 * admin has list pages rather than per-record pages. Cmd/Ctrl+K focuses it from anywhere.
 */

const RECENT_KEY = 'adminRecentSearches';
const MIN_ENTITY_CHARS = 2;

const loadRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
const saveRecent = (item) => {
  try {
    const next = [item, ...loadRecent().filter((r) => r.route !== item.route)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* storage unavailable */ }
};

const ICONS = { page: FiFileText, user: FiUser, worker: FiBriefcase, booking: FiShoppingBag, recent: FiClock };
const GROUP_LABELS = { page: 'Pages', user: 'Users', worker: 'Workers', booking: 'Bookings', recent: 'Recent' };

const AdminGlobalSearch = ({ variant = 'inline', onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const requestId = useRef(0);

  const [adminUser] = useState(readAdminUser);
  const pages = useMemo(() => buildPageIndex(adminUser), [adminUser]);
  const canSee = useMemo(() => {
    const titles = new Set(pages.filter((p) => !p.parent).map((p) => p.title));
    return { users: titles.has('Users'), workers: titles.has('Workers'), bookings: titles.has('Bookings') };
  }, [pages]);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(variant === 'overlay');
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState({ user: [], worker: [], booking: [] });

  const q = query.trim();

  // Cmd/Ctrl+K focuses the search from anywhere in the admin
  useEffect(() => {
    if (variant !== 'inline') return undefined;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variant]);

  // Close when clicking outside (inline variant)
  useEffect(() => {
    if (variant !== 'inline') return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [variant]);

  // Search users / workers / bookings once the admin pauses typing
  useEffect(() => {
    if (q.length < MIN_ENTITY_CHARS) {
      setEntities({ user: [], worker: [], booking: [] });
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const params = { search: q, limit: 5 };
      const [users, workers, bookings] = await Promise.allSettled([
        canSee.users ? adminUserService.getAllUsers(params) : Promise.resolve(null),
        canSee.workers ? adminWorkerService.getAllWorkers(params) : Promise.resolve(null),
        canSee.bookings ? adminBookingService.getAllBookings(params) : Promise.resolve(null),
      ]);
      if (id !== requestId.current) return; // a newer search replaced this one

      const rows = (r) => (r.status === 'fulfilled' && Array.isArray(r.value?.data) ? r.value.data : []);
      setEntities({ user: rows(users), worker: rows(workers), booking: rows(bookings) });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [q, canSee]);

  // The flat, ordered list that the keyboard moves through
  const items = useMemo(() => {
    const list = [];

    if (!q) {
      loadRecent().forEach((r) => list.push({ group: 'recent', label: r.label, sub: r.sub, route: r.route }));
      if (list.length === 0) {
        pages.filter((p) => !p.parent).slice(0, 6).forEach((p) => list.push({ group: 'page', label: p.title, route: p.route }));
      }
      return list;
    }

    pages
      .filter((p) => matches(p.title, q) || matches(p.parent, q))
      .slice(0, 6)
      .forEach((p) => list.push({ group: 'page', label: p.title, sub: p.parent || undefined, route: p.route }));

    entities.user.forEach((u) => list.push({
      group: 'user',
      label: u.name || u.email || 'User',
      sub: [u.phone, u.email].filter(Boolean).join(' · '),
      route: `/admin/users/all?search=${encodeURIComponent(u.phone || u.email || u.name || q)}`,
    }));
    entities.worker.forEach((w) => list.push({
      group: 'worker',
      label: w.businessName || w.name || 'Worker',
      sub: [w.name !== w.businessName ? w.name : null, w.phone].filter(Boolean).join(' · '),
      route: `/admin/workers/all?search=${encodeURIComponent(w.phone || w.email || w.name || q)}`,
    }));
    entities.booking.forEach((b) => list.push({
      group: 'booking',
      label: b.bookingNumber || 'Booking',
      sub: [b.serviceName, b.status].filter(Boolean).join(' · '),
      route: `/admin/bookings?search=${encodeURIComponent(b.bookingNumber || q)}`,
    }));
    return list;
  }, [q, pages, entities]);

  useEffect(() => { setActive(0); }, [q, entities]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    onClose?.();
  }, [onClose]);

  const choose = (item) => {
    if (!item) return;
    if (item.group !== 'recent') saveRecent({ label: item.label, sub: item.sub, route: item.route });
    navigate(item.route);
    close();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  // Keep the highlighted row in view while arrowing through a long list
  useEffect(() => {
    document.querySelector('[data-search-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const showPanel = open && (items.length > 0 || loading || q.length >= MIN_ENTITY_CHARS);
  let lastGroup = null;

  const panel = showPanel && (
    <div
      className={
        variant === 'overlay'
          ? 'mt-3 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden'
          : 'absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50'
      }
    >
      <div className="max-h-[60vh] overflow-y-auto overscroll-contain py-1">
        {items.map((item, idx) => {
          const Icon = ICONS[item.group];
          const header = item.group !== lastGroup ? GROUP_LABELS[item.group] : null;
          lastGroup = item.group;
          const isActive = idx === active;
          return (
            <div key={`${item.group}-${item.route}-${idx}`}>
              {header && (
                <p className="px-4 pt-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">{header}</p>
              )}
              <button
                type="button"
                data-search-active={isActive}
                onMouseEnter={() => setActive(idx)}
                onClick={() => choose(item)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${isActive ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">{item.label}</span>
                  {item.sub && <span className="block text-xs text-gray-500 truncate">{item.sub}</span>}
                </span>
                {isActive && <FiCornerDownLeft className="w-4 h-4 text-gray-400 shrink-0" />}
              </button>
            </div>
          );
        })}

        {loading && (
          <p className="px-4 py-3 text-xs text-gray-400">Searching users, workers and bookings…</p>
        )}
        {!loading && q.length >= MIN_ENTITY_CHARS && items.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">No results for “{q}”.</p>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400">
        <span>↑↓ to move</span><span>↵ to open</span><span>esc to close</span>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={variant === 'overlay' ? 'w-full' : 'relative w-full'}>
      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={variant === 'overlay'}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search pages, users, workers, bookings…"
          aria-label="Search the admin"
          className="w-full h-10 pl-10 pr-16 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder:text-gray-400 border border-transparent focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
        />
        {query ? (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200"
            aria-label="Clear search"
          >
            <FiX className="w-4 h-4" />
          </button>
        ) : (
          variant === 'inline' && (
            <kbd className="hidden xl:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">
              {navigator.platform?.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'} K
            </kbd>
          )
        )}
      </div>
      {panel}
    </div>
  );
};

export default AdminGlobalSearch;
