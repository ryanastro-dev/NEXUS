import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { APP_LANGUAGE_STORAGE_KEY } from '../lib/i18n/translations';
import { useLanguage, useLanguageStore } from './useLanguage';

describe('useLanguage', () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.setState({ language: 'en' });
  });

  it('defaults to English copy state', () => {
    const { result } = renderHook(() => useLanguage());

    expect(result.current.language).toBe('en');
    expect(result.current.locale).toBe('en-US');
    expect(result.current.copy.header.scanButton.start).toBe('Start Scan');
  });

  it('updates to Myanmar and persists setting', () => {
    const { result } = renderHook(() => useLanguage());

    act(() => {
      result.current.setLanguage('my');
    });

    expect(result.current.language).toBe('my');
    expect(result.current.locale).toBe('my-MM');
    expect(result.current.copy.header.scanButton.start).toBe('စကင် စတင်');
    expect(localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)).toBe('my');
  });

  it('toggles language state', () => {
    const { result } = renderHook(() => useLanguage());

    act(() => {
      result.current.toggleLanguage();
    });
    expect(result.current.language).toBe('my');

    act(() => {
      result.current.toggleLanguage();
    });
    expect(result.current.language).toBe('en');
  });
});
