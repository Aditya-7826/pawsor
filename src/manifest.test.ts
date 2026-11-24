import { describe, expect, it } from 'vitest';
import manifest from '../public/manifest.json';

describe('manifest.json', () => {
  it('is Manifest V3 with only the storage permission', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest).not.toHaveProperty('host_permissions');
  });

  it('injects the content script on every page, once, at document_idle', () => {
    expect(manifest.content_scripts).toEqual([
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_idle', all_frames: false },
    ]);
  });

  it('has a popup and the Alt+Shift+P toggle command', () => {
    expect(manifest.action.default_popup).toBe('popup.html');
    expect(manifest.commands['toggle-pawsor'].suggested_key.default).toBe('Alt+Shift+P');
  });

  it('declares icons at 16, 32, 48 and 128 px', () => {
    expect(Object.keys(manifest.icons)).toEqual(['16', '32', '48', '128']);
  });
});
