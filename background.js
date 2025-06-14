import { saveTabs } from './utils.js';

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
        func: () => {
          const cat = prompt('Enter category name:');
          if (!cat) return null;
          const closeAfter = confirm('Close tabs after saving?');
          return { cat, closeAfter };
        },
      },
      (results) => {
        if (chrome.runtime.lastError) return;
        const res = results && results[0] ? results[0].result : null;
        if (res && res.cat) saveTabs(res.cat, res.closeAfter);
      },
    );
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-tabs') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;
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
    });
  } else if (command === 'open-dashboard') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }
});
