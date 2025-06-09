// Manage categories and tabs on dashboard view

document.addEventListener('DOMContentLoaded', () => {
const newCatInput = document.getElementById('newCategory');
const addCatBtn = document.getElementById('addCategory');
const categoriesContainer = document.getElementById('categories');
const openTabsList = document.getElementById('openTabs');
const darkToggle = document.getElementById('darkToggle');
const themeColorInput = document.getElementById('themeColor');

chrome.storage.sync.get({ darkMode: false, themeColor: '#6200ee' }, data => {
  if (data.darkMode) document.body.classList.add('dark');
  darkToggle.checked = data.darkMode;
  document.documentElement.style.setProperty('--primary', data.themeColor);
  themeColorInput.value = data.themeColor;
});

darkToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark', darkToggle.checked);
  chrome.storage.sync.set({ darkMode: darkToggle.checked });
});

themeColorInput.addEventListener('input', () => {
  document.documentElement.style.setProperty('--primary', themeColorInput.value);
chrome.storage.sync.set({ themeColor: themeColorInput.value });
});

function getCategoryData(cats, cat) {
  if (!cats[cat]) {
    cats[cat] = { tabs: [], color: '#fff', icon: 'folder' };
  } else if (Array.isArray(cats[cat])) {
    cats[cat] = { tabs: cats[cat], color: '#fff', icon: 'folder' };
  } else {
    cats[cat].tabs = cats[cat].tabs || [];
    cats[cat].color = cats[cat].color || '#fff';
    cats[cat].icon = cats[cat].icon || 'folder';
  }
  return cats[cat];
}

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
        e.dataTransfer.setData('text/plain', JSON.stringify({ url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl }));
      });
      openTabsList.appendChild(li);
    });
  });
}

// Add a tab record to a category
function addTabToCategory(cat, tab) {
  chrome.storage.sync.get({ categories: {}, categoryOrder: [] }, data => {
    const cats = data.categories;
    const order = data.categoryOrder;
    const catData = getCategoryData(cats, cat);
    if (!order.includes(cat)) order.push(cat);
    if (!catData.tabs.some(t => t.url === tab.url)) {
      catData.tabs.push({
        url: tab.url,
        title: tab.title || tab.url,
        favIconUrl: tab.favIconUrl || ''
      });
    }
    chrome.storage.sync.set({ categories: cats, categoryOrder: order }, loadCategories);
  });
}

function renameTab(cat, index, title) {
  const idx = parseInt(index, 10);
  chrome.storage.sync.get({ categories: {} }, data => {
    const catData = getCategoryData(data.categories, cat);
    if (!catData.tabs[idx]) return;
    catData.tabs[idx].title = title;
    chrome.storage.sync.set({ categories: data.categories }, loadCategories);
  });
}

// Load and render categories
function loadCategories() {
  chrome.storage.sync.get({ categories: {}, categoryOrder: [] }, data => {
    const cats = data.categories;
    const order = data.categoryOrder;
    categoriesContainer.innerHTML = '';
    const ordered = order.filter(c => cats[c]).concat(Object.keys(cats).filter(c => !order.includes(c)));
    ordered.forEach(cat => {
const card = document.createElement('div');
card.className = 'category-card';
const catData = getCategoryData(cats, cat);
card.style.background = catData.color;
card.draggable = true;
card.addEventListener('dragstart', e => {
  e.dataTransfer.setData('text/plain', cat);
});
card.addEventListener('dragover', e => e.preventDefault());
card.addEventListener('drop', e => {
  e.preventDefault();
  const from = e.dataTransfer.getData('text/plain');
  if (from) reorderCategories(from, cat);
});

    // Header
    const header = document.createElement('div');
    header.className = 'category-header';
    const icon = document.createElement('span');
    icon.className = 'material-icons category-icon';
    icon.textContent = catData.icon;
    const title = document.createElement('h2');
    title.textContent = `${cat} (${catData.tabs.length})`;
    const editBtn = document.createElement('button');
    editBtn.textContent = '✎';
    editBtn.title = 'Edit category';
    editBtn.onclick = () => editCategory(cat);
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.title = 'Delete category';
    delBtn.onclick = () => {
      deleteCategory(cat);
    };
    header.append(icon, title, editBtn, delBtn);
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
    catData.tabs.forEach((tab, idx) => {
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.src = tab.favIconUrl || `chrome://favicon/${tab.url}`;
      img.className = 'favicon';
      const a = document.createElement('a');
      a.href = tab.url;
      a.textContent = tab.title;
      a.target = '_blank';
      const rename = document.createElement('button');
      rename.textContent = '✎';
      rename.title = 'Rename tab';
      rename.className = 'rename-btn';
      rename.onclick = e => {
        e.stopPropagation();
        const nt = prompt('New title', tab.title);
        if (nt) renameTab(cat, idx, nt);
      };
      li.append(img, a, rename);
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
        addTabToCategory(cat, { url, title: url, favIconUrl: '' });
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
chrome.storage.sync.get({ categories: {}, categoryOrder: [] }, data => {
const cats = data.categories;
const order = data.categoryOrder;
getCategoryData(cats, cat); // initialize with defaults
if (!order.includes(cat)) order.push(cat);
chrome.storage.sync.set({ categories: cats, categoryOrder: order }, () => {
newCatInput.value = '';
  loadOpenTabs();
  loadCategories();
});
});
};

// Delete category
function deleteCategory(cat) {
chrome.storage.sync.get({ categories: {}, categoryOrder: [] }, data => {
const cats = data.categories;
const order = data.categoryOrder;
delete cats[cat];
const idx = order.indexOf(cat);
if (idx > -1) order.splice(idx, 1);
chrome.storage.sync.set({ categories: cats, categoryOrder: order }, loadCategories);
});
}

// Save current tabs
function saveTabs(cat) {
chrome.tabs.query({}, tabs => {
chrome.storage.sync.get({ categories: {}, categoryOrder: [] }, data => {
const cats = data.categories;
const order = data.categoryOrder;
const catData = getCategoryData(cats, cat);
catData.tabs = tabs.map(t => ({ url: t.url, title: t.title, favIconUrl: t.favIconUrl || '' }));
if (!order.includes(cat)) order.push(cat);
chrome.storage.sync.set({ categories: cats, categoryOrder: order }, loadCategories);
});
});
}

// Open all tabs in category
function openCategory(cat) {
chrome.storage.sync.get({ categories: {} }, data => {
const catData = getCategoryData(data.categories, cat);
catData.tabs.forEach(tab => chrome.tabs.create({ url: tab.url }));
});
}

function reorderCategories(fromCat, toCat) {
  chrome.storage.sync.get({ categoryOrder: [] }, data => {
    const order = data.categoryOrder;
    const fromIdx = order.indexOf(fromCat);
    const toIdx = order.indexOf(toCat);
    if (fromIdx === -1 || toIdx === -1) return;
    order.splice(toIdx, 0, order.splice(fromIdx, 1)[0]);
    chrome.storage.sync.set({ categoryOrder: order }, loadCategories);
  });
}

function editCategory(oldName) {
  chrome.storage.sync.get({ categories: {}, categoryOrder: [] }, data => {
    const cats = data.categories;
    const order = data.categoryOrder;
    const catData = getCategoryData(cats, oldName);
    const newName = prompt('Category name', oldName);
    if (!newName) return;
    const newIcon = prompt('Icon name (material icon)', catData.icon) || catData.icon;
    const newColor = prompt('Background color', catData.color) || catData.color;
    catData.icon = newIcon;
    catData.color = newColor;
    if (newName !== oldName) {
      cats[newName] = catData;
      delete cats[oldName];
      const idx = order.indexOf(oldName);
      if (idx > -1) order[idx] = newName;
    }
    chrome.storage.sync.set({ categories: cats, categoryOrder: order }, loadCategories);
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

