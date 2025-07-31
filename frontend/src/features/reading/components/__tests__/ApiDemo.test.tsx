import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ApiDemo } from '../ApiDemo';
import { store } from '@app/store';

describe('ApiDemo', () => {
  it('renders loading state initially', () => {
    render(
      <Provider store={store}>
        <ApiDemo />
      </Provider>
    );

    expect(screen.getByText('Loading passage...')).toBeInTheDocument();
  });
});
