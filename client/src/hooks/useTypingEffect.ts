import { useState, useEffect, useRef } from 'react';

/**
 * Hook para efecto de escritura en tiempo real (como ChatGPT)
 * @param text - Texto completo a mostrar
 * @param speed - Velocidad en ms por carácter (default: 20ms)
 * @param enabled - Si el efecto está habilitado (default: true)
 */
export function useTypingEffect(text: string, speed: number = 20, enabled: boolean = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    // Si el efecto está deshabilitado, mostrar todo de una vez
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // Reset
    setDisplayedText('');
    indexRef.current = 0;
    setIsTyping(true);

    // Si el texto está vacío, terminar
    if (!text) {
      setIsTyping(false);
      return;
    }

    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, enabled]);

  return { displayedText, isTyping };
}
