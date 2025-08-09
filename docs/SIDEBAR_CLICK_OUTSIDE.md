# Sidebar 点击外部关闭功能

## 概述

实现了当用户点击sidebar以外的区域时，sidebar能够自动折叠的功能。这提供了更好的用户体验，特别是在移动设备上。

## 功能特性

### 1. 自动关闭
- 当用户点击sidebar外的任何区域时，sidebar会自动关闭
- 支持鼠标点击和触摸事件
- 在桌面和移动设备上都能正常工作

### 2. 智能排除
- 菜单按钮（打开sidebar的按钮）不会触发关闭
- 可以通过CSS选择器排除特定元素
- 支持多个排除条件

### 3. 响应式设计
- 在大屏幕上，sidebar默认显示但仍可通过点击外部关闭
- 在小屏幕上，sidebar默认隐藏，需要手动打开

## 技术实现

### useClickOutside Hook

创建了一个可复用的自定义Hook：

```typescript
export const useClickOutside = (
  ref: RefObject<HTMLElement>,
  handler: () => void,
  enabled: boolean = true,
  excludeSelectors: string[] = []
) => {
  // 实现逻辑
};
```

**参数说明：**
- `ref`: 指向需要监听的元素的React ref
- `handler`: 点击外部时执行的回调函数
- `enabled`: 是否启用功能
- `excludeSelectors`: 需要排除的元素的CSS选择器数组

### 在AppLayout中的使用

```typescript
// 使用useClickOutside hook
useClickOutside(
  sidebarRef,
  () => setSidebarOpen(false),
  sidebarOpen,
  [
    '[aria-label*="Open menu"]',
    '[aria-label*="打开菜单"]',
    '[data-sidebar-trigger]'
  ]
);
```

## 排除元素

以下元素被排除在点击外部关闭功能之外：

1. **菜单按钮**: 带有`data-sidebar-trigger`属性的元素
2. **国际化菜单按钮**: aria-label包含"Open menu"或"打开菜单"的元素
3. **自定义排除元素**: 带有`data-exclude-click-outside`属性的元素

## 使用示例

### 基本用法

```typescript
import { useClickOutside } from '../hooks/useClickOutside';

const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useClickOutside(elementRef, () => setIsOpen(false), isOpen);

  return (
    <div ref={elementRef}>
      {/* 内容 */}
    </div>
  );
};
```

### 带排除元素的用法

```typescript
useClickOutside(
  elementRef,
  () => setIsOpen(false),
  isOpen,
  ['[data-trigger]', '.exclude-class']
);
```

## 测试

### 单元测试
- 测试事件监听器的添加和移除
- 测试点击内部和外部的行为
- 测试排除元素的功能
- 测试启用/禁用状态

### 集成测试
创建了`SidebarClickOutsideDemo`组件用于手动测试：
- 测试移动端和桌面端的行为
- 测试排除元素的功能
- 测试不同屏幕尺寸下的响应

## 无障碍性

- 保持了键盘导航的完整性
- 不影响屏幕阅读器的使用
- 支持触摸设备
- 提供了适当的ARIA标签

## 浏览器兼容性

- 支持所有现代浏览器
- 支持移动设备的触摸事件
- 兼容不同的屏幕尺寸

## 性能考虑

- 只在需要时添加事件监听器
- 组件卸载时自动清理事件监听器
- 使用防抖机制避免频繁触发
- 最小化DOM查询

## 未来改进

1. **动画优化**: 添加更流畅的关闭动画
2. **手势支持**: 支持滑动手势关闭
3. **配置选项**: 提供更多自定义配置选项
4. **性能优化**: 进一步优化事件处理性能

## 相关文件

- `src/hooks/useClickOutside.ts` - 核心Hook实现
- `src/hooks/__tests__/useClickOutside.test.ts` - 单元测试
- `src/components/AppLayout.tsx` - 主要使用场景
- `src/components/SidebarClickOutsideDemo.tsx` - 演示组件
- `src/hooks/index.ts` - Hook导出