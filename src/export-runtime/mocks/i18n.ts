import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Minimal i18n for export
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: {
          'summary': 'Summary',
          'generated_time': 'Generated At',
          'no_chart_data': 'No Data',
          'page_of': 'Page {{page}} of {{total}}',
          'data_detail': 'Data Detail',
          'ai_insight': 'AI Insight',
          'untitled_chart': 'Untitled Chart'
        },
        chat: {
            'lineage_engine': 'Wansan Engine',
            'lineage_stats': '{{rowCount}} rows'
        }
      },
      zh: {
        common: {
          'summary': '摘要',
          'generated_time': '生成时间',
          'no_chart_data': '暂无数据',
          'page_of': '第 {{page}} 页 / 共 {{total}} 页',
          'data_detail': '数据详情',
          'ai_insight': 'AI 解读',
          'untitled_chart': '未命名图表'
        },
        chat: {
            'lineage_engine': '万三引擎',
            'lineage_stats': '{{rowCount}} 行'
        }
      }
    },
    lng: 'zh', // Default, will be overridden by snapshot if needed
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
