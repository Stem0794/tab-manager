function getCategoryData(cats, cat) {
  if (!cats[cat]) {
    cats[cat] = { tabs: [], color: '', icon: 'folder' };
  } else if (Array.isArray(cats[cat])) {
    cats[cat] = { tabs: cats[cat], color: '', icon: 'folder' };
  } else {
    cats[cat].tabs = cats[cat].tabs || [];
    cats[cat].color = cats[cat].color || '';
    cats[cat].icon = cats[cat].icon || 'folder';
  }
  return cats[cat];
}

function saveTabs(cat) {
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
      chrome.storage.sync.set({ categories: cats, categoryOrder: order });
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-tabs',
    title: 'Save all open tabs to category',
    contexts: ['all'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-tabs') {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => prompt('Enter category name:'),
      },
      (results) => {
        if (chrome.runtime.lastError) return;
        const cat = results && results[0] ? results[0].result : null;
        if (cat) saveTabs(cat);
      },
    );
  }
});
