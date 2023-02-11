import { App, Plugin, FuzzySuggestModal, getAllTags, Notice } from "obsidian";

export default class TagSearchPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "open-tag-search",
			name: "Open tag search",
			callback: () => {
				/* eslint-disable @typescript-eslint/no-explicit-any */
				const searchPlugin = (
					this.app as any
				).internalPlugins.getPluginById("global-search");
				/* eslint-enable @typescript-eslint/no-explicit-any */
				const search = searchPlugin && searchPlugin.instance;

				if (searchPlugin && searchPlugin.instance) {
					new TagSearchModal(this.app, search).open();
				} else {
					new Notice("Please enable the search core plugin!");
				}
			},
		});
	}

	onunload() {}
}

interface Search {
	openGlobalSearch(_: string): void;
}

class TagSearchModal extends FuzzySuggestModal<string> {
	search: Search;

	constructor(app: App, search: Search) {
		super(app);
		this.search = search;
	}

	getItems(): string[] {
		const files = app.vault.getMarkdownFiles();
		const itemSet = new Set<string>();
		for (const file of files) {
			const cache = app.metadataCache.getCache(file.path);
			if (cache === null) {
				continue;
			}
			getAllTags(cache)?.forEach((tag) => {
				itemSet.add(tag);
			});
		}
		return Array.from(itemSet);
	}

	getItemText(item: string): string {
		return item;
	}

	onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
		this.search.openGlobalSearch(`tag:${item}`);
	}
}
