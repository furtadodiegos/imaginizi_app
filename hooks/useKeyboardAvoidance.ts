import { useEffect } from 'react';

export function useKeyboardAvoidance() {
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (!isIOS) {
      return;
    }

    const visualViewport = window.visualViewport;
    if (!visualViewport) {
      return;
    }

    const handleResize = () => {
      const viewportHeight = visualViewport.height;
      // Set the CSS variable to the viewport height
      document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
    };

    visualViewport.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => {
      visualViewport.removeEventListener('resize', handleResize);
    };
  }, []);
}
