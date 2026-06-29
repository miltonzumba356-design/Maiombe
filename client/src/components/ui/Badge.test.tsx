import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, RepaymentTag, ProgressBar } from './Badge';

// ─────────────────────────────────────────────────────────────────────────────
describe('Badge', () => {

  describe('Especificação: tipo status (por defeito)', () => {
    it('exibe o label traduzido para "recebidos"', () => {
      render(<Badge value="recebidos" />);
      expect(screen.getByText('Recebidos')).toBeInTheDocument();
    });

    it('exibe o label traduzido para "em_vigor"', () => {
      render(<Badge value="em_vigor" />);
      expect(screen.getByText('Em Vigor')).toBeInTheDocument();
    });

    it('exibe o label traduzido para "vencido"', () => {
      render(<Badge value="vencido" />);
      expect(screen.getByText('Vencido')).toBeInTheDocument();
    });

    it('aplica a classe CSS badge-low para "recebidos"', () => {
      const { container } = render(<Badge value="recebidos" />);
      expect(container.firstChild).toHaveClass('badge-low');
    });

    it('aplica a classe CSS badge-crit para "vencido"', () => {
      const { container } = render(<Badge value="vencido" />);
      expect(container.firstChild).toHaveClass('badge-crit');
    });

    it('sempre tem a classe base "badge"', () => {
      const { container } = render(<Badge value="elaboracao" />);
      expect(container.firstChild).toHaveClass('badge');
    });
  });

  describe('Especificação: tipo risk', () => {
    it('exibe "Baixo" para value="baixo"', () => {
      render(<Badge value="baixo" type="risk" />);
      expect(screen.getByText('Baixo')).toBeInTheDocument();
    });

    it('exibe "Médio" para value="medio"', () => {
      render(<Badge value="medio" type="risk" />);
      expect(screen.getByText('Médio')).toBeInTheDocument();
    });

    it('exibe "Alto" para value="alto"', () => {
      render(<Badge value="alto" type="risk" />);
      expect(screen.getByText('Alto')).toBeInTheDocument();
    });

    it('exibe "Crítico" para value="critico"', () => {
      render(<Badge value="critico" type="risk" />);
      expect(screen.getByText('Crítico')).toBeInTheDocument();
    });

    it('aplica badge-low para risco baixo', () => {
      const { container } = render(<Badge value="baixo" type="risk" />);
      expect(container.firstChild).toHaveClass('badge-low');
    });

    it('aplica badge-crit para risco crítico', () => {
      const { container } = render(<Badge value="critico" type="risk" />);
      expect(container.firstChild).toHaveClass('badge-crit');
    });
  });

  describe('Especificação: tipo custom', () => {
    it('usa customClass quando type="custom"', () => {
      const { container } = render(<Badge value="Especial" type="custom" customClass="badge-custom" />);
      expect(container.firstChild).toHaveClass('badge-custom');
    });

    it('exibe o valor bruto quando type="custom"', () => {
      render(<Badge value="StatusXYZ" type="custom" />);
      expect(screen.getByText('StatusXYZ')).toBeInTheDocument();
    });
  });

  describe('Especificação: className extra', () => {
    it('adiciona className ao span', () => {
      const { container } = render(<Badge value="activa" className="ml-2" />);
      expect(container.firstChild).toHaveClass('ml-2');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RepaymentTag', () => {
  it('exibe "OT+Cash" para métodos que incluem OT e numerario', () => {
    render(<RepaymentTag methods={JSON.stringify(['ot', 'numerario'])} />);
    expect(screen.getByText('OT+Cash')).toBeInTheDocument();
  });

  it('exibe "OT 5a" para métodos apenas OT', () => {
    render(<RepaymentTag methods={JSON.stringify(['ot'])} />);
    expect(screen.getByText('OT 5a')).toBeInTheDocument();
  });

  it('exibe "BT 91d" para métodos BT', () => {
    render(<RepaymentTag methods={JSON.stringify(['bt'])} />);
    expect(screen.getByText('BT 91d')).toBeInTheDocument();
  });

  it('exibe "Cash" para outros métodos', () => {
    render(<RepaymentTag methods={JSON.stringify(['numerario'])} />);
    expect(screen.getByText('Cash')).toBeInTheDocument();
  });

  it('não lança erro para JSON inválido', () => {
    expect(() => render(<RepaymentTag methods="not-json" />)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ProgressBar', () => {
  it('renderiza sem lançar erro', () => {
    expect(() => render(<ProgressBar value={50} />)).not.toThrow();
  });

  it('limita a largura a 100% para valores > 100', () => {
    const { container } = render(<ProgressBar value={150} />);
    const fill = container.querySelector('.progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('aplica cor personalizada quando fornecida', () => {
    const { container } = render(<ProgressBar value={30} color="#FF0000" />);
    const fill = container.querySelector('.progress-fill') as HTMLElement;
    expect(fill.style.background).toBe('rgb(255, 0, 0)');
  });

  it('zero produz fill com 0% width', () => {
    const { container } = render(<ProgressBar value={0} />);
    const fill = container.querySelector('.progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });
});
