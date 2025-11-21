import { useEffect, useState } from 'react';

export function useKeyboardAvoidance() {
  const [isIOS] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  });
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!isIOS) {
      return;
    }

    const visualViewport = window.visualViewport;
    if (!visualViewport) {
      return;
    }

    const handleResize = () => {
      const viewportHeight = visualViewport.height;
      document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);

      const newKeyboardHeight = window.innerHeight - viewportHeight;

      if (newKeyboardHeight > 100) {
        setKeyboardHeight(newKeyboardHeight);
      } else {
        setKeyboardHeight(0);
      }
    };

    visualViewport.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      visualViewport.removeEventListener('resize', handleResize);
    };
  }, [isIOS]);

  return {
    isIOS,
    keyboardHeight,
  };
}
