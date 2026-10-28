import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiLayout,
  FiSave,
  FiExternalLink,
  FiPlus,
  FiTrash2,
  FiPhone,
  FiMail,
  FiHelpCircle,
  FiUsers,
  FiInfo,
  FiCheckCircle,
  FiSearch,
  FiMessageSquare,
  FiClock,
  FiSmartphone,
  FiX,
  FiLayers
} from 'react-icons/fi';
import { PageHeader, Card, Toggle, Field, Button, StatusPill, EmptyState, Pagination } from '../../components/adminUi';
import { inputClass, formatDateTime } from '../../components/adminFormat';
import landingAdminService from '../../services/landingAdminService';

const TABS = [
  { id: 'hero', label: 'Hero & App Links', icon: FiLayout },
  { id: 'about', label: 'About Us', icon: FiInfo },
  { id: 'how-it-works', label: 'How It Works', icon: FiClock },
  { id: 'partner', label: 'Partner Section', icon: FiUsers },
  { id: 'faqs', label: 'FAQs Manager', icon: FiHelpCircle },
  { id: 'contact', label: 'Contact & Socials', icon: FiPhone },
  { id: 'footer', label: 'Footer & Copyright', icon: FiLayers },
  { id: 'leads', label: 'Partner Leads', icon: FiMessageSquare }
];

const LandingPageAdmin = () => {
  const [activeTab, setActiveTab] = useState('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);

  // Partner Leads state
  const [leads, setLeads] = useState([]);
  const [leadStatus, setLeadStatus] = useState('all');
  const [leadSearch, setLeadSearch] = useState('');
  const [leadPage, setLeadPage] = useState(1);
  const [leadPagination, setLeadPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [leadCounts, setLeadCounts] = useState({ all: 0, new: 0, contacted: 0, onboarded: 0, rejected: 0 });
  const [leadsLoading, setLeadsLoading] = useState(false);

  // New trade skill input for partner configuration
  const [newTradeInput, setNewTradeInput] = useState('');

  // Fetch Config
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await landingAdminService.getConfig();
      if (res?.success && res.config) {
        setConfig({
          ...res.config,
          footer: res.config.footer || {
            brandDescription: 'Enterprise on-demand home & technical services marketplace across Indore. Certified genuine parts, transparent doorstep billing, and background-checked technicians.',
            copyrightText: '© {year} Help-U Technologies. All rights reserved.',
            bottomRightText: 'Built in Indore 🇮🇳 • Speed, Safety & Quality'
          }
        });
      }
    } catch (err) {
      toast.error('Failed to load landing page configuration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Leads
  const loadLeads = useCallback(async () => {
    try {
      setLeadsLoading(true);
      const res = await landingAdminService.getPartnerLeads({
        status: leadStatus,
        search: leadSearch,
        page: leadPage,
        limit: 15
      });
      if (res?.success) {
        setLeads(res.leads || []);
        setLeadPagination(res.pagination || { page: 1, pages: 1, total: 0 });
        if (res.counts) setLeadCounts(res.counts);
      }
    } catch (err) {
      console.error('Failed to load partner leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  }, [leadStatus, leadSearch, leadPage]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (activeTab === 'leads') {
      loadLeads();
    }
  }, [activeTab, loadLeads]);

  // Handle Save
  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await landingAdminService.updateConfig(config);
      if (res?.success) {
        toast.success('Landing page updated successfully!');
        if (res.config) setConfig(res.config);
      }
    } catch (err) {
      toast.error('Failed to save changes.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Lead actions
  const handleUpdateLeadStatus = async (id, newStatus) => {
    try {
      const res = await landingAdminService.updatePartnerLeadStatus(id, { status: newStatus });
      if (res?.success) {
        toast.success(`Lead marked as ${newStatus}`);
        loadLeads();
      }
    } catch (err) {
      toast.error('Failed to update lead status');
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await landingAdminService.deletePartnerLead(id);
      if (res?.success) {
        toast.success('Lead deleted');
        loadLeads();
      }
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  // Partner Trades configuration handlers
  const handleAddTrade = (e) => {
    if (e) e.preventDefault();
    const trimmed = newTradeInput.trim();
    if (!trimmed) return;
    const currentTrades =
      config?.partnerSection?.trades && config.partnerSection.trades.length > 0
        ? config.partnerSection.trades
        : [
            'AC & Appliance Repair',
            'Electrician',
            'Plumbing',
            'Electronics & TV',
            'Cleaning & Pest Control',
            'Carpenter & Painting'
          ];
    if (currentTrades.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('This skill is already in the list.');
      return;
    }
    setConfig({
      ...config,
      partnerSection: {
        ...config.partnerSection,
        trades: [...currentTrades, trimmed]
      }
    });
    setNewTradeInput('');
  };

  const handleRemoveTrade = (tradeToRemove) => {
    const currentTrades =
      config?.partnerSection?.trades && config.partnerSection.trades.length > 0
        ? config.partnerSection.trades
        : [
            'AC & Appliance Repair',
            'Electrician',
            'Plumbing',
            'Electronics & TV',
            'Cleaning & Pest Control',
            'Carpenter & Painting'
          ];
    setConfig({
      ...config,
      partnerSection: {
        ...config.partnerSection,
        trades: currentTrades.filter((t) => t !== tradeToRemove)
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#163B66] border-t-transparent"></div>
          <p className="text-sm font-medium">Loading Landing Page Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FiLayout}
        title="Landing Page & Marketing"
        description="Configure headlines, download links, FAQs, partner onboarding copy, and view partner registration leads."
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/Home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FiExternalLink className="h-4 w-4" /> Live Landing Page
            </a>
            {activeTab !== 'leads' && (
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <FiSave className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs Bar */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-2 rounded-xl shadow-sm">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-[#163B66] text-[#163B66]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'leads' && leadCounts.new > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {leadCounts.new}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: HERO & APP LINKS */}
      {activeTab === 'hero' && config && (
        <div className="space-y-6">
          <Card title="Hero Banner & Slogans">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Hero Headline" hint="Main title shown above the fold">
                  <input
                    type="text"
                    value={config.hero?.title || ''}
                    onChange={(e) =>
                      setConfig({ ...config, hero: { ...config.hero, title: e.target.value } })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Hero Subtitle / Description" hint="Supporting paragraph text">
                  <textarea
                    rows={3}
                    value={config.hero?.subtitle || ''}
                    onChange={(e) =>
                      setConfig({ ...config, hero: { ...config.hero, subtitle: e.target.value } })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Top Badge Text" hint="Small pill badge above the title">
                <input
                  type="text"
                  value={config.hero?.badgeText || ''}
                  onChange={(e) =>
                    setConfig({ ...config, hero: { ...config.hero, badgeText: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Hero Image URL / Path">
                <input
                  type="text"
                  value={config.hero?.heroImageUrl || ''}
                  onChange={(e) =>
                    setConfig({ ...config, hero: { ...config.hero, heroImageUrl: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Customer Button Text">
                <input
                  type="text"
                  value={config.hero?.ctaUserText || ''}
                  onChange={(e) =>
                    setConfig({ ...config, hero: { ...config.hero, ctaUserText: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Partner Button Text">
                <input
                  type="text"
                  value={config.hero?.ctaPartnerText || ''}
                  onChange={(e) =>
                    setConfig({ ...config, hero: { ...config.hero, ctaPartnerText: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          <Card title="App Download Links">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Google Play Store URL"
                hint="Paste the Android listing URL (e.g. https://play.google.com/store/apps/details?id=...). Until set, landing buttons direct visitors to the web app."
              >
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://play.google.com/store/apps/details?id=in.helpu.customer"
                    value={config.appLinks?.playStoreUrl || ''}
                    onChange={(e) =>
                      setConfig({ ...config, appLinks: { ...config.appLinks, playStoreUrl: e.target.value } })
                    }
                    className={`${inputClass} pr-14`}
                  />
                  {config.appLinks?.playStoreUrl && (
                    <a
                      href={config.appLinks.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#163B66] hover:underline"
                    >
                      Test ↗
                    </a>
                  )}
                </div>
              </Field>

              <Field
                label="Apple App Store URL"
                hint="Paste the iOS listing URL (e.g. https://apps.apple.com/app/...). Until set, landing buttons direct visitors to the web app."
              >
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://apps.apple.com/in/app/help-u/id1234567890"
                    value={config.appLinks?.appStoreUrl || ''}
                    onChange={(e) =>
                      setConfig({ ...config, appLinks: { ...config.appLinks, appStoreUrl: e.target.value } })
                    }
                    className={`${inputClass} pr-14`}
                  />
                  {config.appLinks?.appStoreUrl && (
                    <a
                      href={config.appLinks.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#163B66] hover:underline"
                    >
                      Test ↗
                    </a>
                  )}
                </div>
              </Field>

              <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Show QR Code</p>
                  <p className="text-xs text-gray-500">Allow desktop visitors to scan QR code directly with camera to download the app</p>
                </div>
                <Toggle
                  checked={config.appLinks?.isQrCodeVisible !== false}
                  onChange={(checked) =>
                    setConfig({ ...config, appLinks: { ...config.appLinks, isQrCodeVisible: checked } })
                  }
                />
              </div>
            </div>
          </Card>

          <Card title="Platform Metrics & Stats Counters">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {[
                { key: 'auto', label: 'Automatic (real numbers)' },
                { key: 'manual', label: 'Type my own' }
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setConfig({ ...config, statsMode: m.key })}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${(config.statsMode || 'auto') === m.key ? 'border-[#163B66] bg-[#163B66] text-white' : 'border-gray-300 bg-white text-gray-600'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {(config.statsMode || 'auto') === 'auto' ? (
              <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                The landing page counts these from your live data: approved professionals, customers, active services and the average review rating
                (shown once there are at least 5 reviews). A number that is 0 is hidden. Switch to “Type my own” to enter figures by hand.
              </p>
            ) : (
              <p className="mb-3 text-xs text-amber-800">These figures are shown exactly as typed. Make sure they are true.</p>
            )}
            {(config.statsMode || 'auto') === 'manual' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(config.stats || []).map((stat, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <Field label={`Stat #${idx + 1} Value`}>
                    <input
                      type="text"
                      value={stat.value}
                      onChange={(e) => {
                        const newStats = [...config.stats];
                        newStats[idx].value = e.target.value;
                        setConfig({ ...config, stats: newStats });
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Label">
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => {
                        const newStats = [...config.stats];
                        newStats[idx].label = e.target.value;
                        setConfig({ ...config, stats: newStats });
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>
              ))}
            </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: ABOUT US */}
      {activeTab === 'about' && config && (
        <div className="space-y-6">
          <Card title="About Us & Mission">
            <div className="space-y-4">
              <Field label="Section Title">
                <input
                  type="text"
                  value={config.aboutUs?.title || ''}
                  onChange={(e) =>
                    setConfig({ ...config, aboutUs: { ...config.aboutUs, title: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Tagline">
                <input
                  type="text"
                  value={config.aboutUs?.tagline || ''}
                  onChange={(e) =>
                    setConfig({ ...config, aboutUs: { ...config.aboutUs, tagline: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Company Story / Description">
                <textarea
                  rows={4}
                  value={config.aboutUs?.description || ''}
                  onChange={(e) =>
                    setConfig({ ...config, aboutUs: { ...config.aboutUs, description: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Mission Statement">
                <textarea
                  rows={2}
                  value={config.aboutUs?.mission || ''}
                  onChange={(e) =>
                    setConfig({ ...config, aboutUs: { ...config.aboutUs, mission: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          <Card title="Trust Pillars & Guarantees">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(config.aboutUs?.pillars || []).map((pillar, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <Field label={`Pillar #${idx + 1} Title`}>
                    <input
                      type="text"
                      value={pillar.title}
                      onChange={(e) => {
                        const pillars = [...config.aboutUs.pillars];
                        pillars[idx].title = e.target.value;
                        setConfig({ ...config, aboutUs: { ...config.aboutUs, pillars } });
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      rows={2}
                      value={pillar.desc}
                      onChange={(e) => {
                        const pillars = [...config.aboutUs.pillars];
                        pillars[idx].desc = e.target.value;
                        setConfig({ ...config, aboutUs: { ...config.aboutUs, pillars } });
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: HOW IT WORKS */}
      {activeTab === 'how-it-works' && config && (
        <div className="space-y-6">
          <Card title="How It Works for Customers (User Steps)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(config.howItWorks?.userSteps || []).map((step, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#163B66] text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">Step {idx + 1}</span>
                  </div>
                  <Field label="Step Title">
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => {
                        const userSteps = [...config.howItWorks.userSteps];
                        userSteps[idx].title = e.target.value;
                        setConfig({ ...config, howItWorks: { ...config.howItWorks, userSteps } });
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      rows={2}
                      value={step.desc}
                      onChange={(e) => {
                        const userSteps = [...config.howItWorks.userSteps];
                        userSteps[idx].desc = e.target.value;
                        setConfig({ ...config, howItWorks: { ...config.howItWorks, userSteps } });
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </Card>

          <Card title="How It Works for Service Partners (Partner Steps)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(config.howItWorks?.partnerSteps || []).map((step, idx) => (
                <div key={idx} className="rounded-lg border border-cyan-100 bg-cyan-50/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-700 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">Step {idx + 1}</span>
                  </div>
                  <Field label="Step Title">
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => {
                        const partnerSteps = [...config.howItWorks.partnerSteps];
                        partnerSteps[idx].title = e.target.value;
                        setConfig({ ...config, howItWorks: { ...config.howItWorks, partnerSteps } });
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      rows={2}
                      value={step.desc}
                      onChange={(e) => {
                        const partnerSteps = [...config.howItWorks.partnerSteps];
                        partnerSteps[idx].desc = e.target.value;
                        setConfig({ ...config, howItWorks: { ...config.howItWorks, partnerSteps } });
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: PARTNER SECTION */}
      {activeTab === 'partner' && config && (
        <div className="space-y-6">
          <Card
            title="Partner Onboarding Pitch"
            right={
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Allow Partner Signups:</span>
                <Toggle
                  checked={config.partnerSection?.isRegistrationEnabled !== false}
                  onChange={(checked) =>
                    setConfig({
                      ...config,
                      partnerSection: { ...config.partnerSection, isRegistrationEnabled: checked }
                    })
                  }
                />
              </div>
            }
          >
            <div className="space-y-4">
              <Field label="Partner Section Headline">
                <input
                  type="text"
                  value={config.partnerSection?.title || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      partnerSection: { ...config.partnerSection, title: e.target.value }
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Subtitle / Earnings Pitch">
                <textarea
                  rows={2}
                  value={config.partnerSection?.subtitle || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      partnerSection: { ...config.partnerSection, subtitle: e.target.value }
                    })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          <Card title="Partner Perks / Value Points">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(config.partnerSection?.perks || []).map((perk, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <Field label={`Perk #${idx + 1} Title`}>
                    <input
                      type="text"
                      value={perk.title}
                      onChange={(e) => {
                        const perks = [...config.partnerSection.perks];
                        perks[idx].title = e.target.value;
                        setConfig({
                          ...config,
                          partnerSection: { ...config.partnerSection, perks }
                        });
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      rows={2}
                      value={perk.desc}
                      onChange={(e) => {
                        const perks = [...config.partnerSection.perks];
                        perks[idx].desc = e.target.value;
                        setConfig({
                          ...config,
                          partnerSection: { ...config.partnerSection, perks }
                        });
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </Card>

          {/* Partner Mobile App Download Links */}
          <Card title="Partner Mobile App Download Links">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Partner Android Play Store URL"
                hint="Paste the technician/partner Android listing URL. Displayed in the 'Have a Partner Account?' prompt card."
              >
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://play.google.com/store/apps/details?id=in.helpu.partner"
                    value={config.partnerSection?.partnerPlayStoreUrl || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        partnerSection: {
                          ...config.partnerSection,
                          partnerPlayStoreUrl: e.target.value
                        }
                      })
                    }
                    className={`${inputClass} pr-14`}
                  />
                  {config.partnerSection?.partnerPlayStoreUrl && (
                    <a
                      href={config.partnerSection.partnerPlayStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#163B66] hover:underline"
                    >
                      Test ↗
                    </a>
                  )}
                </div>
              </Field>

              <Field
                label="Partner Apple App Store URL"
                hint="Paste the technician/partner iOS listing URL. Displayed in the 'Have a Partner Account?' prompt card."
              >
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://apps.apple.com/in/app/help-u-partner/id987654321"
                    value={config.partnerSection?.partnerAppStoreUrl || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        partnerSection: {
                          ...config.partnerSection,
                          partnerAppStoreUrl: e.target.value
                        }
                      })
                    }
                    className={`${inputClass} pr-14`}
                  />
                  {config.partnerSection?.partnerAppStoreUrl && (
                    <a
                      href={config.partnerSection.partnerAppStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#163B66] hover:underline"
                    >
                      Test ↗
                    </a>
                  )}
                </div>
              </Field>
            </div>
          </Card>

          {/* Partner Registration Form Settings */}
          <Card title="Partner Registration Form Configuration">
            <div className="space-y-4">
              <Field
                label="Default City"
                hint="This city is shown as the default value in the City * field on the partner registration form."
              >
                <input
                  type="text"
                  placeholder="Bangalore"
                  value={config.partnerSection?.defaultCity || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      partnerSection: {
                        ...config.partnerSection,
                        defaultCity: e.target.value
                      }
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Configured Skills / Trades
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  These trades appear in the &quot;Primary Trade / Skill&quot; dropdown. Applicants can also choose &quot;Other Skilled Trade&quot; to write any custom skill.
                </p>

                {/* Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(
                    config.partnerSection?.trades && config.partnerSection.trades.length > 0
                      ? config.partnerSection.trades
                      : [
                          'AC & Appliance Repair',
                          'Electrician',
                          'Plumbing',
                          'Electronics & TV',
                          'Cleaning & Pest Control',
                          'Carpenter & Painting'
                        ]
                  ).map((trade) => (
                    <span
                      key={trade}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold"
                    >
                      <span>{trade}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTrade(trade)}
                        className="text-blue-500 hover:text-red-600 rounded-full p-0.5 hover:bg-blue-100 transition-colors"
                        title="Remove skill"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add new skill */}
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="e.g. CCTV Technician, RO Purifier..."
                    value={newTradeInput}
                    onChange={(e) => setNewTradeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTrade();
                      }
                    }}
                    className={inputClass}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddTrade}
                    className="whitespace-nowrap inline-flex items-center gap-1"
                  >
                    <FiPlus /> Add Skill
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: FAQS MANAGER */}
      {activeTab === 'faqs' && config && (
        <Card title="Frequently Asked Questions">
          <p className="text-sm text-gray-700">
            The landing page shows the same questions as the apps, so there is one place to edit them:
            the <span className="font-semibold">Customer FAQ</span> fills the “Customer Questions” tab and the
            <span className="font-semibold"> Professional FAQ</span> fills the “Partner Questions” tab.
          </p>
          <a
            href="/admin/legal-pages"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-700"
          >
            <FiHelpCircle /> Edit FAQs in Legal &amp; Help Pages
          </a>
        </Card>
      )}

      {activeTab === 'contact' && config && (
        <div className="space-y-6">
          <Card title="Direct Support & Office Channels">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 md:col-span-2">
                The support phone, WhatsApp and email shown here come from{' '}
                <a href="/admin/settings" className="font-semibold underline">Settings &rsaquo; Support</a>, the same
                details the apps use, so they can never differ. Set them once there.
              </div>

              <Field label="Working / Operating Hours">
                <input
                  type="text"
                  value={config.contact?.workingHours || ''}
                  onChange={(e) =>
                    setConfig({ ...config, contact: { ...config.contact, workingHours: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Head Office Address">
                  <input
                    type="text"
                    value={config.contact?.companyAddress || ''}
                    onChange={(e) =>
                      setConfig({ ...config, contact: { ...config.contact, companyAddress: e.target.value } })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Social Media URLs">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Instagram URL">
                <input
                  type="url"
                  value={config.socialLinks?.instagram || ''}
                  onChange={(e) =>
                    setConfig({ ...config, socialLinks: { ...config.socialLinks, instagram: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Facebook URL">
                <input
                  type="url"
                  value={config.socialLinks?.facebook || ''}
                  onChange={(e) =>
                    setConfig({ ...config, socialLinks: { ...config.socialLinks, facebook: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="LinkedIn URL">
                <input
                  type="url"
                  value={config.socialLinks?.linkedin || ''}
                  onChange={(e) =>
                    setConfig({ ...config, socialLinks: { ...config.socialLinks, linkedin: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="YouTube URL">
                <input
                  type="url"
                  value={config.socialLinks?.youtube || ''}
                  onChange={(e) =>
                    setConfig({ ...config, socialLinks: { ...config.socialLinks, youtube: e.target.value } })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          <Card title="Footer Bottom Bar Elements (2nd & 4th Arrows)">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3.5 mb-4 text-xs text-blue-900">
              <div>
                <p className="font-bold">Need full control &amp; live preview for the Footer?</p>
                <p className="text-blue-800">You can also switch to the dedicated Footer &amp; Copyright tab for real-time visual inspection.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('footer')}
                className="shrink-0 bg-[#163B66] hover:bg-[#122e50] text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Go to Footer Tab &rarr;
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Footer Copyright Text (2nd Arrow)"
                hint="Use {year} to dynamically output the current year."
              >
                <input
                  type="text"
                  placeholder="© {year} Help-U Technologies. All rights reserved."
                  value={config.footer?.copyrightText ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...(config.footer || {}),
                        copyrightText: e.target.value
                      }
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <Field
                label="Footer Bottom-Right Badge / Tagline (4th Arrow)"
                hint="Quality / Regional tagline at bottom right."
              >
                <input
                  type="text"
                  placeholder="Built in Indore 🇮🇳 • Speed, Safety & Quality"
                  value={config.footer?.bottomRightText ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...(config.footer || {}),
                        bottomRightText: e.target.value
                      }
                    })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>
        </div>
      )}

      {/* TAB: FOOTER & COPYRIGHT */}
      {activeTab === 'footer' && config && (
        <div className="space-y-6">
          <Card title="Footer Bottom Bar Settings (2nd & 4th Arrows)">
            <p className="text-xs text-gray-500 mb-4">
              Configure the copyright notice and the regional quality badge shown in the bottom bar of the landing page footer.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                label="Footer Copyright Text (2nd Arrow)"
                hint="Use {year} to dynamically display the current year, or type any fixed notice."
              >
                <input
                  type="text"
                  placeholder="© {year} Help-U Technologies. All rights reserved."
                  value={config.footer?.copyrightText ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...(config.footer || {}),
                        copyrightText: e.target.value
                      }
                    })
                  }
                  className={inputClass}
                />
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-semibold text-gray-600">Live preview:</span>
                  <span className="text-gray-900 font-medium">
                    {(config.footer?.copyrightText || '© {year} Help-U Technologies. All rights reserved.').replace(/\{year\}/gi, new Date().getFullYear())}
                  </span>
                </div>
              </Field>

              <Field
                label="Footer Bottom-Right Text / Badge (4th Arrow)"
                hint="Badge or quality tagline shown at the bottom right corner."
              >
                <input
                  type="text"
                  placeholder="Built in Indore 🇮🇳 • Speed, Safety & Quality"
                  value={config.footer?.bottomRightText ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: {
                        ...(config.footer || {}),
                        bottomRightText: e.target.value
                      }
                    })
                  }
                  className={inputClass}
                />
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-semibold text-gray-600">Live preview:</span>
                  <span className="text-gray-900 font-medium">
                    {config.footer?.bottomRightText || 'Built in Indore 🇮🇳 • Speed, Safety & Quality'}
                  </span>
                </div>
              </Field>
            </div>
          </Card>

          <Card title="Footer Brand Overview (1st Arrow)">
            <Field
              label="Footer Brand Description (1st Arrow)"
              hint="Brief summary paragraph displayed directly under the Help-U logo in the footer."
            >
              <textarea
                rows={3}
                placeholder="Enterprise on-demand home & technical services marketplace across Indore..."
                value={config.footer?.brandDescription ?? ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    footer: {
                      ...(config.footer || {}),
                      brandDescription: e.target.value
                    }
                  })
                }
                className={inputClass}
              />
            </Field>
          </Card>

          {/* Visual Footer Preview Box */}
          <Card title="Live Footer Interactive Preview">
            <p className="text-xs text-gray-500 mb-3">
              This preview shows exactly how your footer elements appear to visitors, with all 4 arrow positions clearly mapped:
            </p>
            <div className="rounded-xl bg-gray-950 p-6 text-white border border-gray-800 text-xs shadow-inner">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-gray-800">
                <div className="md:col-span-2 space-y-2">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                    1st Arrow • Brand Description
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="/helpu-logo.png" alt="Help-U" className="h-6 w-auto bg-white rounded p-0.5" onError={(e) => { e.target.style.display = 'none'; }} />
                    <span className="font-black text-lg">Help<span className="text-amber-400">-U</span></span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
                    {config.footer?.brandDescription || 'Enterprise on-demand home & technical services marketplace across Indore. Certified genuine parts, transparent doorstep billing, and background-checked technicians.'}
                  </p>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-2">Explore</h4>
                  <ul className="space-y-1 text-gray-400 text-xs">
                    <li>About Us</li>
                    <li>Services</li>
                    <li>How It Works</li>
                    <li>For Partners</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    3rd Arrow • Location & Helpline
                  </div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Location</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {config.contact?.companyAddress || 'Vijay Nagar, Scheme 54, Indore, MP 452010'}
                  </p>
                  {config.contact?.supportPhone && (
                    <p className="text-gray-400 text-xs">
                      Helpline: <span className="text-white font-medium">{config.contact.supportPhone}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    2nd Arrow
                  </span>
                  <p className="text-gray-400">
                    {(config.footer?.copyrightText || '© {year} Help-U Technologies. All rights reserved.').replace(/\{year\}/gi, new Date().getFullYear())}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    4th Arrow
                  </span>
                  <p className="text-gray-400 flex items-center gap-1">
                    {config.footer?.bottomRightText || 'Built in Indore 🇮🇳 • Speed, Safety & Quality'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 7: PARTNER LEADS */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          <Card
            title={`Partner Onboarding Registrations (${leadCounts.all || 0})`}
            right={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name, phone, trade..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="rounded-lg border border-gray-300 pl-9 pr-3 py-1.5 text-xs focus:border-[#163B66] focus:outline-none"
                  />
                </div>
                <Button variant="secondary" onClick={loadLeads} className="text-xs">
                  Refresh
                </Button>
              </div>
            }
          >
            {/* Status Filters */}
            <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-100 pb-3">
              {[
                { id: 'all', label: 'All', count: leadCounts.all },
                { id: 'new', label: 'New', count: leadCounts.new, color: 'text-red-600 bg-red-50' },
                { id: 'contacted', label: 'Contacted', count: leadCounts.contacted, color: 'text-amber-600 bg-amber-50' },
                { id: 'onboarded', label: 'Onboarded', count: leadCounts.onboarded, color: 'text-green-600 bg-green-50' },
                { id: 'rejected', label: 'Rejected', count: leadCounts.rejected, color: 'text-gray-600 bg-gray-50' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => { setLeadStatus(st.id); setLeadPage(1); }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    leadStatus === st.id
                      ? 'bg-[#163B66] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {st.label}
                  <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                    {st.count || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Table */}
            {leadsLoading ? (
              <div className="py-12 text-center text-gray-400">Loading partner leads...</div>
            ) : leads.length === 0 ? (
              <EmptyState
                icon={FiMessageSquare}
                title="No partner leads found"
                description={leadSearch ? 'Try a different search term.' : 'Submitted leads from the landing page will appear here.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Applicant</th>
                      <th className="px-3 py-2.5 font-semibold">Trade & City</th>
                      <th className="px-3 py-2.5 font-semibold">Experience</th>
                      <th className="px-3 py-2.5 font-semibold">Contact Actions</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Date</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {leads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3 py-3 font-medium text-gray-900">
                          <div>{lead.name}</div>
                          {lead.email && <div className="text-[11px] text-gray-400">{lead.email}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-semibold text-[#163B66]">{lead.trade}</span>
                          <div className="text-gray-500">{lead.city}</div>
                        </td>
                        <td className="px-3 py-3 text-gray-600">{lead.experience || '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${lead.phone}`}
                              className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <FiPhone className="h-3 w-3" /> {lead.phone}
                            </a>
                            <a
                              href={`https://wa.me/91${lead.phone.replace(/\D/g, '').slice(-10)}?text=Hello%20${encodeURIComponent(lead.name)},%20thank%20you%20for%20registering%20with%20Help-U!`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100"
                            >
                              WhatsApp
                            </a>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateLeadStatus(lead._id, e.target.value)}
                            className={`rounded border px-2 py-1 text-xs font-semibold ${
                              lead.status === 'new'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : lead.status === 'contacted'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : lead.status === 'onboarded'
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                            }`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="onboarded">Onboarded</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="px-3 py-3 text-gray-400 whitespace-nowrap">
                          {lead.createdAt ? formatDateTime(lead.createdAt) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead._id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Lead"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={leadPagination.page}
              pages={leadPagination.pages}
              onChange={(p) => setLeadPage(p)}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default LandingPageAdmin;
