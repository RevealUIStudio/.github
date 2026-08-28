'use strict';

/** Label that skips close/fail. Explicit override, not a memory rule. */
const SKIP_LABEL = 'not-a-duplicate';
const DEFAULT_THRESHOLD = 0.8;

/**
 * Jaccard similarity of two filename lists: |A∩B| / |A∪B|.
 * Empty vs empty is 0 so two empty diffs are not treated as duplicates.
 */
function jaccard(filesA, filesB) {
  const a = uniqueNames(filesA);
  const b = uniqueNames(filesB);
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const name of a) {
    if (b.has(name)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

function uniqueNames(files) {
  const set = new Set();
  if (!Array.isArray(files)) return set;
  for (const item of files) {
    if (typeof item === 'string' && item.length > 0) set.add(item);
  }
  return set;
}

function labelNames(labels) {
  const names = [];
  if (!Array.isArray(labels)) return names;
  for (const label of labels) {
    if (typeof label === 'string') {
      names.push(label);
      continue;
    }
    if (label && typeof label.name === 'string') names.push(label.name);
  }
  return names;
}

function isOlderOrEqual(other, current) {
  const otherTime = Date.parse(other.createdAt);
  const currentTime = Date.parse(current.createdAt);
  if (Number.isNaN(otherTime) || Number.isNaN(currentTime)) {
    return other.number < current.number;
  }
  if (otherTime < currentTime) return true;
  if (otherTime > currentTime) return false;
  return other.number < current.number;
}

/**
 * Return the oldest open PR that overlaps `current` at >= threshold, or null.
 * Newer PRs never win the lock. The current PR is skipped.
 */
function pickDuplicate(current, others, threshold) {
  const floor = typeof threshold === 'number' ? threshold : DEFAULT_THRESHOLD;
  if (labelNames(current.labels).includes(SKIP_LABEL)) return null;
  let winner = null;
  if (!Array.isArray(others)) return null;
  for (const other of others) {
    if (!other || other.number === current.number) continue;
    if (!isOlderOrEqual(other, current)) continue;
    const score = jaccard(current.files, other.files);
    if (score < floor) continue;
    if (!winner || other.number < winner.number) {
      winner = { number: other.number, score, htmlUrl: other.htmlUrl || '' };
    }
  }
  return winner;
}

async function defaultListFiles(github, owner, repo, pullNumber) {
  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  const names = [];
  for (const file of files) {
    if (file && typeof file.filename === 'string') names.push(file.filename);
  }
  return names;
}

async function defaultListOpenPrs(github, owner, repo, base) {
  return github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: 'open',
    base,
    per_page: 100,
  });
}

async function run({
  github,
  context,
  core,
  listFilesFn,
  listOpenPrsFn,
  threshold,
} = {}) {
  if (!core || typeof core.info !== 'function' || typeof core.setFailed !== 'function') {
    throw new Error('run() requires core.info and core.setFailed');
  }
  const pr = context && context.payload && context.payload.pull_request;
  if (!pr) {
    core.info('No pull_request in payload; skip.');
    return { skipped: true, reason: 'no-pull-request' };
  }
  const repoCtx = context.repo || {};
  const owner = repoCtx.owner;
  const repo = repoCtx.repo;
  if (!owner || !repo) {
    core.setFailed('Missing context.repo.owner/repo');
    return { skipped: true, reason: 'no-repo' };
  }

  const floor =
    typeof threshold === 'number'
      ? threshold
      : parseFloat(process.env.DUPLICATE_PR_THRESHOLD || String(DEFAULT_THRESHOLD));
  if (!Number.isFinite(floor) || floor <= 0 || floor > 1) {
    core.setFailed('Invalid duplicate-open-pr threshold');
    return { skipped: true, reason: 'bad-threshold' };
  }

  const labels = labelNames(pr.labels);
  if (labels.includes(SKIP_LABEL)) {
    core.info('Label not-a-duplicate present; skip.');
    return { skipped: true, reason: 'skip-label' };
  }

  const listFiles = listFilesFn || ((n) => defaultListFiles(github, owner, repo, n));
  const listOpen = listOpenPrsFn || (() => defaultListOpenPrs(github, owner, repo, pr.base.ref));

  const currentFiles = await listFiles(pr.number);
  const open = await listOpen();
  const others = [];
  for (const other of open) {
    if (!other || other.number === pr.number) continue;
    const files = await listFiles(other.number);
    others.push({
      number: other.number,
      createdAt: other.created_at,
      files,
      htmlUrl: other.html_url,
    });
  }

  const hit = pickDuplicate(
    {
      number: pr.number,
      createdAt: pr.created_at,
      files: currentFiles,
      labels,
    },
    others,
    floor,
  );
  if (!hit) {
    core.info('No overlapping open PR at threshold ' + String(floor));
    return { skipped: false, duplicate: null };
  }

  const score = hit.score.toFixed(2);
  const body = [
    'Closed as a duplicate of #' +
      String(hit.number) +
      ' (changed-path Jaccard ' +
      score +
      ', threshold ' +
      floor.toFixed(2) +
      ').',
    '',
    'The older PR keeps the lock so two harnesses on the same paste cannot both sit open.',
    'If this is a different change, add the `not-a-duplicate` label and reopen.',
  ].join('\n');

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: pr.number,
    body,
  });
  await github.rest.pulls.update({
    owner,
    repo,
    pull_number: pr.number,
    state: 'closed',
  });
  core.setFailed('Duplicate of #' + String(hit.number) + ' (Jaccard ' + score + ')');
  return { skipped: false, duplicate: hit };
}

module.exports = {
  SKIP_LABEL,
  DEFAULT_THRESHOLD,
  jaccard,
  pickDuplicate,
  run,
};
