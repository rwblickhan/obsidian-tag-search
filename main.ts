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
	getGlobalSearchQuery(): string;
}

class TagSearchModal extends FuzzySuggestModal<string> {
	constructor(public app: App, private search: Search) {
		super(app);
		this.search = search;
	}

	onOpen(): void {
		super.onOpen();
		this.inputEl.addEventListener("keydown", (ev: KeyboardEvent) => {
			this.maybeChooseFirstSuggestion(ev);
		});
	}

	onClose(): void {
		super.onClose();
		this.inputEl.removeEventListener("keydown", (ev: KeyboardEvent) => {});
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
		const toggle = evt.ctrlKey || evt.metaKey;
		const negate = evt.shiftKey;

		const defaultTagSearchString = `tag:${item}`;
		const negatedTagSearchString = `-tag:${item}`;
		const tagSearchString = negate
			? negatedTagSearchString
			: defaultTagSearchString;

		if (toggle) {
			let query = this.search.getGlobalSearchQuery();
			let needsNewTagSearchString = false;

			if (negate && !query.includes(negatedTagSearchString)) {
				needsNewTagSearchString = true;
			}
			query = query.replaceAll(negatedTagSearchString, "");

			if (!negate && !query.includes(defaultTagSearchString)) {
				needsNewTagSearchString = true;
			}
			query = query.replaceAll(defaultTagSearchString, "");

			if (needsNewTagSearchString) {
				this.search.openGlobalSearch(
					query.concat(query.length === 0 ? "" : " ", tagSearchString)
				);
			} else {
				this.search.openGlobalSearch(query);
			}
		} else {
			this.search.openGlobalSearch(tagSearchString);
		}
	}

	private maybeChooseFirstSuggestion(evt: KeyboardEvent) {
		const toggle = evt.ctrlKey || evt.metaKey;
		const negate = evt.shiftKey;
		// "Enter"-only case is handled by FuzzySuggestModal already
		if (evt.key === "Enter" && (toggle || negate)) {
			const choice =
				this.resultContainerEl
					.getElementsByClassName("is-selected")
					.item(0)?.textContent ?? null;
			if (choice != null) {
				this.close();
				this.onChooseItem(choice, evt);
			}
		}
	}
}
