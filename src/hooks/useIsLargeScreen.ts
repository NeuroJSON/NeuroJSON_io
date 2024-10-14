import { useEffect, useState } from 'react';

const useIsLargeScreen = () => {
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(
        window.innerWidth >= parseInt(process.env.MOBILE_RESOLUTION || '600')
      );
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isLargeScreen;
};

export default useIsLargeScreen;
