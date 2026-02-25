import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DesktopModeNotice from './DesktopModeNotice';

describe('DesktopModeNotice', () => {
  it('renders default browser-mode guidance', () => {
    render(<DesktopModeNotice />);

    expect(screen.getByText('Browser mode detected')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Connect to the NEXUS desktop app (Tauri) for full scan, export, and router control features.',
      ),
    ).toBeInTheDocument();
  });

  it('renders custom messaging for page-specific context', () => {
    render(
      <DesktopModeNotice
        title="Desktop runtime required"
        message="Run with npm run tauri dev."
      />,
    );

    expect(screen.getByText('Desktop runtime required')).toBeInTheDocument();
    expect(screen.getByText('Run with npm run tauri dev.')).toBeInTheDocument();
  });
});
