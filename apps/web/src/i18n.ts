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

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: commonEn, errors: errorsEn, pages: pagesEn, reviews: reviewsEn },
      ko: { common: commonKo, errors: errorsKo, pages: pagesKo, reviews: reviewsKo },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
