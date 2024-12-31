import { StateField, Transaction } from "@codemirror/state";
import {
	type EditorView,
	type PluginValue,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view";
import type FastStatsLib from "./lib";

export const pluginField = StateField.define<FastStatsLib | null>({
	create() {
		return null;
	},
	update(state) {
		return state;
	},
});

class StatusBarEditorPlugin implements PluginValue {
	view: EditorView;

	constructor(view: EditorView) {
		this.view = view;
	}

	update(update: ViewUpdate): void {
		const tr = update.transactions[0];

		if (!tr) return;

		const plugin = update.view.state.field(pluginField);

		// When selecting text with Shift+Home the userEventType is undefined.
		// This is probably a bug in codemirror, for the time being doing an explict check
		// for the type allows us to update the stats for the selection.
		const userEventTypeUndefined =
			tr.annotation(Transaction.userEvent) === undefined;

		if (
			(tr.isUserEvent("select") || userEventTypeUndefined) &&
			tr.newSelection.ranges[0].from !== tr.newSelection.ranges[0].to
		) {
			let text = "";
			const selection = tr.newSelection.main;
			const textIter = tr.newDoc.iterRange(selection.from, selection.to);
			while (!textIter.done) {
				text = text + textIter.next().value;
			}
			plugin?.debounceChange(text);
		} else if (
			tr.isUserEvent("input") ||
			tr.isUserEvent("delete") ||
			tr.isUserEvent("move") ||
			tr.isUserEvent("undo") ||
			tr.isUserEvent("redo") ||
			tr.isUserEvent("select")
		) {
			const textIter = tr.newDoc.iter();
			let text = "";
			while (!textIter.done) {
				text = text + textIter.next().value;
			}
			if (tr.docChanged) plugin?.debounceChange(text);
		}
	}

	destroy() {}
}

export const statusBarEditorPlugin = ViewPlugin.fromClass(
	StatusBarEditorPlugin,
);
