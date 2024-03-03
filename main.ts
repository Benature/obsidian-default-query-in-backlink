import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MyPluginSettings {
	defaultQuery: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	defaultQuery: '-path:Diary'
}

export default class DefaultQuery extends Plugin {
	settings: MyPluginSettings;
	lastDefaultQuery: string[];

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new DefaultQuerySettingTab(this.app, this));
		this.resetLastDefaultQuery();

		this.app.workspace.on('file-open', (file) => {
			if (file === null) { return; }
			const searchInputContainer = document.querySelector('.workspace-leaf.mod-active .search-input-container');
			if (searchInputContainer === null) { return; }

			// Show the search input
			let style = searchInputContainer.getAttribute('style') as string;
			style = style.replace(/display:\s?none;?/g, '');
			searchInputContainer.setAttribute('style', style);

			// Set the default query
			const input = searchInputContainer.querySelector("input");
			if (input === null) { return; }
			// preserve the custom query, but replace one default query
			if (input.value && input.value != this.lastDefaultQuery[0]) {
				return;
			}
			this.resetLastDefaultQuery();
			input.value = this.settings.defaultQuery;

			// Simulate a user input event to trigger the search
			var eventBlankInput = new InputEvent('input', {
				'bubbles': true,
				'cancelable': true,
			});
			input.dispatchEvent(eventBlankInput);
		});
	}

	resetLastDefaultQuery() {
		this.lastDefaultQuery = [this.settings.defaultQuery];
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
					this.plugin.lastDefaultQuery.push(this.plugin.settings.defaultQuery);
					this.plugin.settings.defaultQuery = value;
					await this.plugin.saveSettings();
				}));
	}
}
