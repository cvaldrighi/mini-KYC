import { formatFileSize } from './formatFileSize';

describe('formatFileSize', () => {
  it.each([
    [850, '850 bytes'],
    [214 * 1024, '214 KB'],
    [1.8 * 1024 * 1024, '1,8 MB'],
    [5 * 1024 * 1024, '5 MB'],
  ])('%i bytes vira "%s"', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});
