# 🚀 Wansan Studio (万三)

> **"数据聚宝，日进斗金。"**  
> **"Wansan - Turn Data into Wealth, Privately."**

## 项目简介

万三是一款本地优先 (Local-First) 的智能商业报表桌面端软件，专为保护数据隐私而设计的商业智能工具。

## 核心特性

- 🔒 **守财 (Privacy)**: 数据不出域，本地算力处理
- 📊 **聚财 (Insight)**: 自然语言交互，一键生成报表
- ⚡ **生财 (Efficiency)**: 极速决策，由繁入简

## 技术栈

- **App Shell**: Electron
- **Frontend**: React 18 + Vite + TypeScript
- **UI Library**: Tailwind CSS + ShadcnUI
- **State Management**: TanStack Query v5
- **Data Processing**: TanStack Table v8
- **Data Engine**: DuckDB (Node.js Bindings)
- **AI**: OpenAI GPT-4o-mini

## 开发环境设置

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建应用
npm run build

# 打包应用
npm run dist
```

## 项目结构

```
wansan-studio/
├── src/
│   ├── main/           # Electron 主进程
│   ├── renderer/       # React 渲染进程
│   ├── shared/         # 共享代码
│   └── types/          # TypeScript 类型定义
├── public/             # 静态资源
├── assets/             # 应用资源
├── build/              # 构建输出
├── scripts/            # 构建脚本
└── docs/               # 项目文档
```

## License

MIT License
