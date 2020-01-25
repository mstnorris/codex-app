// import CSSDebugger from "utils/CSSDebugger"
import ActionTypes from "./ActionTypes"
import Debugger from "./Debugger"
import onKeyDown from "./onKeyDown"
import React from "react"
import ReactDOM from "react-dom"
import stylex from "stylex"
import useTextareaEditor from "./TextareaEditorReducer"

import "./TextareaEditor.css"

const Context = React.createContext()

function TextareaComponents(props) {
	return props.components
}

// TODO:
//
// - Text components
// - Preview mode (rename from read-only mode)
// - Support for StatusBar
// - Parse Unicode horizontal spaces?
// - Parse emoji?
// - Preview components
// - HTML components
//
function TextareaEditor(props) {
	const reactDOM = React.useRef() // eslint-disable-line
	const pre      = React.useRef() // eslint-disable-line
	const span     = React.useRef() // eslint-disable-line
	const textarea = React.useRef() // eslint-disable-line

	const isPointerDown = React.useRef()

	// const [state, dispatch] = useTextareaEditor(props.initialValue)
	const [state, dispatch] = useTextareaEditor(`hello

\`\`\`hello\`\`\`

\`\`\`
hello
\`\`\`

hello`)

	// Set dynamic height textarea:
	React.useLayoutEffect(() => {
		const { height } = pre.current.getBoundingClientRect()
		textarea.current.style.height = `${height}px`
	}, [state.data])

	// Should render React components:
	React.useLayoutEffect(
		React.useCallback(() => {
			const t1 = Date.now()
			ReactDOM.render(<TextareaComponents components={state.components} />, reactDOM.current, () => {
				const t2 = Date.now()
				console.log(`render=${t2 - t1}`)
			})
		}, [state]),
		[state.shouldRenderComponents],
	)

	// Should render the DOM cursor:
	React.useLayoutEffect(
		React.useCallback(() => {
			textarea.current.setSelectionRange(state.pos1, state.pos2)
		}, [state]),
		[state.shouldRenderCursor],
	)

	// Update coords **after** updating pos1 and pos2:
	React.useEffect(
		React.useCallback(() => {
			// NOTE: Does not recurse because pos1 and pos2 do not
			// change.
			const rects = span.current.getClientRects()
			const start = rects[0]              // Top left; start
			const end = rects[rects.length - 1] // Bottom right; end
			const coords = {
				pos1: { x: start.x, y: start.y },
				pos2: { x: end.x + end.width, y: end.y + end.height },
				// y: end.y + (end.height || ...), // Fix for WebKit/Safari,
			}
			dispatch.select(state.pos1, state.pos2, coords)
		}, [state, dispatch]),
		[state.pos1, state.pos2],
	)

	React.useEffect(
		React.useCallback(() => {
			if (!state.isFocused) {
				// No-op
				return
			}
			const id = setInterval(() => {
				dispatch.storeUndo()
			}, 1e3)
			return () => {
				setTimeout(() => {
					clearInterval(id)
				}, 1e3)
			}
		}, [state, dispatch]),
		[state.isFocused],
	)

	const { Provider } = Context
	return (
		// <CSSDebugger>
			<Provider value={[state, dispatch]}>
				{/* transform: state.isFocused && "translateZ(0px)" */}
				<article style={stylex.parse("relative")}>
					{/* React DOM: */}
					<pre ref={reactDOM} style={stylex.parse("no-pointer-events")} />
					{/* pre: */}
					<div style={{ ...stylex.parse("absolute -x -y no-pointer-events"), visibility: "hidden" }}>
						<pre ref={pre} style={stylex.parse("c:blue -a:10%")}>
							{state.data.slice(0, state.pos1)}
							{/* span: */}
							<span ref={span}>
								{state.data.slice(state.pos1, state.pos2)}
							</span>
							{`${state.data.slice(state.pos2)}\n`}
						</pre>
					</div>
					{/* textarea: */}
					<div style={stylex.parse("absolute -x -y pointer-events")}>
						{React.createElement(
							"textarea",
							{
								ref: textarea,

								style: stylex.parse("c:red -a:1%"),

								value: state.data,

								onFocus: dispatch.focus,
								onBlur:  dispatch.blur,

								onSelect: e => {
									const { selectionStart, selectionEnd } = textarea.current
									dispatch.select(selectionStart, selectionEnd)
								},

								onPointerDown: e => {
									isPointerDown.current = true
								},

								// Covers WebKit and Gecko (used to be
								// selectionchange and onSelect):
								onPointerMove: e => {
									if (!isPointerDown.current) {
									// No-op
										return
									}
									const { selectionStart, selectionEnd } = textarea.current
									dispatch.select(selectionStart, selectionEnd)
								},

								onPointerUp: e => {
									isPointerDown.current = false
								},

								onKeyDown: e => {
									switch (true) {
									case onKeyDown.isTab(e):
										e.preventDefault()
										document.execCommand("insertText", false, "\t")
										return
									case onKeyDown.isUndo(e):
										e.preventDefault()
										dispatch.undo()
										return
									case onKeyDown.isRedo(e):
										e.preventDefault()
										dispatch.redo()
										return
									default:
									// No-op
										break
									}
								},

								// case "historyUndo":
								// 	e.preventDefault()
								// 	dispatch.undo()
								// 	return
								// case "historyRedo":
								// 	e.preventDefault()
								// 	dispatch.redo()
								// 	return

								onChange: e => {
									let actionType = ActionTypes.CHANGE
									switch (e.nativeEvent.inputType) {
									case "deleteByCut":
										actionType = ActionTypes.CUT
										break
									case "insertFromPaste":
										actionType = ActionTypes.PASTE
										break
									default:
									// No-op
										break
									}
									const { selectionStart, selectionEnd } = textarea.current
									dispatch.change(actionType, e.target.value, selectionStart, selectionEnd)
								},

								onCopy: dispatch.copy,

								// spellCheck: state.spellCheck,
								spellCheck: false,
							},
						)}
					</div>
				</article>
				{!props.debugger && (
					<Debugger state={state} />
				)}
			</Provider>
		// </CSSDebugger>
	)
}

export default TextareaEditor