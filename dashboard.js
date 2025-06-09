// Manage categories and tabs on dashboard view

document.addEventListener('DOMContentLoaded', () => {
const newCatInput = document.getElementById('newCategory');
const addCatBtn = document.getElementById('addCategory');
const categoriesContainer = document.getElementById('categories');

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
    cats[cat].forEach(tab => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = tab.url;
      a.textContent = tab.title;
      a.target = '_blank';
      li.appendChild(a);
      ul.appendChild(li);
    });
    card.appendChild(ul);

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

loadCategories();
});

