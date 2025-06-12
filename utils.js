// Shared utility functions for tab management

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

export function saveTabs(cat, callback) {
  chrome.tabs.query({}, (tabs) => {
    chrome.storage.sync.get({ categories: {}, categoryOrder: [] }, (data) => {
      const cats = data.categories;
      const order = data.categoryOrder;
      const catData = getCategoryData(cats, cat);
      catData.tabs = tabs.map((t) => ({
        url: t.url,
        title: t.title,
        favIconUrl: t.favIconUrl || '',
      }));
      if (!order.includes(cat)) order.push(cat);
      chrome.storage.sync.set(
        { categories: cats, categoryOrder: order },
        callback,
      );
    });
  });
}
