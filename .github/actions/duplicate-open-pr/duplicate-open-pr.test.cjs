'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_THRESHOLD,
  jaccard,
  pickDuplicate,
  run,
  SKIP_LABEL,
} = require('./duplicate-open-pr.cjs');

describe('jaccard', () => {
  it('returns 0 for two empty lists', () => {
    assert.equal(jaccard([], []), 0);
  });

  it('returns 1 for identical path sets', () => {
    const files = ['app/lib/engagements.ts', 'app/lib/quote.ts'];
    assert.equal(jaccard(files, files.slice()), 1);
  });

  it('returns ~1 for the agency#164 vs #165 strip (same copy files)', () => {
    const a = [
      'README.md',
      'app/lib/engagements.ts',
      'app/lib/quote.ts',
      'app/lib/__tests__/engagements.test.ts',
      'app/lib/__tests__/quote.test.ts',
      'app/lib/__tests__/public-copy.test.ts',
    ];
    const b = a.slice();
    b.push('app/routes/__tests__/ProcessPage.test.tsx');
    const score = jaccard(a, b);
    assert.ok(score >= DEFAULT_THRESHOLD, 'score=' + String(score));
  });

  it('stays low for jv#1518 vs #1521 (one shared file in a larger board PR)', () => {
    const board = [
      'docs/gaps/GAP-194.yml',
      'docs/gaps/GAP-300.yml',
      'docs/gaps/GAP-416.yml',
      'docs/gaps/GAP-426.yml',
      'docs/gaps/GAP-465.yml',
      'docs/gaps/GAP-466.yml',
      'docs/gaps/GAP-360.yml',
      'docs/gaps/closed/GAP-448.yml',
      'docs/gaps/closed/GAP-485.yml',
      'docs/initiatives/admin-dashboard.yml',
      'docs/initiatives/product-frontend-ves.yml',
    ];
    const liveNote = ['docs/gaps/closed/GAP-485.yml'];
    const score = jaccard(board, liveNote);
    assert.ok(score < 0.3, 'score=' + String(score));
    assert.ok(score < DEFAULT_THRESHOLD);
  });
});

describe('pickDuplicate', () => {
  const stripFiles = ['app/lib/engagements.ts', 'app/lib/quote.ts'];

  it('selects the older overlapping PR (164 wins over 165)', () => {
    const current = {
      number: 165,
      createdAt: '2026-08-28T06:56:49Z',
      files: stripFiles,
      labels: [],
    };
    const hit = pickDuplicate(
      current,
      [
        {
          number: 164,
          createdAt: '2026-08-28T06:50:21Z',
          files: stripFiles,
          htmlUrl: 'https://github.com/RevealUIStudio/agency/pull/164',
        },
      ],
      DEFAULT_THRESHOLD,
    );
    assert.ok(hit);
    assert.equal(hit.number, 164);
    assert.equal(hit.score, 1);
  });

  it('does not select a newer overlapping PR', () => {
    const current = {
      number: 164,
      createdAt: '2026-08-28T06:50:21Z',
      files: stripFiles,
      labels: [],
    };
    const hit = pickDuplicate(
      current,
      [
        {
          number: 165,
          createdAt: '2026-08-28T06:56:49Z',
          files: stripFiles,
        },
      ],
      DEFAULT_THRESHOLD,
    );
    assert.equal(hit, null);
  });

  it('does not close the 485 live-note PR against the 360 paper-close PR', () => {
    const current = {
      number: 1521,
      createdAt: '2026-08-28T07:09:22Z',
      files: ['docs/gaps/closed/GAP-485.yml'],
      labels: [],
    };
    const hit = pickDuplicate(
      current,
      [
        {
          number: 1518,
          createdAt: '2026-08-28T06:56:52Z',
          files: [
            'docs/gaps/GAP-360.yml',
            'docs/gaps/closed/GAP-485.yml',
            'docs/gaps/GAP-466.yml',
            'docs/initiatives/admin-dashboard.yml',
          ],
        },
      ],
      DEFAULT_THRESHOLD,
    );
    assert.equal(hit, null);
  });

  it('skips when not-a-duplicate is present', () => {
    const current = {
      number: 2,
      createdAt: '2026-08-28T07:00:00Z',
      files: stripFiles,
      labels: [{ name: SKIP_LABEL }],
    };
    const hit = pickDuplicate(
      current,
      [{ number: 1, createdAt: '2026-08-28T06:00:00Z', files: stripFiles }],
      DEFAULT_THRESHOLD,
    );
    assert.equal(hit, null);
  });
});

describe('run', () => {
  function mockCore() {
    const lines = [];
    return {
      lines,
      info(msg) {
        lines.push(['info', msg]);
      },
      setFailed(msg) {
        lines.push(['fail', msg]);
      },
    };
  }

  it('closes the newer PR and fails the check', async () => {
    const comments = [];
    const updates = [];
    const core = mockCore();
    const result = await run({
      github: {
        rest: {
          issues: {
            async createComment(args) {
              comments.push(args);
            },
          },
          pulls: {
            async update(args) {
              updates.push(args);
            },
          },
        },
      },
      context: {
        repo: { owner: 'RevealUIStudio', repo: 'agency' },
        payload: {
          pull_request: {
            number: 165,
            created_at: '2026-08-28T06:56:49Z',
            base: { ref: 'test' },
            labels: [],
          },
        },
      },
      core,
      async listFilesFn(n) {
        return n === 164 || n === 165 ? ['app/lib/engagements.ts'] : [];
      },
      async listOpenPrsFn() {
        return [
          {
            number: 164,
            created_at: '2026-08-28T06:50:21Z',
            html_url: 'https://github.com/RevealUIStudio/agency/pull/164',
          },
          {
            number: 165,
            created_at: '2026-08-28T06:56:49Z',
            html_url: 'https://github.com/RevealUIStudio/agency/pull/165',
          },
        ];
      },
    });
    assert.equal(result.duplicate.number, 164);
    assert.equal(comments.length, 1);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].state, 'closed');
    assert.equal(updates[0].pull_number, 165);
    assert.ok(comments[0].body.includes('#164'));
    assert.equal(core.lines[0][0], 'fail');
  });

  it('no-ops when there is no overlap', async () => {
    const core = mockCore();
    const result = await run({
      github: { rest: { issues: {}, pulls: {} } },
      context: {
        repo: { owner: 'RevealUIStudio', repo: 'agency' },
        payload: {
          pull_request: {
            number: 10,
            created_at: '2026-08-28T07:00:00Z',
            base: { ref: 'test' },
            labels: [],
          },
        },
      },
      core,
      async listFilesFn(n) {
        return n === 10 ? ['README.md'] : ['app/lib/engagements.ts'];
      },
      async listOpenPrsFn() {
        return [
          { number: 9, created_at: '2026-08-28T06:00:00Z', html_url: '' },
          { number: 10, created_at: '2026-08-28T07:00:00Z', html_url: '' },
        ];
      },
    });
    assert.equal(result.duplicate, null);
    assert.equal(
      core.lines.some((line) => line[0] === 'fail'),
      false,
    );
  });
});
