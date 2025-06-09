// Manage categories and tabs on dashboard view

document.addEventListener('DOMContentLoaded', () => {
const newCatInput = document.getElementById('newCategory');
const addCatBtn = document.getElementById('addCategory');
const categoriesContainer = document.getElementById('categories');
const openTabsList = document.getElementById('openTabs');

// Load currently open tabs
function loadOpenTabs() {
  chrome.tabs.query({ currentWindow: true }, tabs => {
    openTabsList.innerHTML = '';
    tabs.forEach(tab => {
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.src = tab.favIconUrl || `chrome://favicon/${tab.url}`;
      img.className = 'favicon';
      const span = document.createElement('span');
      span.textContent = tab.title || tab.url;
      li.append(img, span);
      li.draggable = true;
      li.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ url: tab.url, title: tab.title }));
      });
      openTabsList.appendChild(li);
    });
  });
}

// Add a tab record to a category
function addTabToCategory(cat, tab) {
  chrome.storage.sync.get({ categories: {} }, data => {
    const cats = data.categories;
    if (!cats[cat]) cats[cat] = [];
    if (!cats[cat].some(t => t.url === tab.url)) {
      cats[cat].push(tab);
    }
    chrome.storage.sync.set({ categories: cats }, loadCategories);
  });
}

// Load and render categories
function loadCategories() {
chrome.storage.sync.get({ categories: {} }, data => {
const cats = data.categories;
categoriesContainer.innerHTML = '';
Object.keys(cats).forEach(cat => {
const card = document.createElement('div');
card.className = 'category-card';

    // Header
    const header = document.createElement('div');
    header.className = 'category-header';
    const title = document.createElement('h2');
    title.textContent = `${cat} (${cats[cat].length})`;
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.title = 'Delete category';
    delBtn.onclick = () => {
      deleteCategory(cat);
    };
    header.append(title, delBtn);
    card.append(header);

    // Tab list
    const ul = document.createElement('ul');
    ul.className = 'tab-list';
    ul.addEventListener('dragover', e => e.preventDefault());
    ul.addEventListener('drop', e => {
      e.preventDefault();
      const data = e.dataTransfer.getData('text/plain');
      if (data) addTabToCategory(cat, JSON.parse(data));
    });
    cats[cat].forEach(tab => {
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.src = `chrome://favicon/${tab.url}`;
      img.className = 'favicon';
      const a = document.createElement('a');
      a.href = tab.url;
      a.textContent = tab.title;
      a.target = '_blank';
      li.append(img, a);
      ul.appendChild(li);
    });
    card.appendChild(ul);

    const manual = document.createElement('div');
    manual.className = 'manual-add';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Add URL';
    const btn = document.createElement('button');
    btn.textContent = 'Add';
    btn.onclick = () => {
      const url = inp.value.trim();
      if (url) {
        addTabToCategory(cat, { url, title: url });
        inp.value = '';
      }
    };
    manual.append(inp, btn);
    card.appendChild(manual);

    // Open and save buttons
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open All';
    openBtn.className = 'open-btn';
    openBtn.onclick = () => openCategory(cat);
    card.appendChild(openBtn);

    categoriesContainer.appendChild(card);
  });
});

}

// Add category
addCatBtn.onclick = () => {
const cat = newCatInput.value.trim();
if (!cat) return;
chrome.storage.sync.get({ categories: {} }, data => {
const cats = data.categories;
if (!cats[cat]) cats[cat] = [];
chrome.storage.sync.set({ categories: cats }, () => {
newCatInput.value = '';
  loadOpenTabs();
  loadCategories();
});
});
};

// Delete category
function deleteCategory(cat) {
chrome.storage.sync.get({ categories: {} }, data => {
const cats = data.categories;
delete cats[cat];
chrome.storage.sync.set({ categories: cats }, loadCategories);
});
}

// Save current tabs
function saveTabs(cat) {
chrome.tabs.query({}, tabs => {
chrome.storage.sync.get({ categories: {} }, data => {
const cats = data.categories;
cats[cat] = tabs.map(t => ({ url: t.url, title: t.title }));
chrome.storage.sync.set({ categories: cats }, loadCategories);
});
});
}

// Open all tabs in category
function openCategory(cat) {
chrome.storage.sync.get({ categories: {} }, data => {
data.categories[cat].forEach(tab => chrome.tabs.create({ url: tab.url }));
});
}

// Context menu for saving tabs
chrome.runtime.onInstalled.addListener(() => {
chrome.contextMenus.create({
id: 'save-tabs',
title: 'Save all open tabs to category',
contexts: ['all']
});
});
chrome.contextMenus.onClicked.addListener(info => {
if (info.menuItemId === 'save-tabs') {
const cat = prompt('Enter category name:');
if (cat) saveTabs(cat);
}
});

loadOpenTabs();
loadCategories();
});

