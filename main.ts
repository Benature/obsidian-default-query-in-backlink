import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile } from 'obsidian';


enum SortOrderType {
	alphabetical = "alphabetical",
	alphabeticalReverse = "alphabeticalReverse",
	byModifiedTime = "byModifiedTime",
	byModifiedTimeReverse = "byModifiedTimeReverse",
	byCreatedTime = "byCreatedTime",
	byCreatedTimeReverse = "byCreatedTimeReverse"
}
interface DefaultQuerySettings {
	defaultState: EphemeralState;
	dbFileName: string;
	saveTimer: number;
	// delayAfterFileOpening: number;
	rememberBacklinkNav: boolean;
}

const DEFAULT_SETTINGS: DefaultQuerySettings = {
	defaultState: {
		searchQuery: {
			query: '-path:Diary',
		},
		sortOrder: SortOrderType.alphabetical,
		collapseAll: false,
		extraContext: false,
	},
	dbFileName: '',
	saveTimer: 1000,
	// delayAfterFileOpening: 1000,
	rememberBacklinkNav: false,
}

interface EphemeralState {
	searchQuery: {
		query: string;
	}
	sortOrder: SortOrderType,
	collapseAll: boolean;
	extraContext: boolean;
}


export default class DefaultQuery extends Plugin {
	settings: DefaultQuerySettings;
	lastDefaultQuery: string[];

	// remember backlink nav buttons
	db: { [file_path: string]: EphemeralState };
	lastSavedDb: { [file_path: string]: EphemeralState };
	lastEphemeralState: EphemeralState;
	lastLoadedFileName: string;
	loadingFile = false;

	setSortOrder(t: SortOrderType) {
		// @ts-ignore
		const backlinks = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf.view.backlinks;
		if (backlinks.backlinkDom.sortOrder === t) { return; }

		const backlinkDom = backlinks.backlinkDom;
		const unlinkedDom = backlinks.unlinkedDom;

		backlinkDom.sortOrder = t;
		unlinkedDom.sortOrder = t;
		backlinkDom.changed();
		unlinkedDom.changed();
		// backlinkDom.toggle();
		this.app.workspace.requestSaveLayout()
	}

	setQuery(query: string, useEphemeralState?: boolean): void {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeLeaf === null) { return; }

		// @ts-ignore
		const backlinks = activeLeaf.leaf.view.backlinks;

		// @ts-ignore
		// const backlinksEl = activeLeaf.leaf.view.backlinksEl;

		const searchInputContainer = document.querySelector('.workspace-leaf.mod-active .search-input-container');
		if (searchInputContainer === null) { return; }

		// Show the search input
		let style = searchInputContainer.getAttribute('style') as string;
		style = style.replace(/display:\s?none;?/g, '');
		searchInputContainer.setAttribute('style', style);

		// Set the default query
		const input = searchInputContainer.querySelector("input");
		if (input === null) { return; }

		if (useEphemeralState) {
			if (input.value == query) { return; }
		} else {
			// preserve the custom query, but replace one default query
			if (input.value && input.value != this.lastDefaultQuery[0]) { return; }
		}
		// overwrite query
		// input.value = this.settings.defaultQuery;
		input.value = query;
		this.resetLastDefaultQuery();

		// Simulate a user input event to trigger the search
		const eventBlankInput = new InputEvent('input', {
			'bubbles': true,
			'cancelable': true,
		});
		input.dispatchEvent(eventBlankInput);
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new DefaultQuerySettingTab(this.app, this));
		this.resetLastDefaultQuery();

		try {
			this.db = await this.readDb();
			this.lastSavedDb = await this.readDb();
		} catch (e) {
			console.error(
				"Default Backlink plugin can\'t read database: " + e
			);
			this.db = {};
			this.lastSavedDb = {};
		}

		this.registerEvent(this.app.workspace.on('file-open', (file) => {
			if (file === null) { return; }

			let st: EphemeralState | null = this.settings.defaultState;
			if (this.settings.rememberBacklinkNav) {
				st = null;
			}
			setTimeout(() => {
				this.restoreEphemeralState(st);
				// this.setQuery(this.settings.defaultState.searchQuery.query);
			}, 100);

		}));

		this.registerEvent(
			this.app.workspace.on('quit', () => { this.writeDb(this.db) }),
		);


		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => this.renameFile(file, oldPath)),
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => this.deleteFile(file)),
		);

		this.registerInterval(
			window.setInterval(() => this.checkEphemeralStateChanged(), 1000)
		);

		this.registerInterval(
			window.setInterval(() => this.writeDb(this.db), this.settings.saveTimer)
		);

		this.restoreEphemeralState();
	}



	renameFile(file: TAbstractFile, oldPath: string) {
		let newName = file.path;
		let oldName = oldPath;
		this.db[newName] = this.db[oldName];
		delete this.db[oldName];
	}

	deleteFile(file: TAbstractFile) {
		let fileName = file.path;
		delete this.db[fileName];
	}

	checkEphemeralStateChanged() {
		let fileName = this.app.workspace.getActiveFile()?.path;

		//waiting for load new file
		if (!fileName || !this.lastLoadedFileName || fileName != this.lastLoadedFileName || this.loadingFile)
			return;

		let st = this.getEphemeralState();
		if (st == null) { // fail to get state
			return;
		}

		if (!this.lastEphemeralState)
			this.lastEphemeralState = st;

		if (!this.isEphemeralStatesEquals(st, this.lastEphemeralState)) {
			this.saveEphemeralState(st);
			this.lastEphemeralState = st;
		}
	}

	isEphemeralStatesEquals(state1: EphemeralState, state2: EphemeralState): boolean {
		return (state1.searchQuery && state2.searchQuery &&
			state1.searchQuery.query === state2.searchQuery.query &&
			state1.sortOrder === state2.sortOrder &&
			state1.collapseAll === state2.collapseAll &&
			state1.extraContext === state2.extraContext
		);
	}

	async saveEphemeralState(st: EphemeralState) {
		let fileName = this.app.workspace.getActiveFile()?.path;
		if (fileName && fileName == this.lastLoadedFileName) { //do not save if file changed or was not loaded
			this.db[fileName] = st;
		}
	}


	async restoreEphemeralState(specificState: EphemeralState | null = null) {
		let fileName = this.app.workspace.getActiveFile()?.path;

		if (fileName == undefined) { return; }

		if (fileName && this.loadingFile && this.lastLoadedFileName == fileName) //if already started loading
			return;

		let isSet = false;
		this.loadingFile = true;

		if (this.lastLoadedFileName != fileName) {
			this.lastEphemeralState = {} as EphemeralState;
			this.lastLoadedFileName = fileName;

			if (fileName) {
				let st = this.db[fileName];
				if (specificState != null) {
					st = specificState;
				}
				if (st) {
					this.setEphemeralState(st);
					this.lastEphemeralState = st;
					isSet = true;
				}
			}
		}

		this.loadingFile = false;

		// not set EphemeralState, then it may be a new file, set a default state
		if (!isSet) {
			this.setEphemeralState(this.settings.defaultState);
		}
	}

	async readDb(): Promise<{ [file_path: string]: EphemeralState; }> {
		let db: { [file_path: string]: EphemeralState; } = {}

		if (await this.app.vault.adapter.exists(this.settings.dbFileName)) {
			let data = await this.app.vault.adapter.read(this.settings.dbFileName);
			db = JSON.parse(data);
		}

		return db;
	}

	async writeDb(db: { [file_path: string]: EphemeralState; }) {
		//create folder for db file if not exist
		let newParentFolder = this.settings.dbFileName.substring(0, this.settings.dbFileName.lastIndexOf("/"));
		if (!(await this.app.vault.adapter.exists(newParentFolder)))
			this.app.vault.adapter.mkdir(newParentFolder);

		if (JSON.stringify(this.db) !== JSON.stringify(this.lastSavedDb)) {
			this.app.vault.adapter.write(
				this.settings.dbFileName,
				JSON.stringify(db)
			);
			this.lastSavedDb = JSON.parse(JSON.stringify(db));
		}
	}



	getEphemeralState(): EphemeralState | null {

		let state: EphemeralState = { searchQuery: { query: "" } } as EphemeralState;
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		// @ts-ignore
		const backlinks = activeLeaf?.leaf.view.backlinks;
		if (backlinks == undefined) {
			return null;
		}

		state.sortOrder = backlinks.backlinkDom.sortOrder;
		state.collapseAll = backlinks.collapseAll;
		state.extraContext = backlinks.extraContext;
		if (backlinks.searchQuery) {
			state.searchQuery.query = backlinks.searchQuery.query;
		} else {
			state.searchQuery.query = "";
		}
		return state;
	}

	setEphemeralState(state: EphemeralState) {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeLeaf === null) { return; }

		// @ts-ignore
		const backlinks = activeLeaf?.leaf.view.backlinks;

		this.setQuery(state.searchQuery.query, true);
		this.setSortOrder(state.sortOrder);
		if (state.collapseAll != backlinks.collapseAll) {
			backlinks.setCollapseAll(state.collapseAll);
		}
		if (state.extraContext != backlinks.extraContext) {
			backlinks.setExtraContext(state.extraContext);
		}
	}

	resetLastDefaultQuery() {
		this.lastDefaultQuery = [this.settings.defaultState.searchQuery.query];
	}

	onunload() {
	}

	async loadSettings() {
		const overwriteDefaultSettings = {
			dbFileName: this.manifest.dir + "/" + "remember-backlink.json"
		};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, overwriteDefaultSettings, await this.loadData());

		// to be deprecated: repair deprecation setting
		// @ts-ignore
		if (this.settings.defaultQuery) {
			// @ts-ignore
			this.settings.defaultState.searchQuery.query = this.settings.defaultQuery;
			await this.saveSettings();
		}
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
			.setDesc('The query will be automatically added if the search input is empty.')
			.addText(text => text
				.setPlaceholder('query')
				.setValue(this.plugin.settings.defaultState.searchQuery.query)
				.onChange(async (value) => {
					this.plugin.lastDefaultQuery.push(this.plugin.settings.defaultState.searchQuery.query);
					this.plugin.settings.defaultState.searchQuery.query = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Remove backlinks navigation")
			// .setDesc("for OCR case")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.rememberBacklinkNav)
					.onChange(async (value) => {
						this.plugin.settings.rememberBacklinkNav = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default query')
			.setDesc('The query will be automatically added if the search input is empty.')
			.addText(text => text
				.setPlaceholder('query')
				.setValue(this.plugin.settings.saveTimer.toString())
				.onChange(async (value) => {
					let v = Number(value);
					if (isNaN(v)) {
						new Notice("Please enter a valid number for save timer.");
						return;
					}
					this.plugin.settings.saveTimer = v;
					await this.plugin.saveSettings();
				}));
	}
}
