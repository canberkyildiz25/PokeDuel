'use client';

import { useEffect } from 'react';
import { wake } from '@/lib/store';

/** Runs once per visit: reads what the browser has kept of the last one. */
export function Start() {
  useEffect(() => {
    void wake();
  }, []);
  return null;
}
