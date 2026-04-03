// src/lib/i18n/ar.ts
// Arabic translations for all static UI labels
// Used by LanguageContext for site-wide RTL toggle

export const AR: Record<string, string> = {
  // Sidebar Navigation
  'Journaling': 'التداول اليومي',
  'Backtesting': 'الاختبار التاريخي',
  'Mentor Mode': 'وضع المرشد',
  'Academy': 'الأكاديمية',
  'Dashboard': 'لوحة التحكم',
  'Trades': 'الصفقات',
  'Notebook': 'الملاحظات',
  'Reports': 'التقارير',
  'Tracking': 'التتبع',
  'Playbooks': 'الاستراتيجيات',
  'Progress Tracker': 'تتبع التقدم',
  'Trade Replay': 'إعادة الصفقات',
  'Resource Center': 'مركز الموارد',
  'Profile': 'الملف الشخصي',
  'Settings': 'الإعدادات',
  'News': 'الأخبار',
  'Logout Current Account': 'تسجيل الخروج',
  'My Accounts': 'حساباتي',
  'Add Account': 'إضافة حساب',
  'Not Logged In': 'غير مسجّل',
  // Header
  'Edit Layout': 'تعديل التخطيط',
  'Save Layout': 'حفظ التخطيط',
  'Upload Trades CSV': 'رفع ملف CSV',
  'Processing...': 'جارٍ المعالجة...',
  'Ask Bady AI': 'اسأل Bady AI',
  'Filters': 'الفلاتر',
  'Date range': 'نطاق التاريخ',
  'Total trades loaded': 'إجمالي الصفقات المحمّلة',
  // Dashboard metrics
  'Net P&L': 'صافي الربح/الخسارة',
  'Profit Factor': 'عامل الربح',
  'Trade Win %': 'نسبة الفوز',
  'Avg win/loss trade': 'متوسط الربح/الخسارة',
  'Max Drawdown': 'أقصى تراجع',
  // Calendar
  'Activity Heatmap (Daily P&L)': 'خريطة النشاط اليومي',
  'Include Fees': 'تضمين الرسوم',
  'Commissions': 'العمولات',
  'RECENT TRADES': 'الصفقات الأخيرة',
  'OPEN POSITIONS': 'المراكز المفتوحة',
  'Close Date': 'تاريخ الإغلاق',
  'Symbol': 'الرمز',
  'Net PnL': 'صافي الربح',
  'TODAY\'S ACTIVITY': 'نشاط اليوم',
  'Less Active': 'أقل نشاطاً',
  'More Active / Profit': 'أكثر نشاطاً / ربح',
  'Show Weekends': 'إظهار عطل نهاية الأسبوع',
  'Hide Weekends': 'إخفاء نهاية الأسبوع',
  'Market Closed': 'السوق مغلق',
  'Market Open': 'السوق مفتوح',
  'Weekend': 'عطلة نهاية الأسبوع',
  // News page
  'Live Gold News': 'أخبار الذهب المباشرة',
  'Translate to Arabic': 'ترجمة إلى العربية',
  'Translating...': 'جارٍ الترجمة...',
  'just now': 'الآن',
  'min ago': 'دقيقة مضت',
  'hrs ago': 'ساعة مضت',
  'LIVE': 'مباشر',
  'Read more': 'اقرأ المزيد',
  'No news available': 'لا توجد أخبار متاحة',
  'Refreshing...': 'جارٍ التحديث...',
  // Auth
  'Sign In': 'تسجيل الدخول',
  'Sign Up': 'إنشاء حساب',
  'Email': 'البريد الإلكتروني',
  'Password': 'كلمة المرور',
  'Forgot password?': 'نسيت كلمة المرور؟',
  'Sign out': 'تسجيل الخروج',
};

export function t(key: string, lang: 'en' | 'ar'): string {
  if (lang === 'en') return key;
  return AR[key] ?? key;
}
