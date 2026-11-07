import { isAcceptedContentType, statusFromOutcome } from './verification';

describe('statusFromOutcome', () => {
  it.each([
    ['PASS', 'APPROVED'],
    ['REJECT', 'REJECTED'],
    ['REVIEW', 'MANUAL_REVIEW'],
  ] as const)('%s vira %s', (outcome, status) => {
    expect(statusFromOutcome(outcome)).toBe(status);
  });
});

describe('isAcceptedContentType', () => {
  it.each(['image/jpeg', 'image/png', 'application/pdf'])('aceita %s', (type) => {
    expect(isAcceptedContentType(type)).toBe(true);
  });

  it.each(['image/gif', 'application/octet-stream', ''])('recusa "%s"', (type) => {
    expect(isAcceptedContentType(type)).toBe(false);
  });
});
