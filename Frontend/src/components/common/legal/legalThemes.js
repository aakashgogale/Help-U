// Accent colours of the user app (green) and the worker app (navy)
export const legalThemes = {
  user: { accent: '#0F7457', dark: '#0B5A43', soft: '#E6F4EE' },
  worker: { accent: '#163B66', dark: '#0f2b48', soft: '#f0f6fc' }
};

export const themeFor = (pathname = '') => (pathname.startsWith('/worker') ? legalThemes.worker : legalThemes.user);
