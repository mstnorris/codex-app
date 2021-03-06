import * as utf8 from "utils/encoding/utf8"
import emojiTrie from "emoji-trie"
import Enum from "utils/Enum"
import parse from "./parser"
import useMethods from "use-methods"

import {
	newNodes,
	newPos,
} from "./helpers/constructors"

const ActionTypes = new Enum(
	"FOCUS",
	"BLUR",
	"SELECT",
	"INPUT",
	"CUT",
	"COPY",
	"PASTE",
	"UNDO",
	"REDO",
)

const initialState = {
	/*
	 * Preferences
	 */
	featureClassName: "", // Generated feature-* class name
	props: {              // User-defined preferences
		readOnly: false,    //
		stylesheet: "TYPE", //
		shortcuts: true,    //
		style: null,        //
	},
	/*
	 * Actions
	 */
	actionType: "",       // The type of the current action
	actionTimestamp: 0,   // The timestamp of the current action
	focused: false,       // Is the editor focused?
	selected: false,      // Is the editor selected?
	data: "",             // The plain text data
	body: null,           // The parsed nodes
	pos1: newPos(),       // The start cursor
	pos2: newPos(),       // The end cursor
	components: null,     // The React components
	reactDOM: null,       // The React-managed DOM
	history: {            //
		stack: null,        // The history state stack
		index: -1,          // The history state stack index
	},                    //
	resetPos: false,      // Did reset the cursors?
}

const reducer = state => ({
	/*
	 * Preferences
	 */
	// Registers user-defined props.
	registerProps(props) {
		Object.assign(state.props, props)
		this.generateFeatureClassName()
	},
	// Sets the stylesheet, e.g. TYPE or MONO.
	setStylesheet(stylesheet) {
		state.props.stylesheet = stylesheet
		this.generateFeatureClassName()
	},
	// Toggles read-only; hides markdown and prevents editing.
	toggleReadOnly() {
		state.props.readOnly = !state.props.readOnly
		this.generateFeatureClassName()
	},
	// Generates the feature-* etc. class name.
	generateFeatureClassName() {
		const classNames = []
		if (state.props.readOnly) {
			classNames.push("feature-read-only")
		}
		classNames.push(state.props.stylesheet === "TYPE" ? "feature-stylesheet-type" : "feature-stylesheet-mono")
		state.featureClassName = classNames.join(" ")
	},
	/*
	 * Actions
	 */
	registerAction(actionType) {
		// Do not register actions sooner than 200ms:
		const actionTimestamp = Date.now()
		if (actionType === ActionTypes.SELECT && actionTimestamp - state.actionTimestamp < 200) {
			// No-op
			return
		}
		Object.assign(state, { actionType, actionTimestamp })
	},
	// Focuses the editor.
	actionFocus() {
		this.registerAction(ActionTypes.FOCUS)
		state.focused = true
	},
	// Unfocuses (blurs) the editor.
	actionBlur() {
		this.registerAction(ActionTypes.BLUR)
		state.focused = false
	},
	// Selects from cursors pos1 to pos2.
	actionSelect(pos1, pos2) {
		this.registerAction(ActionTypes.SELECT)
		const selected = pos1.pos !== pos2.pos
		Object.assign(state, { selected, pos1, pos2 })
	},
	actionInput(nodes, atEnd, pos1, pos2) {
		// Create a new action:
		this.registerAction(ActionTypes.INPUT)
		if (!state.history.index && !state.resetPos) {
			Object.assign(state.history.stack[0], {
				pos1: state.pos1,
				pos2: state.pos2,
			})
			state.resetPos = true
		}
		this.dropRedos()
		// Update body:
		const key1 = nodes[0].key
		const index1 = state.body.findIndex(each => each.key === key1)
		if (index1 === -1) {
			throw new Error("FIXME")
		}
		const key2 = nodes[nodes.length - 1].key
		const index2 = !atEnd ? state.body.findIndex(each => each.key === key2) : state.body.length - 1
		if (index2 === -1) {
			throw new Error("FIXME")
		}
		state.body.splice(index1, (index2 + 1) - index1, ...nodes)
		// Update data, pos1, and pos2:
		const data = state.body.map(each => each.data).join("\n")
		Object.assign(state, { data, pos1, pos2 })
		this.render()
	},
	write(substr, dropL = 0, dropR = 0) {
		// Create a new action:
		this.registerAction(ActionTypes.INPUT)
		if (!state.history.index && !state.resetPos) {
			Object.assign(state.history.stack[0], {
				pos1: state.pos1,
				pos2: state.pos2,
			})
			state.resetPos = true
		}
		this.dropRedos()
		// Drop bytes (L):
		state.pos1.pos -= dropL
		while (dropL) {
			const bytesToStart = state.pos1.x
			if (dropL <= bytesToStart) {
				state.pos1.x -= dropL
				dropL = 0
				break // XOR
			}
			dropL -= bytesToStart + 1
			state.pos1.y--
			state.pos1.x = state.body[state.pos1.y].data.length
		}
		// Drop bytes (R):
		state.pos2.pos += dropR
		while (dropR) {
			const bytesToEnd = state.body[state.pos2.y].data.length - state.pos2.x
			if (dropR <= bytesToEnd) {
				state.pos2.x += dropR
				dropR = 0
				break // XOR
			}
			dropR -= bytesToEnd + 1
			state.pos2.y++
			state.pos2.x = 0 // Reset
		}
		// Parse the new nodes:
		const nodes = newNodes(substr)
		const startNode = state.body[state.pos1.y]
		const endNode = { ...state.body[state.pos2.y] } // Create a new reference
		// Start node:
		startNode.data = startNode.data.slice(0, state.pos1.x) + nodes[0].data
		state.body.splice(state.pos1.y + 1, state.pos2.y - state.pos1.y, ...nodes.slice(1))
		// End node:
		let node = startNode
		if (nodes.length > 1) {
			node = nodes[nodes.length - 1]
		}
		node.data += endNode.data.slice(state.pos2.x)
		// Update data, pos1, and pos2:
		const data = state.body.map(each => each.data).join("\n")
		const pos1 = { ...state.pos1, pos: state.pos1.pos + substr.length }
		const pos2 = { ...pos1 }
		Object.assign(state, { data, pos1, pos2 })
		this.render()
	},
	// Backspaces one character.
	backspaceChar() {
		let dropL = 0
		if (!state.selected && state.pos1.pos) { // Inverse
			const substr = state.data.slice(0, state.pos1.pos)
			const rune = emojiTrie.atEnd(substr) || utf8.atEnd(substr)
			dropL = rune.length
		}
		this.write("", dropL, 0)
	},
	// Backspaces one word.
	backspaceWord() {
		if (state.selected) {
			this.write("")
			return
		}
		// Iterate to a non-h. white space:
		let index = state.pos1.pos
		while (index) {
			const substr = state.data.slice(0, index)
			const rune = emojiTrie.atEnd(substr) || utf8.atEnd(substr)
			if (!rune || !utf8.isHWhiteSpace(rune)) {
				// No-op
				break
			}
			index -= rune.length
		}
		// Get the next rune:
		const substr = state.data.slice(0, index)
		const rune = emojiTrie.atEnd(substr) || utf8.atEnd(substr)
		// Iterate to an alphanumeric rune OR a non-alphanumeric
		// rune based on the next rune:
		if (rune && !utf8.isAlphanum(rune)) {
			// Iterate to an alphanumeric rune:
			while (index) {
				const substr = state.data.slice(0, index)
				const rune = emojiTrie.atEnd(substr) || utf8.atEnd(substr)
				if (!rune || utf8.isAlphanum(rune) || utf8.isWhiteSpace(rune)) {
					// No-op
					break
				}
				index -= rune.length
			}
		} else if (rune && utf8.isAlphanum(rune)) {
			// Iterate to a non-alphanumeric rune:
			while (index) {
				const substr = state.data.slice(0, index)
				const rune = emojiTrie.atEnd(substr) || utf8.atEnd(substr)
				if (!rune || !utf8.isAlphanum(rune) || utf8.isWhiteSpace(rune)) {
					// No-op
					break
				}
				index -= rune.length
			}
		}
		// Get the number of bytes to drop:
		let dropL = state.pos1.pos - index
		if (!dropL && index - 1 >= 0 && state.data[index - 1] === "\n") {
			dropL = 1
		}
		this.write("", dropL, 0)
	},
	// Backspaces one paragraph (does not discern EOL).
	backspaceLine() {
		if (state.selected) {
			this.write("")
			return
		}
		// Iterate to a v. white space rune:
		let index = state.pos1.pos
		while (index >= 0) {
			const substr = state.data.slice(0, index)
			const rune = emojiTrie.atEnd(substr) || utf8.atEnd(substr)
			if (!rune || utf8.isVWhiteSpace(rune)) {
				// No-op
				break
			}
			index -= rune.length
		}
		// Get the number of bytes to drop:
		let dropL = state.pos1.pos - index
		if (!dropL && index - 1 >= 0 && state.data[index - 1] === "\n") {
			dropL = 1
		}
		this.write("", dropL, 0)
	},
	// Backspaces one character (forwards).
	backspaceCharForwards() {
		let dropR = 0
		if (!state.selected && state.pos1.pos < state.data.length) { // Inverse
			const substr = state.data.slice(state.pos1.pos)
			const rune = emojiTrie.atStart(substr) || utf8.atStart(substr)
			dropR = rune.length
		}
		this.write("", 0, dropR)
	},
	// Backspaces one word (forwards).
	backspaceWordForwards() {
		if (state.selected) {
			this.write("")
			return
		}
		// Iterate to a non-h. white space:
		let index = state.pos1.pos
		while (index < state.data.length) {
			const substr = state.data.slice(index)
			const rune = emojiTrie.atStart(substr) || utf8.atStart(substr)
			if (!rune || !utf8.isHWhiteSpace(rune)) {
				// No-op
				break
			}
			index += rune.length
		}
		// Get the next rune:
		const substr = state.data.slice(index)
		const rune = emojiTrie.atStart(substr) || utf8.atStart(substr)
		// Iterate to an alphanumeric rune OR a non-alphanumeric
		// rune based on the next rune:
		if (rune && !utf8.isAlphanum(rune)) {
			// Iterate to an alphanumeric rune:
			while (index < state.data.length) {
				const substr = state.data.slice(index)
				const rune = emojiTrie.atStart(substr) || utf8.atStart(substr)
				if (!rune || utf8.isAlphanum(rune) || utf8.isWhiteSpace(rune)) {
					// No-op
					break
				}
				index += rune.length
			}
		} else if (rune && utf8.isAlphanum(rune)) {
			// Iterate to a non-alphanumeric rune:
			while (index < state.data.length) {
				const substr = state.data.slice(index)
				const rune = emojiTrie.atStart(substr) || utf8.atStart(substr)
				if (!rune || !utf8.isAlphanum(rune) || utf8.isWhiteSpace(rune)) {
					// No-op
					break
				}
				index += rune.length
			}
		}
		// Get the number of bytes to drop:
		let dropR = index - state.pos1.pos
		if (!dropR && index < state.data.length && state.data[index] === "\n") {
			dropR = 1
		}
		this.write("", 0, dropR)
	},
	// Inserts a tab character.
	tab() {
		this.write("\t")
	},
	// Inserts an EOL character.
	enter() {
		this.write("\n")
	},
	// (Self-explanatory)
	cut() {
		// NOTE: Inverse order because write sets actionType
		this.write("")
		this.registerAction(ActionTypes.CUT)
	},
	// (Self-explanatory)
	copy() {
		this.registerAction(ActionTypes.COPY)
	},
	// (Self-explanatory)
	paste(data) {
		// NOTE: Inverse order because write sets actionType
		this.write(data)
		this.registerAction(ActionTypes.PASTE)
	},
	// Stores the next undo state.
	storeUndo() {
		const undo = state.history.stack[state.history.index]
		if (undo.data.length === state.data.length && undo.data === state.data) {
			// No-op
			return
		}
		const { data, body, pos1, pos2 } = state
		state.history.stack.push({ data, body: body.map(each => ({ ...each })), pos1: { ...pos1 }, pos2: { ...pos2 } })
		state.history.index++
	},
	// Drops future undo states.
	dropRedos() {
		state.history.stack.splice(state.history.index + 1)
	},
	// (Self-explanatory)
	undo() {
		if (state.props.readOnly) {
			// No-op
			return
		}
		this.registerAction(ActionTypes.UNDO)
		if (state.history.index === 1 && state.resetPos) {
			state.resetPos = false
		}
		// Guard decrement:
		if (state.history.index) {
			state.history.index--
		}
		const undo = state.history.stack[state.history.index]
		Object.assign(state, undo)
		this.render()
	},
	// (Self-explanatory)
	redo() {
		if (state.props.readOnly) {
			// No-op
			return
		}
		this.registerAction(ActionTypes.REDO)
		if (state.history.index + 1 === state.history.stack.length) {
			// No-op
			return
		}
		state.history.index++
		const redo = state.history.stack[state.history.index]
		Object.assign(state, redo)
		this.render()
	},
	// Parses the data structure to React components.
	render() {
		state.components = parse(state.body)
	},
})

// Returns a lazy function.
//
// https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
function init(data) {
	const lazy = initialState => {
		const body = newNodes(data)
		const state = {
			...initialState,
			data,
			body,
			components: parse(body),
			reactDOM: document.createElement("div"),
			history: { ...initialState.history, stack: [{ data, body, pos1: newPos(), pos2: newPos() }], index: 0 },
		}
		return state
	}
	return lazy
}

function useEditor(data) {
	return useMethods(reducer, initialState, init(data))
}

export default useEditor
