# UI Components Library

This directory contains reusable UI components built with React, TypeScript, and Tailwind CSS. All components follow accessibility best practices and include proper TypeScript interfaces.

## Components

### Button
A versatile button component with multiple variants, sizes, and states.

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean - Shows loading spinner
- `leftIcon`, `rightIcon`: React.ReactNode - Icons to display
- `fullWidth`: boolean - Makes button full width
- `disabled`: boolean - Disables the button

**Example:**
```tsx
<Button variant="primary" size="md" loading={false}>
  Click me
</Button>
```

### Input
A form input component with label, error states, and helper text.

**Props:**
- `label`: string - Input label
- `error`: string - Error message to display
- `helperText`: string - Helper text below input
- `leftIcon`, `rightIcon`: React.ReactNode - Icons
- `loading`: boolean - Shows loading state
- `fullWidth`: boolean - Makes input full width
- `variant`: 'default' | 'filled'

**Example:**
```tsx
<Input
  label="Email"
  placeholder="Enter your email"
  error={emailError}
  helperText="We'll never share your email"
/>
```

### Textarea
A textarea component with auto-resize capability and form integration.

**Props:**
- `label`: string - Textarea label
- `error`: string - Error message
- `helperText`: string - Helper text
- `autoResize`: boolean - Auto-resize based on content
- `minRows`, `maxRows`: number - Row constraints
- `loading`: boolean - Loading state
- `fullWidth`: boolean - Full width
- `variant`: 'default' | 'filled'

**Example:**
```tsx
<Textarea
  label="Message"
  autoResize
  minRows={3}
  maxRows={10}
  placeholder="Enter your message"
/>
```

### Select
A select dropdown component with custom styling and options.

**Props:**
- `label`: string - Select label
- `error`: string - Error message
- `helperText`: string - Helper text
- `options`: SelectOption[] - Array of options
- `placeholder`: string - Placeholder text
- `loading`: boolean - Loading state
- `fullWidth`: boolean - Full width
- `variant`: 'default' | 'filled'

**Example:**
```tsx
<Select
  label="Country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' }
  ]}
  placeholder="Select a country"
/>
```

### Modal
A modal dialog component with focus management and accessibility features.

**Props:**
- `isOpen`: boolean - Controls modal visibility
- `onClose`: () => void - Close handler
- `title`: string - Modal title
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `closeOnOverlayClick`: boolean - Close when clicking overlay
- `closeOnEscape`: boolean - Close on Escape key
- `showCloseButton`: boolean - Show close button

**Example:**
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to continue?</p>
</Modal>
```

### Card
A card container component with header, content, and footer sections.

**Components:**
- `Card` - Main container
- `CardHeader` - Header section
- `CardTitle` - Title component
- `CardContent` - Content area
- `CardFooter` - Footer section

**Example:**
```tsx
<Card variant="outlined" padding="lg">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Badge
A badge component for displaying status, counts, or labels.

**Props:**
- `variant`: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
- `size`: 'sm' | 'md' | 'lg'

**Example:**
```tsx
<Badge variant="success" size="sm">
  Active
</Badge>
```

### Spinner & Loading
Loading indicators with different sizes and colors.

**Spinner Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `color`: 'primary' | 'secondary' | 'white' | 'gray'

**Loading Props:**
- `text`: string - Loading text
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `color`: 'primary' | 'secondary' | 'white' | 'gray'

**Example:**
```tsx
<Spinner size="md" color="primary" />
<Loading text="Loading data..." size="sm" />
```

### Alert
An alert component for displaying important messages.

**Props:**
- `variant`: 'info' | 'success' | 'warning' | 'error'
- `title`: string - Alert title
- `dismissible`: boolean - Can be dismissed
- `onDismiss`: () => void - Dismiss handler

**Example:**
```tsx
<Alert
  variant="warning"
  title="Warning"
  dismissible
  onDismiss={() => setShowAlert(false)}
>
  This action cannot be undone.
</Alert>
```

### Tooltip
A tooltip component that displays on hover or focus.

**Props:**
- `content`: React.ReactNode - Tooltip content
- `placement`: 'top' | 'bottom' | 'left' | 'right'
- `delay`: number - Show delay in milliseconds
- `disabled`: boolean - Disable tooltip

**Example:**
```tsx
<Tooltip content="This is helpful information" placement="top">
  <Button>Hover me</Button>
</Tooltip>
```

## Accessibility Features

All components include:
- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- High contrast support
- Semantic HTML structure

## Dark Mode Support

All components automatically support dark mode through Tailwind CSS dark mode classes. The theme switches based on the user's system preference or manual toggle.

## Customization

Components can be customized by:
- Passing custom `className` props
- Using Tailwind CSS utility classes
- Extending component variants
- Overriding default styles

## Usage

Import components from the UI library:

```tsx
import { Button, Input, Modal, Card } from '@/components/ui';
```

Or import specific components:

```tsx
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui';
```