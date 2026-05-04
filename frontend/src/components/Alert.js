import { useEffect, useCallback } from 'react';
import './Alert.css';

export default function Alert({ type, message, onDismiss }) {
  const dismiss = useCallback(() => {
    if (onDismiss) onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(dismiss, 4000);
    return () => clearTimeout(t);
  }, [message, dismiss]);

  if (!message) return null;

  return (
    <div className={`alert-banner alert-banner-${type}`} role="alert">
      <span className="alert-banner-icon">{type === 'success' ? '✓' : '✕'}</span>
      <span className="alert-banner-message">{message}</span>
      <button className="alert-banner-dismiss" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
