import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enCommon from './locales/en/common.json'
import zhCommon from './locales/zh/common.json'
import enChat from './locales/en/chat.json'
import zhChat from './locales/zh/chat.json'
import enAnalysis from './locales/en/analysis.json'
import zhAnalysis from './locales/zh/analysis.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        chat: enChat,
        analysis: enAnalysis,
      },
      zh: {
        common: zhCommon,
        chat: zhChat,
        analysis: zhAnalysis,
      },
    },
    fallbackLng: 'en',
    lng: undefined,
    interpolation: { escapeValue: false },
    ns: ['common', 'chat', 'analysis'],
    defaultNS: 'common',
  })

export default i18n
