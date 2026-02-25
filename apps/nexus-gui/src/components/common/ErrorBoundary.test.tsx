import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ErrorBoundary from './ErrorBoundary';

function CrashOnRender(): never {
  throw new Error('intentional test crash');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no runtime error occurs', () => {
    render(
      <ErrorBoundary>
        <div>healthy tree</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('healthy tree')).toBeInTheDocument();
  });

  it('renders branded fallback when child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <CrashOnRender />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Restart App')).toBeInTheDocument();
  });
});
