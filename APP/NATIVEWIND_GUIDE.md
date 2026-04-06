# NativeWind Setup Guide

## ✅ NativeWind is Already Configured!

All your screens are already using NativeWind for styling. Here's what was set up:

### Configuration Files Created/Updated:

1. **metro.config.js** - NativeWind Metro configuration
2. **babel.config.js** - Babel preset for NativeWind
3. **tailwind.config.js** - Extended with custom colors
4. **global.css** - Tailwind directives
5. **nativewind-env.d.ts** - TypeScript support

---

## 🎨 How NativeWind Works in Your App

### Current Implementation:

Your app uses a **hybrid approach** that combines:

1. **NativeWind className** - For static styles
2. **Inline style prop** - For dynamic theme colors (dark/light mode)

### Example from LoginScreen.js:

```jsx
// ✅ NativeWind for static styles
<View className="flex-1 px-6 justify-center items-center">

// ✅ Inline style for dynamic theme colors
<View style={{ backgroundColor: C.surface }}>
```

**Why?** Because your app has dark/light theme toggle, colors change dynamically based on `useTheme()` context. Tailwind classes are static and can't respond to runtime theme changes.

---

## 📝 How to Use NativeWind

### Basic Usage:

```jsx
// ✅ Static styles - Use NativeWind
<View className="flex-1 bg-white p-4 rounded-xl">
  <Text className="text-lg font-bold text-gray-900">Hello</Text>
</View>

// ✅ Dynamic theme colors - Use inline styles
<View 
  className="flex-1 p-4 rounded-xl"
  style={{ backgroundColor: C.surface }}
>
  <Text 
    className="text-lg font-bold"
    style={{ color: C.text }}
  >
    Hello
  </Text>
</View>
```

### Available Custom Colors (from tailwind.config.js):

```javascript
// Brand Colors
accent: '#6366F1'
primary: '#6366F1'
secondary: '#8B5CF6'
success: '#10B981'
warning: '#F59E0B'
danger: '#EF4444'
info: '#3B82F6'

// Dark Theme
'dark-bg': '#0A0F1E'
'dark-surface': '#111827'

// Light Theme
'light-bg': '#F8FAFC'
'light-surface': '#FFFFFF'
```

### Common NativeWind Classes Used:

#### Layout:
- `flex-1` - Fill available space
- `flex-row` - Horizontal layout
- `items-center` - Center items
- `justify-center` - Justify center
- `self-end` - Align self end

#### Spacing:
- `p-4`, `px-6`, `py-3` - Padding
- `m-4`, `mx-6`, `my-3` - Margin
- `mb-4`, `mt-2` - Margin bottom/top

#### Sizing:
- `w-full`, `w-10`, `w-20` - Width
- `h-10`, `h-20`, `h-14` - Height

#### Styling:
- `rounded-xl`, `rounded-2xl`, `rounded-full` - Border radius
- `bg-white/15` - Background with opacity
- `border border-white/20` - Border with opacity
- `shadow-2xl` - Shadow

#### Text:
- `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl` - Font size
- `font-bold`, `font-semibold` - Font weight
- `text-center` - Text alignment

---

## 🔄 When to Use What?

| Scenario | Use | Example |
|----------|-----|---------|
| Static colors | NativeWind | `className="bg-white"` |
| Theme-dependent colors | Inline style | `style={{ backgroundColor: C.surface }}` |
| Static spacing | NativeWind | `className="p-4"` |
| Static layout | NativeWind | `className="flex-row items-center"` |
| Dynamic values | Inline style | `style={{ width: dynamicWidth }}` |

---

## 🚀 Restart Server

After making changes to NativeWind config:

```bash
npx expo start --clear
```

The `--clear` flag clears the cache to apply configuration changes.

---

## 📚 Resources

- [NativeWind Docs](https://www.nativewind.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [NativeWind GitHub](https://github.com/marklawlor/nativewind)
