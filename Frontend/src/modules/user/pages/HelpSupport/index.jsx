import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiSearch, FiMessageCircle, FiMail, FiPhone,
  FiChevronRight, FiHelpCircle, FiBook, FiAlertCircle,
  FiCheckCircle, FiClock, FiSend
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';
import legalPageService from '../../../../services/legalPageService';
import ModalLock from '../../../../components/common/ModalLock';

const HelpSupport = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('faq'); // the one group starts open
  const [showContactForm, setShowContactForm] = useState(false);
  const [supportInfo, setSupportInfo] = useState({
    email: '',
    phone: '',
    whatsapp: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/public/config');
        if (response.data?.success && response.data?.settings) {
          const { supportEmail, supportPhone, supportWhatsapp } = response.data.settings;
          setSupportInfo({
            email: supportEmail || '',
            phone: supportPhone || '',
            whatsapp: supportWhatsapp || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch support settings:', error);
      }
    };
    fetchSettings();
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Autofill details if user is signed in
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      if (stored) {
        const u = JSON.parse(stored);
        setFormData(prev => ({
          ...prev,
          name: prev.name || u.name || '',
          email: prev.email || u.email || '',
          phone: prev.phone || u.phone || ''
        }));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  // The questions come from the admin's Customer FAQ (Admin > Legal & Help Pages), so there is one
  // place to edit them. The admin FAQ is one flat list, shown here as a single group.
  const [faqs, setFaqs] = useState([]);
  useEffect(() => {
    let active = true;
    legalPageService.get('faq')
      .then((res) => {
        if (active && res?.success && res.page) setFaqs((res.page.faqs || []).map((f) => ({ q: f.question, a: f.answer })));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const categories = faqs.length > 0
    ? [{ id: 'faq', title: 'Frequently asked questions', icon: FiBook, color: '#3B82F6', questions: faqs }]
    : [];

  const quickActions = [
    {
      id: 'chat',
      title: 'WhatsApp Chat',
      subtitle: 'Chat with our support team',
      icon: FiMessageCircle,
      color: '#25D366',
      action: () => {
        if (supportInfo.whatsapp) {
          const cleanNumber = supportInfo.whatsapp.replace(/\D/g, '');
          window.location.href = `whatsapp://send?phone=${cleanNumber}`;
        } else {
          toast('WhatsApp support is currently unavailable');
        }
      }
    },
    {
      id: 'email',
      title: 'Email Us',
      subtitle: supportInfo.email || 'Not Available',
      icon: FiMail,
      color: '#10B981',
      action: () => {
        if (supportInfo.email) {
          window.location.href = `mailto:${supportInfo.email}`;
        } else {
          toast('Email support is currently unavailable');
        }
      }
    },
    {
      id: 'call',
      title: 'Call Us',
      subtitle: supportInfo.phone || 'Not Available',
      icon: FiPhone,
      color: '#F59E0B',
      action: () => {
        if (supportInfo.phone) {
          window.location.href = `tel:${supportInfo.phone}`;
        } else {
          toast('Phone support is currently unavailable');
        }
      }
    },
  ];

  const handleContactSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!formData.email?.trim() && !formData.phone?.trim()) {
      toast.error('Please give an email or a phone number so we can reply');
      return;
    }
    if (!formData.subject?.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!formData.message?.trim() || formData.message.trim().length < 5) {
      toast.error('Please write a short message (at least 5 characters)');
      return;
    }

    try {
      setSubmitting(true);
      // A signed-in customer's message is linked to their account; a visitor's goes through the public form
      const signedIn = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      const res = await api.post(signedIn ? '/users/support-messages' : '/public/support-message', formData);
      if (res.data?.success) {
        toast.success(res.data.message || 'Your message has been sent! We will get back to you soon.');
        setShowContactForm(false);
        setFormData(prev => ({ ...prev, subject: '', message: '' }));
      } else {
        toast.error(res.data?.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Submit support request error:', err);
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuestions = categories.flatMap(cat =>
    cat.questions.filter(q =>
      searchQuery === '' ||
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ).map(q => ({ ...q, category: cat.title, color: cat.color }))
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Help & Support</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <main className="px-4 pt-4">
        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Contact Us</h2>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map(action => {
              let href = null;
              if (action.id === 'chat' && supportInfo.whatsapp) {
                href = `whatsapp://send?phone=${supportInfo.whatsapp.replace(/\D/g, '')}`;
              } else if (action.id === 'email' && supportInfo.email) {
                href = `mailto:${supportInfo.email}`;
              } else if (action.id === 'call' && supportInfo.phone) {
                href = `tel:${supportInfo.phone.replace(/\D/g, '')}`;
              }

              const Component = href ? 'a' : 'button';

              return (
                <Component
                  key={action.id}
                  href={href}
                  onClick={!href ? action.action : undefined}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-98 border border-gray-100 flex items-center gap-4 w-full"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon className="w-6 h-6" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.subtitle}</p>
                  </div>
                  <FiChevronRight className="w-5 h-5 text-gray-400" />
                </Component>
              );
            })}
          </div>
        </div>

        {/* Submit a Request Button */}
        <button
          onClick={() => setShowContactForm(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4 font-semibold shadow-lg hover:shadow-xl transition-all active:scale-98 mb-6 flex items-center justify-center gap-2"
        >
          <FiSend className="w-5 h-5" />
          Submit a Request
        </button>

        {/* FAQ Categories */}
        {searchQuery === '' && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Browse by Category</h2>
            <div className="space-y-3">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}15` }}
                      >
                        <category.icon className="w-5 h-5" style={{ color: category.color }} />
                      </div>
                      <h3 className="font-semibold text-gray-900">{category.title}</h3>
                    </div>
                    <FiChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${selectedCategory === category.id ? 'rotate-90' : ''}`}
                    />
                  </div>

                  {/* Expanded Questions */}
                  {selectedCategory === category.id && (
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                      {category.questions.map((item, idx) => (
                        <div key={idx} className="text-left">
                          <div className="flex items-start gap-2 mb-2">
                            <FiHelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="font-medium text-gray-900 text-sm">{item.q}</p>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchQuery !== '' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Search Results ({filteredQuestions.length})
            </h2>
            {filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <FiAlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No results found for "{searchQuery}"</p>
                <p className="text-sm text-gray-500 mt-2">Try different keywords or contact support</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${item.color}15`,
                          color: item.color
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <FiHelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="font-medium text-gray-900 text-sm">{item.q}</p>
                    </div>
                    <p className="text-sm text-gray-600 ml-6">{item.a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <ModalLock />
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Submit a Request</h2>
                <button
                  onClick={() => setShowContactForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="Your name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                  placeholder="Describe your issue in detail..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4 font-semibold shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FiSend className="w-5 h-5" />
                {submitting ? 'Sending Request...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSupport;
