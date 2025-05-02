import { useEffect, useState } from 'react';

/**
 * Hook to determine if the component is mounted.
 * Helpful for preventing state updates after component unmount.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted;
}

export default useMounted;
