import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toastStore } from './toast';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: subscribe and collect all emissions
function collect(): { toasts: ReturnType<typeof toastStore['subscribe']> extends (t: infer T) => void ? T : never[][], unsub: () => void } {
  const captured: unknown[][] = [];
  const unsub = toastStore.subscribe((t) => captured.push([...t]));
  return { toasts: captured as any, unsub };
}

describe('toastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('subscribe()', () => {
    it('listener é chamado ao push', () => {
      const listener = vi.fn();
      const unsub = toastStore.subscribe(listener);
      toastStore.push('Olá', 'info', 1000);
      expect(listener).toHaveBeenCalled();
      unsub();
    });

    it('unsub remove o listener', () => {
      const listener = vi.fn();
      const unsub = toastStore.subscribe(listener);
      unsub();
      listener.mockClear();
      toastStore.push('Teste', 'info', 1000);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('push()', () => {
    it('adiciona toast com a mensagem e tipo correcto', () => {
      const { toasts, unsub } = collect();
      toastStore.push('Salvo!', 'success', 1000);
      const last = toasts[toasts.length - 1] as any[];
      const toast = last[last.length - 1];
      expect(toast.message).toBe('Salvo!');
      expect(toast.type).toBe('success');
      unsub();
    });

    it('cada toast tem um id único', () => {
      const capturedIds: string[] = [];
      const unsub = toastStore.subscribe((t) => {
        // Capture only new IDs added by our pushes
        t.forEach((x) => { if (!capturedIds.includes(x.id)) capturedIds.push(x.id); });
      });
      toastStore.push('Unique A', 'info', 1000);
      toastStore.push('Unique B', 'info', 1000);
      // The two we just added should have different IDs
      const ourIds = capturedIds.slice(-2);
      expect(new Set(ourIds).size).toBe(2);
      unsub();
    });

    it('toast desaparece após a duração', () => {
      let id = '';
      const unsub = toastStore.subscribe((t) => {
        const mine = t.find((x) => x.message === 'TemporárioDurationTest');
        if (mine) id = mine.id;
      });
      toastStore.push('TemporárioDurationTest', 'warning', 1000);
      expect(id).toBeTruthy();
      vi.advanceTimersByTime(1001);
      let found = false;
      const check = toastStore.subscribe((t) => { found = t.some((x) => x.id === id); });
      check();
      expect(found).toBe(false);
      unsub();
    });

    it('tipo por defeito é "info"', () => {
      const received: any[] = [];
      const unsub = toastStore.subscribe((t) => received.push(...t));
      toastStore.push('Defeito');
      const last = received[received.length - 1];
      expect(last?.type ?? 'info').toBe('info');
      unsub();
    });
  });

  describe('dismiss()', () => {
    it('remove o toast pelo id', () => {
      let current: any[] = [];
      const unsub = toastStore.subscribe((t) => { current = t; });
      toastStore.push('Para remover', 'error', 60000);
      const id = current[current.length - 1]?.id;
      expect(id).toBeDefined();
      toastStore.dismiss(id);
      expect(current.find((t) => t.id === id)).toBeUndefined();
      unsub();
    });
  });

  describe('métodos de atalho', () => {
    it('success() cria toast do tipo success', () => {
      let last: any;
      const unsub = toastStore.subscribe((t) => { last = t[t.length - 1]; });
      toastStore.success('Guardado!');
      expect(last?.type).toBe('success');
      unsub();
    });

    it('error() cria toast do tipo error', () => {
      let last: any;
      const unsub = toastStore.subscribe((t) => { last = t[t.length - 1]; });
      toastStore.error('Algo correu mal');
      expect(last?.type).toBe('error');
      unsub();
    });

    it('warning() cria toast do tipo warning', () => {
      let last: any;
      const unsub = toastStore.subscribe((t) => { last = t[t.length - 1]; });
      toastStore.warning('Atenção');
      expect(last?.type).toBe('warning');
      unsub();
    });

    it('info() cria toast do tipo info', () => {
      let last: any;
      const unsub = toastStore.subscribe((t) => { last = t[t.length - 1]; });
      toastStore.info('Informação');
      expect(last?.type).toBe('info');
      unsub();
    });
  });
});
