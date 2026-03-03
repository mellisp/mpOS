import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

describe('i18n', () => {
  let dom, window;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:8000',
      runScripts: 'dangerously',
      resources: 'usable',
    });
    window = dom.window;
    // Load i18n.js
    const script = readFileSync('js/i18n.js', 'utf-8');
    window.eval(script);
  });

  it('should export t() function', () => {
    expect(typeof window.t).toBe('function');
  });

  it('should export setLanguage() function', () => {
    expect(typeof window.setLanguage).toBe('function');
  });

  it('should export getLang() function', () => {
    expect(typeof window.getLang).toBe('function');
  });

  it('should return key for missing translations', () => {
    const key = 'zz' + '.missing.' + 'test';
    const result = window.t(key);
    expect(result).toBe(key);
  });

  it('should return English translations by default', () => {
    const result = window.t('ui.start');
    expect(result).toBe('Start');
  });
});
