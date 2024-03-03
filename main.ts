import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	defaultQuery: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	defaultQuery: '-Diary'
}

export default class DefaultQuery extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new DefaultQuerySettingTab(this.app, this));

		this.app.workspace.on('file-open', (file) => {
			if (file === null) { return; }
			// console.log(`File opened: ${file.path}`);
			const buttonShowSearchFilters = document.querySelectorAll('.workspace-leaf.mod-active div[aria-label="Show search filter"].clickable-icon.nav-action-button'); // .is-active
			const searchInputContainer = document.querySelector('.workspace-leaf.mod-active .search-input-container');
			if (searchInputContainer === null) { return; }

			searchInputContainer.setAttribute('style', '');
			const input = searchInputContainer.querySelector("input");
			if (input === null) { return; }
			if (input.value) { return; }
			input.value = this.settings.defaultQuery;
		});

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class DefaultQuerySettingTab extends PluginSettingTab {
	plugin: DefaultQuery;

	constructor(app: App, plugin: DefaultQuery) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Default query')
			// .setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('query')
				.setValue(this.plugin.settings.defaultQuery)
				.onChange(async (value) => {
					this.plugin.settings.defaultQuery = value;
					await this.plugin.saveSettings();
				}));
	}
}
