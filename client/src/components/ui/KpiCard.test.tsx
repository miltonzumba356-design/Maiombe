import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KpiCard from './KpiCard';

// ─────────────────────────────────────────────────────────────────────────────
describe('KpiCard', () => {

  describe('Especificação: conteúdo básico', () => {
    it('deve mostrar o label fornecido', () => {
      render(<KpiCard label="Total de Contratos" value="42" />);
      expect(screen.getByText('Total de Contratos')).toBeInTheDocument();
    });

    it('deve mostrar o valor fornecido', () => {
      render(<KpiCard label="L" value="1.250.000 Kz" />);
      expect(screen.getByText('1.250.000 Kz')).toBeInTheDocument();
    });

    it('deve mostrar a unidade quando fornecida', () => {
      render(<KpiCard label="Taxa" value="12.5" unit="%" />);
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('não deve mostrar unidade quando omitida', () => {
      render(<KpiCard label="L" value="99" />);
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });

  describe('Especificação: delta (variação)', () => {
    it('deve mostrar o texto delta quando fornecido', () => {
      render(<KpiCard label="L" value="0" delta="Após todos os custos" />);
      expect(screen.getByText('Após todos os custos')).toBeInTheDocument();
    });

    it('não deve renderizar o delta quando omitido', () => {
      render(<KpiCard label="L" value="0" />);
      expect(screen.queryByText('Após todos os custos')).not.toBeInTheDocument();
    });
  });

  describe('Especificação: sub-texto', () => {
    it('deve mostrar sub quando fornecido', () => {
      render(<KpiCard label="L" value="0" sub="Mín: 5%" />);
      expect(screen.getByText('Mín: 5%')).toBeInTheDocument();
    });

    it('não renderiza sub quando omitido', () => {
      const { container } = render(<KpiCard label="L" value="0" />);
      // Should only have 1 extra div (for label + value wrapper), no sub div
      expect(screen.queryByText('Mín:')).not.toBeInTheDocument();
    });
  });

  describe('Especificação: variantes de estilo', () => {
    it('aplica classe kpi-gold por defeito', () => {
      const { container } = render(<KpiCard label="L" value="0" />);
      expect(container.firstChild).toHaveClass('kpi-gold');
    });

    it('aplica classe kpi-cr quando variant="cr"', () => {
      const { container } = render(<KpiCard label="L" value="0" variant="cr" />);
      expect(container.firstChild).toHaveClass('kpi-cr');
    });

    it('aplica classe kpi-em quando variant="em"', () => {
      const { container } = render(<KpiCard label="L" value="0" variant="em" />);
      expect(container.firstChild).toHaveClass('kpi-em');
    });

    it('aplica className extra quando fornecido', () => {
      const { container } = render(<KpiCard label="L" value="0" className="my-custom" />);
      expect(container.firstChild).toHaveClass('my-custom');
    });
  });

  describe('Especificação: valores edge case', () => {
    it('aceita valor numérico 0', () => {
      render(<KpiCard label="Resultado" value={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('aceita valor "—" (dado indisponível)', () => {
      render(<KpiCard label="Taxa" value="—" />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('aceita valor string longo sem quebrar', () => {
      const long = '1.234.567.890 Kz';
      render(<KpiCard label="L" value={long} />);
      expect(screen.getByText(long)).toBeInTheDocument();
    });
  });
});
