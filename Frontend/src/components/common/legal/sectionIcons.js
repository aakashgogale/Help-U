import {
  FiInfo, FiUser, FiCalendar, FiTag, FiCreditCard, FiXCircle, FiDatabase, FiShare2, FiLock,
  FiSliders, FiMail, FiAlertTriangle, FiShield, FiBookOpen, FiRefreshCw, FiSlash, FiFileText
} from 'react-icons/fi';

// First matching keyword in a section heading picks its icon
const RULES = [
  [/cancel|resched/, FiXCircle],
  [/pay|refund|wallet/, FiCreditCard],
  [/pric|fee|tax|charge/, FiTag],
  [/book|order/, FiCalendar],
  [/account|eligib|regist/, FiUser],
  [/secur|protect|safe/, FiLock],
  [/share|disclos|third/, FiShare2],
  [/collect|data|information|personal/, FiDatabase],
  [/right|choice|control|delet|access/, FiSliders],
  [/contact|grievance|support|reach/, FiMail],
  [/conduct|prohibit|misuse|responsib|obligation/, FiAlertTriangle],
  [/liabil|disclaim|warrant|indemn/, FiShield],
  [/law|jurisdiction|govern|dispute/, FiBookOpen],
  [/change|update|modif|revis/, FiRefreshCw],
  [/terminat|suspend/, FiSlash],
  [/about|overview|introduc|who we/, FiInfo]
];

export const iconForSection = (title = '') => {
  const t = title.toLowerCase();
  const hit = RULES.find(([re]) => re.test(t));
  return hit ? hit[1] : FiFileText;
};
