# Accessibility Guide

This document outlines the accessibility features implemented in the MCP Chat UI application to ensure compliance with WCAG 2.1 AA standards and provide an inclusive experience for all users.

## Overview

The MCP Chat UI is designed with accessibility as a core principle, implementing comprehensive features to support users with diverse needs and abilities. The application follows Web Content Accessibility Guidelines (WCAG) 2.1 AA standards and includes extensive keyboard navigation, screen reader support, and customizable accessibility preferences.

## Accessibility Features

### 1. Keyboard Navigation

#### Global Keyboard Shortcuts
- **Alt + M**: Skip to main content
- **Alt + N**: Skip to navigation
- **Alt + H**: Toggle high contrast mode
- **Alt + ?**: Show keyboard shortcuts help
- **Escape**: Close dialogs and modals

#### Chat Interface
- **Enter**: Send message
- **Shift + Enter**: New line in message input
- **Escape**: Clear message input
- **Tab**: Navigate through interactive elements
- **Arrow Keys**: Navigate through lists and menus

#### Focus Management
- Clear focus indicators on all interactive elements
- Logical tab order throughout the application
- Focus trapping in modal dialogs
- Automatic focus restoration when closing modals

### 2. Screen Reader Support

#### ARIA Labels and Descriptions
- Comprehensive ARIA labels on all interactive elements
- Descriptive text for complex UI components
- Live regions for dynamic content updates
- Proper heading hierarchy (h1-h6)

#### Semantic HTML
- Proper use of semantic HTML elements (`main`, `nav`, `section`, `article`)
- Form labels associated with their inputs
- Lists for grouped content
- Tables with proper headers

#### Screen Reader Announcements
- Loading state announcements
- Error and success message announcements
- Navigation change announcements
- Tool execution status updates

### 3. Visual Accessibility

#### High Contrast Mode
- Enhanced color contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text)
- Strong border outlines on interactive elements
- Clear visual distinction between different UI states
- System preference detection and manual toggle

#### Large Text Mode
- Scalable typography throughout the interface
- Proportional spacing adjustments
- Maintained layout integrity at larger text sizes
- User-controlled text size preferences

#### Focus Indicators
- Visible focus rings on all interactive elements
- High contrast focus indicators in high contrast mode
- Consistent focus styling across components
- Enhanced focus visibility option

### 4. Motion and Animation

#### Reduced Motion Support
- Respects system `prefers-reduced-motion` setting
- Manual toggle for reduced motion
- Minimal animations when reduced motion is enabled
- Smooth scrolling disabled in reduced motion mode

#### Animation Controls
- Configurable animation preferences
- Graceful degradation for users who prefer reduced motion
- Essential animations preserved for functionality

### 5. Form Accessibility

#### Input Validation
- Real-time validation feedback
- Clear error messages
- ARIA invalid attributes for failed validation
- Screen reader announcements for validation errors

#### Form Labels
- Explicit labels for all form inputs
- Helper text associated with inputs via `aria-describedby`
- Required field indicators
- Clear instructions and formatting requirements

### 6. Color and Contrast

#### Color Contrast Compliance
- WCAG AA compliant color contrast ratios
- High contrast mode for enhanced visibility
- Color is not the only means of conveying information
- Sufficient contrast in all UI states (hover, focus, active)

#### Color Blind Accessibility
- Information conveyed through multiple visual cues
- Pattern and texture used alongside color
- High contrast alternatives available

## Accessibility Configuration

### User Preferences

Users can customize accessibility settings through the Settings → Accessibility panel:

#### Visual Accessibility
- **High Contrast Mode**: Increases color contrast for better visibility
- **Large Text**: Increases text size throughout the interface
- **Enhanced Focus Indicators**: Shows clear focus indicators for keyboard navigation

#### Motion and Animation
- **Reduced Motion**: Minimizes animations and transitions

#### Interaction
- **Enhanced Keyboard Navigation**: Improves keyboard navigation with arrow keys and shortcuts
- **Screen Reader Announcements**: Announces important changes and updates to screen readers

### System Integration

The application automatically detects and respects system accessibility preferences:
- System high contrast settings
- System reduced motion preferences
- System font size preferences
- Browser accessibility settings

## Testing and Compliance

### Automated Testing
- Jest-axe integration for automated accessibility testing
- Continuous integration accessibility checks
- Component-level accessibility testing
- WCAG compliance validation

### Manual Testing
- Keyboard-only navigation testing
- Screen reader testing (NVDA, JAWS, VoiceOver)
- High contrast mode testing
- Mobile accessibility testing

### Compliance Standards
- WCAG 2.1 AA compliance
- Section 508 compliance
- EN 301 549 compliance
- Platform-specific accessibility guidelines (iOS, Android, Windows, macOS)

## Implementation Details

### Technical Architecture

#### Accessibility Hooks
- `useAccessibility`: Core accessibility preferences and utilities
- `useEnhancedAccessibility`: Advanced accessibility features and shortcuts
- `useModalAccessibility`: Modal-specific accessibility management
- `useFormAccessibility`: Form validation and accessibility utilities

#### CSS Classes
- `.sr-only`: Screen reader only content
- `.high-contrast`: High contrast mode styles
- `.reduce-motion`: Reduced motion styles
- `.large-text`: Large text mode styles
- `.focus-visible`: Enhanced focus indicators

#### ARIA Patterns
- Dialog/Modal pattern with focus trapping
- Listbox pattern for selectable lists
- Tab panel pattern for tabbed interfaces
- Live region pattern for dynamic updates

### Component Accessibility

#### Button Component
- Proper ARIA attributes (`aria-pressed`, `aria-expanded`, `aria-describedby`)
- Loading state indicators
- Keyboard shortcut display
- Tooltip support

#### Input Component
- Associated labels and descriptions
- Validation state indicators
- Required field indicators
- Error message association

#### Modal Component
- Focus trapping and restoration
- Escape key handling
- Backdrop click handling
- ARIA dialog pattern

#### Chat Components
- Message list with proper ARIA live regions
- Tool confirmation dialogs with clear warnings
- Loading state announcements
- Error handling with screen reader support

## Best Practices

### Development Guidelines

1. **Always provide text alternatives** for non-text content
2. **Use semantic HTML** elements appropriately
3. **Ensure keyboard accessibility** for all interactive elements
4. **Provide clear focus indicators** for keyboard users
5. **Use ARIA attributes** to enhance semantic meaning
6. **Test with screen readers** during development
7. **Respect user preferences** for motion and contrast
8. **Provide multiple ways** to access functionality

### Content Guidelines

1. **Write clear, concise labels** for all interactive elements
2. **Provide helpful error messages** with guidance for resolution
3. **Use descriptive link text** that makes sense out of context
4. **Structure content** with proper headings and landmarks
5. **Ensure instructions** are clear and complete
6. **Avoid relying solely on color** to convey information

## Browser and Assistive Technology Support

### Supported Screen Readers
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)
- Orca (Linux)

### Supported Browsers
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Mobile Accessibility
- Touch target sizes (minimum 44px)
- Swipe gesture support
- Voice control compatibility
- Screen reader navigation

## Reporting Accessibility Issues

If you encounter accessibility barriers while using the MCP Chat UI, please report them by:

1. Creating an issue in the project repository
2. Including details about:
   - The accessibility barrier encountered
   - Your assistive technology setup
   - Steps to reproduce the issue
   - Expected vs. actual behavior

We are committed to addressing accessibility issues promptly and maintaining an inclusive experience for all users.

## Resources and References

- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

## Continuous Improvement

Accessibility is an ongoing commitment. We regularly:

- Review and update accessibility features
- Test with real users who rely on assistive technologies
- Stay current with accessibility standards and best practices
- Incorporate user feedback into accessibility improvements
- Conduct accessibility audits and assessments

For questions about accessibility features or to provide feedback, please reach out through our project channels.