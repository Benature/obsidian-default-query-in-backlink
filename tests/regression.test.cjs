const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');

class Plugin {
	constructor(app) {
		this.app = app;
	}
	addSettingTab() { }
	registerEvent() { }
	registerInterval() { }
}
class PluginSettingTab {
	constructor(app, plugin) {
		this.app = app;
		this.plugin = plugin;
	}
}

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'obsidian') {
		return {
			Plugin,
			PluginSettingTab,
			MarkdownView: class { },
			Setting: class { },
			Notice: class { },
		};
	}
	return originalLoad.call(this, request, parent, isMain);
};
const { default: DefaultQuery } = require('../main.js');
Module._load = originalLoad;

test('#4: file-open restores the remembered query instead of replacing it with the default', async (t) => {
	const callbacks = {};
	const applied = [];
	const remembered = {
		searchQuery: { query: 'path:Projects' },
		sortOrder: 'byModifiedTime',
		collapseAll: true,
		extraContext: true,
		unlinkedCollapsed: false,
	};
	const defaultState = {
		searchQuery: { query: '-path:Diary' },
		sortOrder: 'alphabetical',
		collapseAll: false,
		extraContext: false,
		unlinkedCollapsed: false,
	};
	let currentPath = 'previous.md';
	const app = {
		workspace: {
			on(event, callback) {
				callbacks[event] = callback;
				return { event, callback };
			},
			getActiveFile: () => ({ path: currentPath }),
		},
		vault: {
			on() { },
		},
	};
	const originalWindow = global.window;
	global.window = { setInterval: () => 1 };
	t.after(() => {
		global.window = originalWindow;
	});

	const plugin = new DefaultQuery(app);
	let settingTab;
	plugin.addSettingTab = (tab) => { settingTab = tab; };
	plugin.loadSettings = async () => {
		plugin.settings = {
			defaultState,
			rememberSettings: {
				dbFileName: 'remember-backlink.json',
				saveTimer: 1000,
				checkTimer: 1000,
				rememberBacklinkNav: true,
			},
		};
	};
	plugin.readDb = async () => ({ 'note.md': remembered });
	plugin.setEphemeralState = (state) => applied.push(state);

	await plugin.onload();
	assert.equal(settingTab.getSettingDefinitions().length, 3, 'settings use the declarative API');
	assert.deepEqual(applied, [defaultState], 'a file without remembered state uses the default');
	applied.length = 0;

	let scheduled;
	global.window.setTimeout = (callback, delay) => {
		scheduled = { callback, delay };
		return 1;
	};
	currentPath = 'note.md';
	callbacks['file-open']({ path: currentPath });
	assert.equal(scheduled.delay, 100);
	scheduled.callback();

	assert.deepEqual(applied, [remembered]);

	let updates = 0;
	settingTab.update = () => { updates += 1; };
	plugin.saveSettings = async () => { };
	await settingTab.setControlValue('rememberBacklinkNav', false);
	assert.equal(settingTab.getControlValue('rememberBacklinkNav'), false);
	assert.equal(updates, 1, 'conditional settings refresh after mutation');
});
