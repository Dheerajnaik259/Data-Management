import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { KeyboardShortcuts } from './KeyboardShortcuts';

function CurrentPath() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}</output>;
}

function ShortcutHarness() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <form onSubmit={event => {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('test:form-submit'));
      }}>
        <input aria-label="Editable field" required defaultValue="valid" />
        <button type="submit">Submit form</button>
      </form>
      <KeyboardShortcuts />
      <Routes>
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('KeyboardShortcuts', () => {
  beforeEach(() => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens shortcut help from the question-mark key and closes it with Escape', () => {
    render(<ShortcutHarness />);

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).toBeNull();
  });

  it('dispatches the command-palette shortcut on Ctrl+K and Cmd+K', () => {
    const listener = vi.fn();
    window.addEventListener('app:command-palette', listener);
    render(<ShortcutHarness />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls.map(([event]) => (event as CustomEvent).detail)).toEqual(['toggle', 'toggle']);
    window.removeEventListener('app:command-palette', listener);
  });

  it('navigates using a two-key sequence outside editable controls', () => {
    render(<ShortcutHarness />);

    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 's' });

    expect(screen.getByLabelText('Current path').textContent).toBe('/shoots');
  });

  it('does not navigate when a shortcut sequence starts in an editable field', () => {
    render(<ShortcutHarness />);
    const input = screen.getByRole('textbox', { name: 'Editable field' });

    fireEvent.keyDown(input, { key: 'g' });
    fireEvent.keyDown(input, { key: 's' });

    expect(screen.getByLabelText('Current path').textContent).toBe('/');
  });

  it('provides settings navigation through the comma sequence', () => {
    render(<ShortcutHarness />);

    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: ',' });

    expect(screen.getByLabelText('Current path').textContent).toBe('/settings');
  });

  it('submits a valid form with Ctrl+Enter', () => {
    const submitListener = vi.fn();
    window.addEventListener('test:form-submit', submitListener);
    render(<ShortcutHarness />);
    const input = screen.getByRole('textbox', { name: 'Editable field' });

    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });

    expect(submitListener).toHaveBeenCalledTimes(1);
    window.removeEventListener('test:form-submit', submitListener);
  });

  it('does not submit an invalid form with Ctrl+Enter', () => {
    const submitListener = vi.fn();
    window.addEventListener('test:form-submit', submitListener);
    render(<ShortcutHarness />);
    const input = screen.getByRole('textbox', { name: 'Editable field' }) as HTMLInputElement;
    input.value = '';

    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });

    expect(submitListener).not.toHaveBeenCalled();
    window.removeEventListener('test:form-submit', submitListener);
  });
});
