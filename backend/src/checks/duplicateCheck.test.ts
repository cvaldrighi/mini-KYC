import { createHash } from 'node:crypto';
import type { ClaimResult } from '../repositories/hashRepository';
import { readFixture } from '../test/fixtures';
import { createDuplicateCheck } from './duplicateCheck';
import { makeContext } from './test-helpers';

function fakeHashes(result: ClaimResult) {
  return { claim: jest.fn().mockResolvedValue(result) };
}

describe('createDuplicateCheck', () => {
  it('registra o SHA-256 do arquivo para a verificação', async () => {
    const file = readFixture('valid.jpg');
    const hashes = fakeHashes('CLAIMED');

    const verdict = await createDuplicateCheck(hashes).run(makeContext(file, { verificationId: 'v1' }));

    expect(verdict).toEqual({ outcome: 'PASS' });
    expect(hashes.claim).toHaveBeenCalledWith(createHash('sha256').update(file).digest('hex'), 'v1');
  });

  it('aprova o reprocessamento da mesma verificação', async () => {
    const verdict = await createDuplicateCheck(fakeHashes('SAME_VERIFICATION')).run(makeContext(readFixture('valid.jpg')));

    expect(verdict).toEqual({ outcome: 'PASS' });
  });

  it('reprova o arquivo já usado em outra verificação', async () => {
    const verdict = await createDuplicateCheck(fakeHashes('DUPLICATE')).run(makeContext(readFixture('valid.jpg')));

    expect(verdict).toEqual({ outcome: 'REJECT', reason: 'DUPLICATE_DOCUMENT' });
  });
});
