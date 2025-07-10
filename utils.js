// Shared utility functions for tab management

export function storageGet(defaults, callback) {
  chrome.storage.sync.get(defaults, (data) => {
    if (chrome.runtime.lastError) {
      chrome.storage.local.get(defaults, callback);
    } else {
      const missing = Object.keys(defaults).some((k) => data[k] === undefined);
      if (missing) {
        chrome.storage.local.get(defaults, callback);
      } else {
        callback(data);
      }
    }
  });
}

export function storageSet(data, callback) {
  chrome.storage.sync.set(data, () => {
    if (chrome.runtime.lastError) {
      chrome.storage.local.set(data, callback);
    } else if (callback) callback();
  });
}

export function getCategoryData(cats, cat) {
  if (!cats[cat]) {
    cats[cat] = { tabs: [], icon: 'folder' };
  } else if (Array.isArray(cats[cat])) {
    cats[cat] = { tabs: cats[cat], icon: 'folder' };
  } else {
    cats[cat].tabs = cats[cat].tabs || [];
    cats[cat].icon = cats[cat].icon || 'folder';
  }
  return cats[cat];
}

export function saveTabs(cat, closeAfter = false, callback) {
  chrome.tabs.query({}, (tabs) => {
    const tabIds = tabs.map((t) => t.id);
    storageGet({ categories: {}, categoryOrder: [] }, (data) => {
      const cats = data.categories;
      const order = data.categoryOrder;
      const catData = getCategoryData(cats, cat);
      catData.tabs = tabs.map((t) => ({
        url: t.url,
        title: t.title,
        favIconUrl: t.favIconUrl || '',
      }));
      if (!order.includes(cat)) order.push(cat);
      storageSet({ categories: cats, categoryOrder: order }, () => {
        if (closeAfter) chrome.tabs.remove(tabIds);
        if (callback) callback();
      });
    });
  });
}
