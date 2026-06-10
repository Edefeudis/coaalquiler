'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook que detecta cuando un elemento entra en el viewport
 * y aplica una animación. Ideal para animaciones al hacer scroll.
 */
export function useAnimatedVisibility(options?: {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}) {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
  } = options || {};

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

/**
 * Hook para animar la entrada de múltiples elementos en lista (stagger).
 * Devuelve una función que asigna delay a cada índice.
 */
export function useStaggerAnimation(count: number, baseDelay = 0.05) {
  const { ref, isVisible } = useAnimatedVisibility({ threshold: 0.05 });

  const getDelay = useCallback(
    (index: number) => `${index * baseDelay}s`,
    [baseDelay]
  );

  return { ref, isVisible, getDelay };
}