import { App, MarkdownView, Plugin, PluginSettingTab, SettingDefinitionItem, TAbstractFile } from 'obsidian';


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
	rememberSettings: {
		dbFileName: string;
		saveTimer: number;
		checkTimer: number;
		rememberBacklinkNav: boolean;
		// delayAfterFileOpening: number;
	}
}

const DEFAULT_SETTINGS: DefaultQuerySettings = {
	defaultState: {
		searchQuery: {
			query: '-path:Diary',
		},
		sortOrder: SortOrderType.alphabetical,
		collapseAll: false,
		extraContext: false,
		unlinkedCollapsed: false,
	},
	rememberSettings: {
		dbFileName: '',
		saveTimer: 1000,
		checkTimer: 1000,
		// delayAfterFileOpening: 1000,
		rememberBacklinkNav: false,
	}
}

interface EphemeralState {
	searchQuery: {
		query: string;
	}
	sortOrder: SortOrderType,
	collapseAll: boolean;
	extraContext: boolean;
	unlinkedCollapsed: boolean;
}


export default class DefaultQuery extends Plugin {
	settings: DefaultQuerySettings;
	lastDefaultQuery: string[];

	// remember backlink nav buttons
	// remember logic credits go to https://github.com/dy-sh/obsidian-remember-cursor-position
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

		const searchInputContainer = activeDocument.querySelector('.workspace-leaf.mod-active .search-input-container');
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
				"Default Backlink plugin can't read database: " + String(e)
			);
			this.db = {};
			this.lastSavedDb = {};
		}

		this.registerEvent(this.app.workspace.on('file-open', (file) => {
			if (file === null) { return; }

			window.setTimeout(() => {
				this.restoreEphemeralState();
			}, 100);

		}));

		this.registerEvent(
			this.app.workspace.on('quit', () => { void this.writeDb(this.db) }),
		);


		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => this.renameFile(file, oldPath)),
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => this.deleteFile(file)),
		);

		this.registerInterval(
			window.setInterval(() => this.checkEphemeralStateChanged(), this.settings.rememberSettings.checkTimer)
		);

		this.registerInterval(
			window.setInterval(() => { void this.writeDb(this.db) }, this.settings.rememberSettings.saveTimer)
		);

		this.restoreEphemeralState();
	}



	renameFile(file: TAbstractFile, oldPath: string) {
		const newName = file.path;
		const oldName = oldPath;
		this.db[newName] = this.db[oldName];
		delete this.db[oldName];
	}

	deleteFile(file: TAbstractFile) {
		const fileName = file.path;
		delete this.db[fileName];
	}

	checkEphemeralStateChanged() {
		const fileName = this.app.workspace.getActiveFile()?.path;

		//waiting for load new file
		if (!fileName || !this.lastLoadedFileName || fileName != this.lastLoadedFileName || this.loadingFile)
			return;

		const st = this.getEphemeralState();
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

	saveEphemeralState(st: EphemeralState) {
		const fileName = this.app.workspace.getActiveFile()?.path;
		if (fileName && fileName == this.lastLoadedFileName) { //do not save if file changed or was not loaded
			this.db[fileName] = st;
		}
	}


	restoreEphemeralState(specificState: EphemeralState | null = null) {
		let isSet = false;
		if (this.settings.rememberSettings.rememberBacklinkNav) {
			const fileName = this.app.workspace.getActiveFile()?.path;

			if (fileName == undefined) { return; }

			if (fileName && this.loadingFile && this.lastLoadedFileName == fileName) //if already started loading
				return;

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
		}

		// not set EphemeralState, then it may be a new file, set a default state
		if (!isSet) {
			this.setEphemeralState(this.settings.defaultState);
		}
	}

	async readDb(): Promise<{ [file_path: string]: EphemeralState; }> {
		let db: { [file_path: string]: EphemeralState; } = {}

		const dbFileName = this.settings.rememberSettings.dbFileName;
		if (dbFileName === "") {
			this.settings.rememberSettings.dbFileName = this.manifest.dir + "/" + "remember-backlink.json";
			await this.saveSettings();
		}

		if (await this.app.vault.adapter.exists(dbFileName)) {
			const data = await this.app.vault.adapter.read(dbFileName);
			db = JSON.parse(data);
		}

		return db;
	}

	async writeDb(db: { [file_path: string]: EphemeralState; }) {
		//create folder for db file if not exist
		const newParentFolder = this.settings.rememberSettings.dbFileName.substring(0, this.settings.rememberSettings.dbFileName.lastIndexOf("/"));
		if (!(await this.app.vault.adapter.exists(newParentFolder)))
			await this.app.vault.adapter.mkdir(newParentFolder);

		if (JSON.stringify(this.db) !== JSON.stringify(this.lastSavedDb)) {
			await this.app.vault.adapter.write(
				this.settings.rememberSettings.dbFileName,
				JSON.stringify(db)
			);
			this.lastSavedDb = JSON.parse(JSON.stringify(db));
		}
	}



	getEphemeralState(): EphemeralState | null {

		const state: EphemeralState = { searchQuery: { query: "" } } as EphemeralState;
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		// @ts-ignore
		const backlinks = activeLeaf?.leaf.view.backlinks;
		if (backlinks == undefined) {
			return null;
		}

		state.sortOrder = backlinks.backlinkDom.sortOrder;
		state.collapseAll = backlinks.collapseAll;
		state.extraContext = backlinks.extraContext;
		state.unlinkedCollapsed = backlinks.unlinkedCollapsed;
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
		if (state.collapseAll != backlinks.collapseAll)
			backlinks.setCollapseAll(state.collapseAll);

		if (state.extraContext != backlinks.extraContext)
			backlinks.setExtraContext(state.extraContext);

		if (state.unlinkedCollapsed == backlinks.unlinkedCollapsed)
			backlinks.setUnlinkedCollapsed(!state.unlinkedCollapsed, !0); // false to unclasped unlinked
	}

	resetLastDefaultQuery() {
		this.lastDefaultQuery = [this.settings.defaultState.searchQuery.query];
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

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

	getSettingDefinitions(): SettingDefinitionItem[] {
		const rememberBacklinkNav = () => this.plugin.settings.rememberSettings.rememberBacklinkNav;
		return [
			{
				type: "group",
				heading: "Default backlinks Navigation",
				items: [
					{
						name: "Default query",
						desc: rememberBacklinkNav()
							? "Default query will be added only when the note is not remembered."
							: "The query will be automatically added if the search input is empty.",
						control: { type: "text", key: "defaultQuery", placeholder: "query", defaultValue: "-path:Diary" },
					},
					{
						name: "Collapse results",
						control: { type: "toggle", key: "collapseAll", defaultValue: false },
					},
					{
						name: "Show more context",
						control: { type: "toggle", key: "extraContext", defaultValue: false },
					},
					{
						name: "Sort order",
						control: {
							type: "dropdown",
							key: "sortOrder",
							defaultValue: SortOrderType.alphabetical,
							options: {
								[SortOrderType.alphabetical]: "File name (A to Z)",
								[SortOrderType.alphabeticalReverse]: "File name (Z to A)",
								[SortOrderType.byModifiedTime]: "Modified time (new to old)",
								[SortOrderType.byModifiedTimeReverse]: "Modified time (old to new)",
								[SortOrderType.byCreatedTime]: "Created time (new to old)",
								[SortOrderType.byCreatedTimeReverse]: "Created time (old to new)",
							},
						},
					},
					{
						name: "Expand Unlinked mentions",
						control: { type: "toggle", key: "unlinkedCollapsed", defaultValue: false },
					},
				],
			},
			{
				type: "group",
				heading: "Remember backlinks display",
				items: [
					{
						name: "Remember bottom backlink panel display settings for each file",
						desc: "Remember for each file",
						control: { type: "toggle", key: "rememberBacklinkNav", defaultValue: false },
					},
					{
						name: "Save timer (ms)",
						desc: "The interval to save current state to database.",
						visible: rememberBacklinkNav,
						control: { type: "number", key: "saveTimer", defaultValue: 1000, min: 0 },
					},
					{
						name: "Check timer (ms)",
						desc: "The interval to check the state.",
						visible: rememberBacklinkNav,
						control: { type: "number", key: "checkTimer", defaultValue: 1000, min: 0 },
					},
				],
			},
			{
				name: "Known issue",
				visible: () => this.plugin.settings.defaultState.sortOrder !== SortOrderType.alphabetical || rememberBacklinkNav(),
				render: (setting) => {
					setting.setDesc("The check mark in the menu of Change sort order cannot be updated. The selected sort order still takes effect.");
					setting.settingEl.addClass("default-query-in-backlink-note");
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		switch (key) {
			case "defaultQuery": return this.plugin.settings.defaultState.searchQuery.query;
			case "collapseAll": return this.plugin.settings.defaultState.collapseAll;
			case "extraContext": return this.plugin.settings.defaultState.extraContext;
			case "sortOrder": return this.plugin.settings.defaultState.sortOrder;
			case "unlinkedCollapsed": return this.plugin.settings.defaultState.unlinkedCollapsed;
			case "rememberBacklinkNav": return this.plugin.settings.rememberSettings.rememberBacklinkNav;
			case "saveTimer": return this.plugin.settings.rememberSettings.saveTimer;
			case "checkTimer": return this.plugin.settings.rememberSettings.checkTimer;
			default: return undefined;
		}
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		let refresh = false;
		switch (key) {
			case "defaultQuery":
				this.plugin.lastDefaultQuery.push(this.plugin.settings.defaultState.searchQuery.query);
				this.plugin.settings.defaultState.searchQuery.query = value as string;
				break;
			case "collapseAll":
				this.plugin.settings.defaultState.collapseAll = value as boolean;
				break;
			case "extraContext":
				this.plugin.settings.defaultState.extraContext = value as boolean;
				break;
			case "sortOrder":
				this.plugin.settings.defaultState.sortOrder = value as SortOrderType;
				refresh = true;
				break;
			case "unlinkedCollapsed":
				this.plugin.settings.defaultState.unlinkedCollapsed = value as boolean;
				break;
			case "rememberBacklinkNav":
				this.plugin.settings.rememberSettings.rememberBacklinkNav = value as boolean;
				refresh = true;
				break;
			case "saveTimer":
				this.plugin.settings.rememberSettings.saveTimer = value as number;
				break;
			case "checkTimer":
				this.plugin.settings.rememberSettings.checkTimer = value as number;
				break;
			default:
				return;
		}
		await this.plugin.saveSettings();
		if (refresh) {
			this.update();
		}
	}
}
