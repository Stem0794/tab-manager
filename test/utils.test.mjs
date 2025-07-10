import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCategoryData, storageGet, storageSet } from '../utils.js';

function mockChrome() {
  global.chrome = {
    runtime: {},
    storage: {
      sync: {},
      local: {},
    },
  };
  return global.chrome;
}

function restoreChrome(original) {
  global.chrome = original;
}

// Tests for getCategoryData

test('getCategoryData initializes a new category', () => {
  const cats = {};
  const result = getCategoryData(cats, 'news');
  assert.deepEqual(result, { tabs: [], icon: 'folder' });
  assert.deepEqual(cats, { news: { tabs: [], icon: 'folder' } });
});

test('getCategoryData converts array to object', () => {
  const cats = { music: ['a', 'b'] };
  const result = getCategoryData(cats, 'music');
  assert.deepEqual(result, { tabs: ['a', 'b'], icon: 'folder' });
});

test('getCategoryData fills missing fields', () => {
  const cats = { games: { tabs: [{ url: 'a' }] } };
  const result = getCategoryData(cats, 'games');
  assert.deepEqual(result, { tabs: [{ url: 'a' }], icon: 'folder' });
});

// Tests for storageGet

test('storageGet returns sync data when available', async () => {
  const original = global.chrome;
  const chrome = mockChrome();
  chrome.storage.sync.get = (defs, cb) => {
    chrome.runtime.lastError = null;
    cb({ test: 123 });
  };
  chrome.storage.local.get = () => {
    throw new Error('local.get should not be called');
  };

  await new Promise((resolve) => {
    storageGet({ test: 0 }, (data) => {
      assert.deepEqual(data, { test: 123 });
      resolve();
    });
  });
  restoreChrome(original);
});

test('storageGet falls back to local when data missing', async () => {
  const original = global.chrome;
  const chrome = mockChrome();
  let localCalled = false;
  chrome.storage.sync.get = (defs, cb) => {
    chrome.runtime.lastError = null;
    cb({});
  };
  chrome.storage.local.get = (defs, cb) => {
    localCalled = true;
    cb({ test: 5 });
  };
  await new Promise((resolve) => {
    storageGet({ test: 0 }, (data) => {
      assert.deepEqual(data, { test: 5 });
      assert.ok(localCalled);
      resolve();
    });
  });
  restoreChrome(original);
});

test('storageGet falls back to local on error', async () => {
  const original = global.chrome;
  const chrome = mockChrome();
  let localCalled = false;
  chrome.storage.sync.get = (defs, cb) => {
    chrome.runtime.lastError = { message: 'fail' };
    cb({});
  };
  chrome.storage.local.get = (defs, cb) => {
    localCalled = true;
    cb({ test: 7 });
  };
  await new Promise((resolve) => {
    storageGet({ test: 0 }, (data) => {
      assert.deepEqual(data, { test: 7 });
      assert.ok(localCalled);
      resolve();
    });
  });
  restoreChrome(original);
});

// Tests for storageSet

test('storageSet uses sync when successful', async () => {
  const original = global.chrome;
  const chrome = mockChrome();
  let syncCalled = false;
  let localCalled = false;
  chrome.storage.sync.set = (data, cb) => {
    syncCalled = true;
    chrome.runtime.lastError = null;
    cb();
  };
  chrome.storage.local.set = () => {
    localCalled = true;
  };
  await new Promise((resolve) => {
    storageSet({ a: 1 }, () => {
      resolve();
    });
  });
  assert.ok(syncCalled);
  assert.ok(!localCalled);
  restoreChrome(original);
});

test('storageSet falls back to local on error', async () => {
  const original = global.chrome;
  const chrome = mockChrome();
  let syncCalled = false;
  let localCalled = false;
  chrome.storage.sync.set = (data, cb) => {
    syncCalled = true;
    chrome.runtime.lastError = { message: 'fail' };
    cb();
  };
  chrome.storage.local.set = (data, cb) => {
    localCalled = true;
    cb();
  };
  await new Promise((resolve) => {
    storageSet({ a: 1 }, () => {
      resolve();
    });
  });
  assert.ok(syncCalled);
  assert.ok(localCalled);
  restoreChrome(original);
});
