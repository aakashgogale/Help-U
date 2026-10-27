import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGlobe, FiX, FiCheck } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';
import { userAuthService } from '../../services/authService';
import { toast } from 'react-hot-toast';

const LanguageSelectorModal = ({ isOpen, onClose }) => {
  const {
    currentLanguage,
    setLanguage,
    supportedLanguages,
    t
  } = useLanguage();

  if (!isOpen) return null;

  const handleSelect = async (code, name) => {
    const isDifferent = code !== currentLanguage;
    setLanguage(code);
    toast.success(`Language set to ${name}`);
    onClose();

    // Persist to user profile if logged in
    try {
      await userAuthService.updateProfile({
        settings: { language: code }
      });
    } catch (e) {
      // Ignored for guests / non-auth users
    }

    // When the user changes language, reload so Google Maps API and singleton loaders
    // re-initialize completely in the newly selected language
    if (isDifferent) {
      setTimeout(() => {
        window.location.reload();
      }, 350);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Modal / Bottom Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <FiGlobe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{t('choose_language', 'Choose Language')}</h3>
                <p className="text-xs text-gray-400">{t('select_app_language', 'Select your preferred app language')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Language Options */}
          <div className="p-4 overflow-y-auto space-y-2">
            {supportedLanguages.map((lang) => {
              const active = currentLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code, lang.name)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    active
                      ? 'bg-teal-50 border-teal-200 text-teal-900 shadow-xs'
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/70 text-gray-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${active ? 'text-teal-900 font-bold' : 'text-gray-900'}`}>
                        {lang.name}
                      </span>
                      {active && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-600 text-white uppercase">
                          {t('active', 'Active')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 block mt-0.5 font-medium">
                      {lang.native}
                    </span>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    active ? 'bg-teal-600 text-white' : 'border border-gray-300'
                  }`}>
                    {active && <FiCheck className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
            {t('map_adapts_auto', 'Google Maps & interface elements adapt automatically')}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LanguageSelectorModal;
