import { useEffect, useState } from 'react';

import type { NodeMetrics } from './types';

function randomMetrics(): NodeMetrics {
  return {
    cpu: Math.floor(Math.random() * 60) + 15,
    mem: Math.floor(Math.random() * 60) + 20,
    disk: Math.floor(Math.random() * 50) + 10,
    proc: Math.floor(Math.random() * 150) + 50,
  };
}

export function useNodeMetrics(ip: string): NodeMetrics {
  const [metrics, setMetrics] = useState<NodeMetrics>(() => randomMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(randomMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, [ip]);

  return metrics;
}
