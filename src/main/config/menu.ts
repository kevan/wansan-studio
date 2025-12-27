import { app, Menu, MenuItemConstructorOptions, BrowserWindow, shell } from 'electron';

const i18nResources = {
  en: {
    file: 'File',
    closeProject: 'Close Project',
    edit: 'Edit',
    view: 'View',
    window: 'Window',
    help: 'Help',
    learnMore: 'Learn More',
    about: 'About',
    hide: 'Hide',
    hideOthers: 'Hide Others',
    unhide: 'Show All',
    quit: 'Quit',
    services: 'Services',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    pasteAndMatchStyle: 'Paste and Match Style',
    delete: 'Delete',
    selectAll: 'Select All',
    speech: 'Speech',
    startSpeaking: 'Start Speaking',
    stopSpeaking: 'Stop Speaking',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front',
    close: 'Close',
    reload: 'Reload',
    forceReload: 'Force Reload',
    toggleDevTools: 'Toggle Developer Tools',
    resetZoom: 'Reset Zoom',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullscreen: 'Toggle Full Screen'
  },
  zh: {
    file: '文件',
    closeProject: '关闭项目',
    edit: '编辑',
    view: '视图',
    window: '窗口',
    help: '帮助',
    learnMore: '了解更多',
    about: '关于',
    hide: '隐藏',
    hideOthers: '隐藏其他',
    unhide: '显示全部',
    quit: '退出',
    services: '服务',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    pasteAndMatchStyle: '粘贴并匹配样式',
    delete: '删除',
    selectAll: '全选',
    speech: '语音',
    startSpeaking: '开始朗读',
    stopSpeaking: '停止朗读',
    minimize: '最小化',
    zoom: '缩放',
    front: '前置全部窗口',
    close: '关闭',
    reload: '重新加载',
    forceReload: '强制重新加载',
    toggleDevTools: '切换开发者工具',
    resetZoom: '重置缩放',
    zoomIn: '放大',
    zoomOut: '缩小',
    toggleFullscreen: '切换全屏'
  }
};

export function createApplicationMenu(mainWindow: BrowserWindow, language: 'en' | 'zh' = 'en') {
  const isMac = process.platform === 'darwin';
  const t = i18nResources[language] || i18nResources.en;

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { label: `${t.about} ${app.name}`, role: 'about' },
            { type: 'separator' },
            { label: t.services, role: 'services' },
            { type: 'separator' },
            { label: `${t.hide} ${app.name}`, role: 'hide' },
            { label: t.hideOthers, role: 'hideOthers' },
            { label: t.unhide, role: 'unhide' },
            { type: 'separator' },
            { label: `${t.quit} ${app.name}`, role: 'quit' }
          ]
        } as MenuItemConstructorOptions]
      : []),
    {
      label: t.file,
      submenu: [
        {
          label: t.closeProject,
          accelerator: 'CmdOrCtrl+Shift+W',
          click: () => {
            mainWindow.webContents.send('command:close-project');
          }
        },
        { type: 'separator' },
        (isMac ? { label: t.close, role: 'close' } : { label: t.quit, role: 'quit' }) as MenuItemConstructorOptions
      ] as MenuItemConstructorOptions[]
    },
    {
      label: t.edit,
      submenu: [
        { label: t.undo, role: 'undo' },
        { label: t.redo, role: 'redo' },
        { type: 'separator' },
        { label: t.cut, role: 'cut' },
        { label: t.copy, role: 'copy' },
        { label: t.paste, role: 'paste' },
        ...(isMac
          ? [
              { label: t.pasteAndMatchStyle, role: 'pasteAndMatchStyle' },
              { label: t.delete, role: 'delete' },
              { label: t.selectAll, role: 'selectAll' },
              { type: 'separator' },
              {
                label: t.speech,
                submenu: [
                  { label: t.startSpeaking, role: 'startSpeaking' },
                  { label: t.stopSpeaking, role: 'stopSpeaking' }
                ]
              }
            ]
          : [
              { label: t.delete, role: 'delete' },
              { type: 'separator' },
              { label: t.selectAll, role: 'selectAll' }
            ])
      ] as MenuItemConstructorOptions[]
    },
    {
      label: t.view,
      submenu: [
        { label: t.reload, role: 'reload' },
        { label: t.forceReload, role: 'forceReload' },
        { label: t.toggleDevTools, role: 'toggleDevTools' },
        { type: 'separator' },
        { label: t.resetZoom, role: 'resetZoom' },
        { label: t.zoomIn, role: 'zoomIn' },
        { label: t.zoomOut, role: 'zoomOut' },
        { type: 'separator' },
        { label: t.toggleFullscreen, role: 'togglefullscreen' }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: t.window,
      submenu: [
        { label: t.minimize, role: 'minimize' },
        { label: t.zoom, role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { label: t.front, role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [
              { label: t.close, role: 'close' }
            ])
      ] as MenuItemConstructorOptions[]
    },
    {
      label: t.help,
      role: 'help',
      submenu: [
        {
          label: t.learnMore,
          click: async () => {
            await shell.openExternal('https://studio.wansan.app')
          }
        }
      ] as MenuItemConstructorOptions[]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
