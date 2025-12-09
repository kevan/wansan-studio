import React, { useState } from 'react'
import { MagicInput } from './MagicInput'
import { QuickCommands, QuickCommand } from './QuickCommands'
import { AutocompleteInput, AutocompleteOption } from './AutocompleteInput'
import { LoadingState, LoadingType, InlineLoading } from './LoadingStates'
import {
  A4ReportLayout,
  A4Canvas,
  A4Header,
  A4Section,
  A4Footer,
} from './A4Canvas'
import { ChatInterface } from './ChatInterface'

export function ComponentShowcase() {
  const [inputValue, setInputValue] = useState('')
  const [autocompleteValue, setAutocompleteValue] = useState('')
  const [currentLoading, setCurrentLoading] = useState<LoadingType | null>(null)

  // 示例数据
  const sampleColumns = ['销售额', '客户名称', '产品类别', '订单日期', '销售员']
  const sampleTableData = [
    {
      客户名称: '张三公司',
      销售额: '¥50,000',
      产品类别: '电子产品',
      订单日期: '2024-01-15',
    },
    {
      客户名称: '李四贸易',
      销售额: '¥32,000',
      产品类别: '办公用品',
      订单日期: '2024-01-16',
    },
    {
      客户名称: '王五集团',
      销售额: '¥78,000',
      产品类别: '电子产品',
      订单日期: '2024-01-17',
    },
  ]

  const autocompleteOptions: AutocompleteOption[] = [
    {
      id: '1',
      label: '销售额',
      value: '[销售额]',
      type: 'column',
      description: '销售金额列',
    },
    {
      id: '2',
      label: '客户名称',
      value: '[客户名称]',
      type: 'column',
      description: '客户名称列',
    },
    {
      id: '3',
      label: '求和',
      value: 'SUM(',
      type: 'function',
      description: '计算总和',
    },
    {
      id: '4',
      label: '平均值',
      value: 'AVG(',
      type: 'function',
      description: '计算平均值',
    },
  ]

  const handleQuerySubmit = (query: string) => {
    console.log('Query submitted:', query)
    // 模拟加载过程
    setCurrentLoading('thinking')
    setTimeout(() => {
      setCurrentLoading('crunching')
      setTimeout(() => {
        setCurrentLoading(null)
      }, 2000)
    }, 1500)
  }

  const handleQuickCommand = (command: QuickCommand) => {
    console.log('Quick command:', command)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Wansan Studio UI 组件展示
        </h1>
        <p className="text-gray-600">展示所有新开发的 UI/UX 组件</p>
      </div>

      {/* 1. 自然语言输入框 */}
      <section className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">
          1. 自然语言输入框 (MagicInput)
        </h2>
        <MagicInput
          onSubmit={query => console.log('Magic input:', query)}
          placeholder="用自然语言描述你想要的报表..."
        />
      </section>

      {/* 2. 快捷指令 */}
      <section className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">
          2. 快捷指令 Chip (QuickCommands)
        </h2>
        <QuickCommands onCommandClick={handleQuickCommand} />
      </section>

      {/* 3. 自动完成输入框 */}
      <section className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">
          3. 自动完成输入框 (AutocompleteInput)
        </h2>
        <AutocompleteInput
          value={autocompleteValue}
          onChange={setAutocompleteValue}
          onSubmit={query => console.log('Autocomplete input:', query)}
          options={autocompleteOptions}
          placeholder="输入查询，试试输入 '销' 或 'SUM'..."
        />
      </section>

      {/* 4. 加载状态 */}
      <section className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">
          4. 加载状态 (LoadingStates)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <LoadingState type="cleaning" />
          <LoadingState type="thinking" />
          <LoadingState type="crunching" />
        </div>

        <div className="flex gap-4 items-center">
          <span className="text-sm text-gray-600">内联加载:</span>
          <InlineLoading type="thinking" size="sm" />
          <InlineLoading type="crunching" size="md" />
        </div>
      </section>

      {/* 5. A4 画布 */}
      <section className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          5. A4 画布布局 (A4Canvas)
        </h2>
        <div className="bg-white p-4 rounded">
          <A4ReportLayout
            title="销售数据分析报告"
            subtitle="2024年第一季度业绩总结"
            summary="本季度销售表现良好，总销售额达到160万元，同比增长15%。电子产品类别表现突出，占总销售额的60%以上。"
            insights={[
              '电子产品销售额占比最高，达到62%',
              '张三公司和王五集团是主要客户',
              '1月份销售额环比增长8%',
            ]}
            chartType="bar"
            chartTitle="各类别销售额对比"
            tableData={sampleTableData}
          />
        </div>
      </section>

      {/* 6. 聊天界面 */}
      <section className="bg-white rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold p-6 pb-0">
          6. 聊天界面 (ChatInterface)
        </h2>
        <div className="h-96">
          <ChatInterface
            tableName="sales_data"
            columns={['日期', '销售额', '客户名称', '产品类型']}
            messages={[
              {
                id: '1',
                type: 'user',
                content: '帮我分析一下销售趋势',
                timestamp: new Date(),
              },
              {
                id: '2',
                type: 'assistant',
                content: '好的，这是最近的销售趋势分析：',
                timestamp: new Date(),
                reportData: {
                  title: '销售趋势分析',
                  summary: '本月销售额呈上升趋势...',
                  chartType: 'line',
                  tableData: [
                    { 日期: '2023-01', 销售额: 100 },
                    { 日期: '2023-02', 销售额: 150 },
                  ],
                },
              },
            ]}
            onQuerySubmit={q => console.log('Query:', q)}
            loading={null}
          />
        </div>
      </section>

      {/* 测试按钮 */}
      <section className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">测试控制</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentLoading('cleaning')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            测试清洗状态
          </button>
          <button
            onClick={() => setCurrentLoading('thinking')}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            测试思考状态
          </button>
          <button
            onClick={() => setCurrentLoading('crunching')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            测试计算状态
          </button>
          <button
            onClick={() => setCurrentLoading(null)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            清除状态
          </button>
        </div>
      </section>
    </div>
  )
}
