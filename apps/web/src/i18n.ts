import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEn from './locales/en/common.json';
import commonKo from './locales/ko/common.json';
import errorsEn from './locales/en/errors.json';
import errorsKo from './locales/ko/errors.json';
import pagesEn from './locales/en/pages.json';
import pagesKo from './locales/ko/pages.json';
import reviewsEn from './locales/en/reviews.json';
import reviewsKo from './locales/ko/reviews.json';
import qaEn from './locales/en/qa.json';
import qaKo from './locales/ko/qa.json';
import collectionsEn from './locales/en/collections.json';
import collectionsKo from './locales/ko/collections.json';
import searchEn from './locales/en/search.json';
import searchKo from './locales/ko/search.json';
import activityEn from './locales/en/activity.json';
import activityKo from './locales/ko/activity.json';
import dashboardEn from './locales/en/dashboard.json';
import dashboardKo from './locales/ko/dashboard.json';
import settingsEn from './locales/en/settings.json';
import settingsKo from './locales/ko/settings.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: commonEn, errors: errorsEn, pages: pagesEn, reviews: reviewsEn, qa: qaEn, collections: collectionsEn, search: searchEn, activity: activityEn, dashboard: dashboardEn, settings: settingsEn },
      ko: { common: commonKo, errors: errorsKo, pages: pagesKo, reviews: reviewsKo, qa: qaKo, collections: collectionsKo, search: searchKo, activity: activityKo, dashboard: dashboardKo, settings: settingsKo },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
