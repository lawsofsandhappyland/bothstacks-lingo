import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PracticeView from './PracticeView';
import type { PracticeTarget } from '../lib/practice';

const mockTargets: PracticeTarget[] = [
  { key: '1:hola', word: 'hola', translation: 'hello' },
  { key: '1:cafe', word: 'café', translation: 'coffee' },
];

describe('PracticeView', () => {
  it('empty targets shows helper text and disabled generate button', () => {
    render(
      <PracticeView
        targets={[]}
        level={1}
        rankTitle="Principiante"
        onGenerate={() => {}}
      />
    );
    expect(screen.getByTestId('practice-view')).toBeTruthy();
    expect(screen.getByText(/Completa algunas lecciones para desbloquear la práctica/)).toBeTruthy();
    const btn = screen.getByRole('button', { name: /Generar práctica/ });
    expect(btn).toBeTruthy();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('with targets renders words and an enabled generate button', () => {
    render(
      <PracticeView
        targets={mockTargets}
        level={3}
        rankTitle="Explorador"
        onGenerate={() => {}}
      />
    );
    expect(screen.getByText('hola')).toBeTruthy();
    expect(screen.getByText(/café/)).toBeTruthy();
    const btn = screen.getByRole('button', { name: /Generar práctica/ });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it('clicking the button calls onGenerate', () => {
    const onGenerate = vi.fn();
    render(
      <PracticeView
        targets={mockTargets}
        level={2}
        rankTitle="Aprendiz"
        onGenerate={onGenerate}
      />
    );
    const btn = screen.getByRole('button', { name: /Generar práctica/ });
    fireEvent.click(btn);
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it('loading shows Generando and button is disabled', () => {
    render(
      <PracticeView
        targets={mockTargets}
        level={2}
        rankTitle="Aprendiz"
        loading
        onGenerate={() => {}}
      />
    );
    const btn = screen.getByRole('button', { name: /Generando/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('noLives shows Sin vidas and disabled and does not call onGenerate on click', () => {
    const onGenerate = vi.fn();
    render(
      <PracticeView
        targets={mockTargets}
        level={2}
        rankTitle="Aprendiz"
        noLives
        onGenerate={onGenerate}
      />
    );
    const btn = screen.getByRole('button', { name: /Sin vidas/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn);
    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.getByText(/Recupera vidas para practicar/)).toBeTruthy();
  });

  it('renders the error string when provided', () => {
    render(
      <PracticeView
        targets={mockTargets}
        level={2}
        rankTitle="Aprendiz"
        error="No pudimos crear la práctica ahora mismo. Inténtalo de nuevo."
        onGenerate={() => {}}
      />
    );
    expect(screen.getByText(/No pudimos crear la práctica ahora mismo/)).toBeTruthy();
  });

  it('shows level and rankTitle', () => {
    render(
      <PracticeView
        targets={mockTargets}
        level={7}
        rankTitle="Aventurero"
        onGenerate={() => {}}
      />
    );
    expect(screen.getByText(/Nivel 7 · Aventurero/)).toBeTruthy();
  });
});
