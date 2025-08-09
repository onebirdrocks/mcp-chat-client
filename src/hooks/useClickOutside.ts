import { useEffect, type RefObject } from 'react';

/**
 * Hook that handles clicks outside of the specified element
 * @param ref - React ref object pointing to the element
 * @param handler - Function to call when clicking outside
 * @param enabled - Whether the hook should be active
 * @param excludeSelectors - CSS selectors for elements that should not trigger the handler
 */
export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled: boolean = true,
  excludeSelectors: string[] = []
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Check if the click is outside the ref element
      if (ref.current && !ref.current.contains(event.target as Node)) {
        // Check if the click is on any excluded elements
        const target = event.target as Element;
        const isExcluded = excludeSelectors.some(selector => {
          try {
            return target.closest(selector);
          } catch (e) {
            // Invalid selector, ignore
            return false;
          }
        });

        if (!isExcluded) {
          handler();
        }
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref, handler, enabled, excludeSelectors]);
};

export default useClickOutside;