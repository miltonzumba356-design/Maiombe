export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: Toast[]) => void;

let _toasts: Toast[] = [];
const _listeners = new Set<Listener>();

function _notify() {
  _listeners.forEach(l => l([..._toasts]));
}

export const toastStore = {
  subscribe(l: Listener) {
    _listeners.add(l);
    return () => _listeners.delete(l);
  },

  push(message: string, type: ToastType = 'info', duration = 5000) {
    const id = Math.random().toString(36).slice(2);
    _toasts = [..._toasts, { id, message, type }];
    _notify();
    setTimeout(() => {
      _toasts = _toasts.filter(t => t.id !== id);
      _notify();
    }, duration);
  },

  dismiss(id: string) {
    _toasts = _toasts.filter(t => t.id !== id);
    _notify();
  },

  success(m: string) { this.push(m, 'success'); },
  error(m: string)   { this.push(m, 'error', 7000); },
  info(m: string)    { this.push(m, 'info'); },
  warning(m: string) { this.push(m, 'warning'); },
};
