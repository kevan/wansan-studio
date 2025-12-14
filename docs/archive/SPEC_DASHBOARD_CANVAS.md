
### 1. **Dashboard 画布化设计**

#### 1.1 **可调整的显示比例**

* **目标**：允许用户根据实际需求调整Dashboard的显示比例。比如在打印布局时，Dashboard应自动调整为A4纸尺寸；在大屏展示时，Dashboard应尽可能充满屏幕。
* **实现需求**：

    * **缩放比例**：支持用户调整Dashboard的缩放比例（例如，100%、75%、50%），以适应不同输出需求。
    * **全屏模式**：提供全屏切换功能，使Dashboard能够充满屏幕并适应大屏显示。
    * **自适应布局**：根据报告类型（如A4纸、大屏等），自动调整卡片和内容的布局和比例。

#### 1.2 **布局网格与比例**

* **目标**：使用网格系统（如CSS Grid或`react-grid-layout`）来实现画布布局，确保每个卡片在不同显示模式下都能自适应调整。
* **调整逻辑**：

    * **打印布局（A4）**：卡片的布局应自动适应A4纸尺寸，调整为单列或双列模式，并且所有内容应显示在可打印区域内。
    * **大屏布局（16:9）**：在大屏模式下，卡片的宽度和高度应根据屏幕的比例动态调整，最大化空间利用，保持清晰可读。
    * **PPT布局**：每个幻灯片应包含 1-2 个卡片，并且不超过幻灯片的尺寸。

#### 1.3 **实现方案**

通过在Dashboard组件中使用可配置的网格系统和显示比例来实现：

```tsx
// 动态调整 Dashboard 容器尺寸
const getCanvasDimensions = (reportType: string) => {
  switch (reportType) {
    case 'print':
      return { width: '210mm', height: '297mm' }; // A4纸大小
    case 'large-screen':
      return { width: '100vw', height: '56.25vw' }; // 16:9
    case 'ppt':
      return { width: '1920px', height: '1080px' }; // PPT尺寸
    case 'email':
      return { width: '800px', height: 'auto' }; // 邮件宽度
    default:
      return { width: '100%', height: 'auto' }; // 默认宽度
  }
};

// 获取当前缩放比例
const getScale = (scale: number) => {
  return {
    transform: `scale(${scale})`,
    transformOrigin: 'top left', // 保证缩放时从左上角开始
  };
};

// 使用动态尺寸和缩放比例来调整布局
const Dashboard = ({ reportType, scale }) => {
  const dimensions = getCanvasDimensions(reportType);
  const scaleStyle = getScale(scale);

  return (
    <div
      className="dashboard-container"
      style={{ 
        ...dimensions, 
        ...scaleStyle 
      }}
    >
      {/* 渲染报告卡片 */}
    </div>
  );
};
```

---

### 2. **功能要求**

1. **动态缩放**：

    * 用户能够选择不同的缩放比例（例如：100%、75%、50%）来查看不同尺寸的报告。
    * 在“打印版”报告时，自动缩放为A4纸尺寸，保持报告内容不被截断。

2. **全屏显示**：

    * 提供全屏模式，用户可以将Dashboard放大到充满整个屏幕，适应大屏显示。

3. **智能布局**：

    * 根据报告类型（A4纸、大屏、PPT等），自动调整卡片的排列、大小和显示比例，确保报告内容适合对应的页面或屏幕尺寸。

4. **卡片自动调整**：

    * 根据不同的报告类型，自动调整每个卡片的大小和排列方式。例如，打印版时可能需要单列布局，大屏显示时则使用多列布局。
