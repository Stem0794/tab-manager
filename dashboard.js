// Manage categories and tabs on dashboard view
import { getCategoryData, storageGet, storageSet } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const newCatInput = document.getElementById('newCategory');
  const addCatBtn = document.getElementById('addCategory');
  const categoriesContainer = document.getElementById('categories');
  const openTabsList = document.getElementById('openTabs');
  const darkToggle = document.getElementById('darkToggle');
  const themeColorInput = document.getElementById('themeColor');
  const exportBtn = document.getElementById('exportData');
  const importBtn = document.getElementById('importData');
  const importFileInput = document.getElementById('importFile');

  openTabsList.addEventListener('dragover', (e) => e.preventDefault());
  openTabsList.addEventListener('drop', (e) => {
    e.preventDefault();
    console.debug('[openTabsList drop]', {
      from: e.dataTransfer.getData('text/tab-source'),
    });
    const from = e.dataTransfer.getData('text/tab-source');
    if (from) {
      const [srcCat, srcIdx] = from.split(':');
      removeTabFromCategory(srcCat, Number(srcIdx));
    }
  });

  document.addEventListener('dragover', (e) => {
    if (!e.target.closest('.tab-list')) e.preventDefault();
  });

  document.addEventListener('drop', (e) => {
    console.debug('[document drop]', {
      target: e.target && e.target.className,
      from: e.dataTransfer.getData('text/tab-source'),
    });
    const from = e.dataTransfer.getData('text/tab-source');
    if (from && !e.target.closest('.tab-list')) {
      const [srcCat, srcIdx] = from.split(':');
      removeTabFromCategory(srcCat, Number(srcIdx));
    }
  });

  storageGet({ darkMode: false, themeColor: '#4A399D' }, (data) => {
    if (data.darkMode) document.body.classList.add('dark');
    darkToggle.checked = data.darkMode;
    document.documentElement.style.setProperty('--primary', data.themeColor);
    themeColorInput.value = data.themeColor;
  });

  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkToggle.checked);
    storageSet({ darkMode: darkToggle.checked });
  });

  themeColorInput.addEventListener('input', () => {
    document.documentElement.style.setProperty(
      '--primary',
      themeColorInput.value,
    );
    storageSet({ themeColor: themeColorInput.value });
  });

  function exportData() {
    storageGet({ categories: {}, categoryOrder: [] }, (data) => {
      const json = JSON.stringify(
        { categories: data.categories, categoryOrder: data.categoryOrder },
        null,
        2,
      );
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tab-manager-data.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    });
  }

  exportBtn.addEventListener('click', exportData);

  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (
          !obj ||
          typeof obj !== 'object' ||
          typeof obj.categories !== 'object' ||
          !Array.isArray(obj.categoryOrder)
        ) {
          throw new Error('Invalid data');
        }
        const merge = confirm(
          'Merge imported categories with existing ones?\nClick Cancel to replace.',
        );
        storageGet({ categories: {}, categoryOrder: [] }, (data) => {
          const cats = merge
            ? { ...data.categories, ...obj.categories }
            : obj.categories;
          const order = merge
            ? Array.from(new Set([...data.categoryOrder, ...obj.categoryOrder]))
            : obj.categoryOrder;
          storageSet({ categories: cats, categoryOrder: order }, () => {
            importFileInput.value = '';
            loadCategories();
          });
        });
      } catch (err) {
        alert('Failed to import data: ' + err.message);
        importFileInput.value = '';
      }
    };
    reader.readAsText(file);
  }

  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files[0];
    if (file) importData(file);
  });

  function getCategoryData(cats, cat) {
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

  // Load currently open tabs
  function loadOpenTabs() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const dashboardUrl = chrome.runtime.getURL('dashboard.html');
      openTabsList.innerHTML = '';
      tabs.forEach((tab) => {
        if (tab.url && tab.url.startsWith(dashboardUrl)) return;
        const li = document.createElement('li');
        const img = document.createElement('img');
        img.src = tab.favIconUrl || `chrome://favicon/${tab.url}`;
        img.className = 'favicon';
        img.alt = tab.title || tab.url;
        const span = document.createElement('span');
        span.textContent = tab.title || tab.url;
        li.append(img, span);
        li.draggable = true;
        li.addEventListener('dragstart', (e) => {
          console.debug('[open tab dragstart]', tab);
          e.dataTransfer.setData(
            'text/plain',
            JSON.stringify({
              url: tab.url,
              title: tab.title,
              favIconUrl: tab.favIconUrl,
            }),
          );
        });
        openTabsList.appendChild(li);
      });
    });
  }

  async function fetchFavicon(url) {
    try {
      const res = await fetch(
        `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
          url,
        )}`,
      );
      if (!res.ok) return '';
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      return '';
    }
  }

  // Add a tab record to a category
  function addTabToCategory(cat, tab) {
    console.debug('[addTabToCategory]', cat, tab);
    storageGet({ categories: {}, categoryOrder: [] }, async (data) => {
      const cats = data.categories;
      const order = data.categoryOrder;
      const catData = getCategoryData(cats, cat);
      if (!order.includes(cat)) order.push(cat);
      if (!catData.tabs.some((t) => t.url === tab.url)) {
        const favIconUrl = tab.favIconUrl || (await fetchFavicon(tab.url));
        catData.tabs.push({
          url: tab.url,
          title: tab.title || tab.url,
          favIconUrl,
        });
      }
      storageSet({ categories: cats, categoryOrder: order }, loadCategories);
    });
  }

  function renameTab(cat, index, title, url) {
    const idx = Number(index);
    storageGet({ categories: {} }, (data) => {
      const catData = getCategoryData(data.categories, cat);
      if (idx < 0 || idx >= catData.tabs.length) return;
      catData.tabs[idx].title = title;
      if (url) catData.tabs[idx].url = url;
      storageSet({ categories: data.categories }, loadCategories);
    });
  }

  function removeTabFromCategory(cat, index) {
    console.debug('[removeTabFromCategory]', cat, index);
    const idx = Number(index);
    storageGet({ categories: {} }, (data) => {
      const catData = getCategoryData(data.categories, cat);
      if (idx < 0 || idx >= catData.tabs.length) return;
      catData.tabs.splice(idx, 1);
      storageSet({ categories: data.categories }, loadCategories);
    });
  }

  // Load and render categories
  function loadCategories() {
    storageGet({ categories: {}, categoryOrder: [] }, (data) => {
      const cats = data.categories;
      const order = data.categoryOrder;
      const existingWidths = {};
      categoriesContainer.querySelectorAll('.category-card').forEach((c) => {
        const name = c.dataset.cat;
        if (name) existingWidths[name] = c.style.width;
      });
      categoriesContainer.innerHTML = '';
      const ordered = order
        .filter((c) => cats[c])
        .concat(Object.keys(cats).filter((c) => !order.includes(c)));
      ordered.forEach((cat) => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.dataset.cat = cat;
        const catData = getCategoryData(cats, cat);
        card.style.background = 'var(--card-bg)';
        card.style.width = existingWidths[cat] || '';
        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', cat);
        });
        card.addEventListener('dragover', (e) => e.preventDefault());
        card.addEventListener('drop', (e) => {
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
        title.textContent = cat;
        const editBtn = document.createElement('button');
        editBtn.textContent = '✎';
        editBtn.title = 'Edit category name';
        editBtn.onclick = () => renameCategory(cat);
        const delBtn = document.createElement('button');
        delBtn.textContent = '✕';
        delBtn.title = 'Delete category';
        delBtn.onclick = () => {
          deleteCategory(cat);
        };
        icon.onclick = () => updateCategoryIcon(cat);

        header.append(icon, title, editBtn, delBtn);
        card.append(header);

        // Tab list
        const ul = document.createElement('ul');
        ul.className = 'tab-list';
        ul.addEventListener('dragover', (e) => e.preventDefault());
        ul.addEventListener('drop', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.debug('[category drop]', {
            category: cat,
            plain: e.dataTransfer.getData('text/plain'),
            from: e.dataTransfer.getData('text/tab-source'),
            uri: e.dataTransfer.getData('text/uri-list'),
          });
          const plain = e.dataTransfer.getData('text/plain');
          const from = e.dataTransfer.getData('text/tab-source');
          const uri = e.dataTransfer.getData('text/uri-list');
          let tabData = null;
          if (plain) {
            try {
              const obj = JSON.parse(plain);
              if (obj && obj.url) tabData = obj;
            } catch (err) {
              // ignore JSON parse errors and treat as plain URL below
            }
          }
          const url = tabData ? null : uri || plain;
          if (!tabData && url) {
            const favIconUrl = await fetchFavicon(url);
            tabData = { url, title: url, favIconUrl };
          }
          console.debug('[category drop parsed]', { category: cat, tabData });
          if (tabData) addTabToCategory(cat, tabData);
          if (from) {
            const [srcCat, srcIdx] = from.split(':');
            if (srcCat && srcCat !== cat)
              removeTabFromCategory(srcCat, Number(srcIdx));
          }
        });
        catData.tabs.forEach((tab, idx) => {
          const li = document.createElement('li');
          li.draggable = true;
          li.addEventListener('dragstart', (e) => {
            console.debug('[category tab dragstart]', {
              category: cat,
              idx,
              tab,
            });
            e.dataTransfer.setData('text/plain', JSON.stringify(tab));
            e.dataTransfer.setData('text/tab-source', `${cat}:${idx}`);
          });
          const img = document.createElement('img');
          img.src = tab.favIconUrl || `chrome://favicon/${tab.url}`;
          img.className = 'favicon';
          img.alt = tab.title || tab.url;
          const a = document.createElement('a');
          a.href = tab.url;
          a.textContent = tab.title;
          // Open links within the dashboard tab instead of a new tab
          a.target = '_self';
          const rename = document.createElement('button');
          rename.textContent = '✎';
          rename.title = 'Rename tab';
          rename.className = 'rename-btn';
          rename.onclick = async (e) => {
            e.stopPropagation();
            const res = await showTabEditDialog(tab.title, tab.url);
            if (res && res.title.trim() && res.url.trim()) {
              renameTab(cat, idx, res.title.trim(), res.url.trim());
            }
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
        btn.onclick = async () => {
          const url = inp.value.trim();
          if (url) {
            const favIconUrl = await fetchFavicon(url);
            addTabToCategory(cat, { url, title: url, favIconUrl });
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
    storageGet({ categories: {}, categoryOrder: [] }, (data) => {
      const cats = data.categories;
      const order = data.categoryOrder;
      if (cats[cat]) {
        alert('Category already exists');
        return;
      }
      getCategoryData(cats, cat); // initialize with defaults
      if (!order.includes(cat)) order.push(cat);
      storageSet({ categories: cats, categoryOrder: order }, () => {
        newCatInput.value = '';
        loadOpenTabs();
        loadCategories();
      });
    });
  };

  // Delete category
  function deleteCategory(cat) {
    storageGet({ categories: {}, categoryOrder: [] }, (data) => {
      const cats = data.categories;
      const order = data.categoryOrder;
      delete cats[cat];
      const idx = order.indexOf(cat);
      if (idx > -1) order.splice(idx, 1);
      storageSet({ categories: cats, categoryOrder: order }, loadCategories);
    });
  }

  // Save current tabs
  function saveTabs(cat) {
    chrome.tabs.query({}, (tabs) => {
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
        storageSet({ categories: cats, categoryOrder: order }, loadCategories);
      });
    });
  }

  // Open all tabs in category
  function openCategory(cat) {
    storageGet({ categories: {} }, (data) => {
      const catData = getCategoryData(data.categories, cat);
      catData.tabs.forEach((tab) => chrome.tabs.create({ url: tab.url }));
    });
  }

  function reorderCategories(fromCat, toCat) {
    storageGet({ categoryOrder: [] }, (data) => {
      const order = data.categoryOrder;
      const fromIdx = order.indexOf(fromCat);
      const toIdx = order.indexOf(toCat);
      if (fromIdx === -1 || toIdx === -1) return;
      order.splice(toIdx, 0, order.splice(fromIdx, 1)[0]);
      storageSet({ categoryOrder: order }, loadCategories);
    });
  }

  async function showEmojiPicker(current) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'emoji-overlay';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = current || '';
      input.placeholder = '🙂';

      const button = document.createElement('button');
      button.textContent = 'OK';

      button.onclick = () => {
        overlay.remove();
        resolve(input.value || current);
      };

      overlay.addEventListener('click', (evt) => {
        if (evt.target === overlay) {
          overlay.remove();
          resolve(current);
        }
      });

      const container = document.createElement('div');
      container.className = 'emoji-picker';
      container.appendChild(input);
      container.appendChild(button);

      overlay.appendChild(container);
      document.body.appendChild(overlay);
      input.focus();
    });
  }

  async function showTabEditDialog(title, url) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'edit-overlay';

      const container = document.createElement('div');
      container.className = 'edit-dialog';

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.placeholder = 'Title';
      titleInput.value = title || '';

      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.placeholder = 'URL';
      urlInput.value = url || '';

      const button = document.createElement('button');
      button.textContent = 'OK';

      button.onclick = () => {
        overlay.remove();
        resolve({ title: titleInput.value, url: urlInput.value });
      };

      overlay.addEventListener('click', (evt) => {
        if (evt.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });

      container.appendChild(titleInput);
      container.appendChild(urlInput);
      container.appendChild(button);

      overlay.appendChild(container);
      document.body.appendChild(overlay);
      titleInput.focus();
    });
  }

  function renameCategory(oldName) {
    const input = prompt('Category name', oldName);
    if (input === null) return;
    const newName = input.trim();
    if (!newName || newName === oldName) return;
    storageGet({ categories: {}, categoryOrder: [] }, (data) => {
      const cats = data.categories;
      const order = data.categoryOrder;
      if (cats[newName]) {
        alert('Category already exists');
        return;
      }
      const catData = getCategoryData(cats, oldName);
      cats[newName] = catData;
      delete cats[oldName];
      const idx = order.indexOf(oldName);
      if (idx > -1) order[idx] = newName;
      storageSet({ categories: cats, categoryOrder: order }, loadCategories);
    });
  }

  function updateCategoryIcon(cat) {
    storageGet({ categories: {} }, async (data) => {
      const catData = getCategoryData(data.categories, cat);
      catData.icon = await showEmojiPicker(catData.icon);
      storageSet({ categories: data.categories }, loadCategories);
    });
  }

  // Context menu setup moved to background.js

  // Keep the open tabs list in sync as tabs are changed
  chrome.tabs.onCreated.addListener(loadOpenTabs);
  chrome.tabs.onRemoved.addListener(loadOpenTabs);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (
      changeInfo.status === 'complete' ||
      changeInfo.title ||
      changeInfo.url
    ) {
      loadOpenTabs();
    }
  });

  loadOpenTabs();
  loadCategories();
});
