import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('App Component', () => {
  it('should render the main heading', () => {
    render(<App />);

    const heading = screen.getByText('ReaderAI Frontend');
    expect(heading).toBeInTheDocument();
  });

  it('should render the development setup message', () => {
    render(<App />);

    const message = screen.getByText(/Development Setup Complete!/);
    expect(message).toBeInTheDocument();
  });

  it('should render all button variants', () => {
    render(<App />);

    expect(screen.getByText('Primary Button')).toBeInTheDocument();
    expect(screen.getByText('Secondary Button')).toBeInTheDocument();
    expect(screen.getByText('Ghost Button')).toBeInTheDocument();
  });
});
