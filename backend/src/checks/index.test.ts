import { createChecks } from './index';

describe('createChecks', () => {
  it('monta o pipeline na ordem da spec', () => {
    const checks = createChecks({ hashes: { claim: jest.fn() } });

    expect(checks.map((check) => check.name)).toEqual(['size', 'fileType', 'resolution', 'duplicate', 'editSignals']);
  });
});
