// import detect from "./detect"
import DebugEditor from "./DebugEditor"
import ErrorBoundary from "./ErrorBoundary"
import React from "react"
import scrollIntoViewIfNeeded from "./scrollIntoViewIfNeeded"
import stylex from "stylex"
import traverseDOM from "./traverseDOM"
import useTestEditor from "./TestEditorReducer"

import "./editor.css"

const TestEditor = stylex.Unstyleable(props => {
	const ref = React.useRef()

	const [state, dispatch] = useTestEditor(`# Hello, world!

Hello, world!

Hello, world!`)

	// Render components:
	React.useLayoutEffect(
		React.useCallback(() => {
			if (!state.isFocused) {
				// No-op.
				return
			}
			dispatch.render()
		}, [dispatch, state]),
		[state.shouldRenderComponents],
	)

	// Render cursor:
	React.useLayoutEffect(
		React.useCallback(() => {
			if (!state.isFocused) {
				// No-op.
				return
			}
			const range = document.createRange()
			const { node, offset } = traverseDOM.computeNodeFromPos(ref.current, state.pos1.pos, state.pos2.pos)
			range.setStart(node, offset)
			range.collapse()
			const selection = document.getSelection()
			selection.removeAllRanges()
			selection.addRange(range)
			// NOTE (1): Use `Math.floor` to mimic Chrome.
			// NOTE (2): Use `... - 1` to prevent jumping.
			const buffer = Math.floor(19 * 1.5) - 1
			scrollIntoViewIfNeeded({ top: (props.nav || 0) + buffer, bottom: buffer })
		}, [props, state]),
		[state.shouldRenderPos],
	)

	// GPU optimization:
	let translateZ = {}
	if (state.isFocused) {
		translateZ = { transform: "translateZ(0px)" }
	}

	return (
		<ErrorBoundary>
			{React.createElement(
				"article",
				{

					ref,

					style: translateZ,

					contentEditable: true,
					suppressContentEditableWarning: true,

					onFocus: dispatch.opFocus,
					onBlur:  dispatch.opBlur,

					onSelect: e => {
						const { anchorNode, anchorOffset, focusNode, focusOffset } = document.getSelection()
						if (anchorNode === ref.current || focusNode === ref.current) {
							// No-op.
							return
						}
						const pos1 = traverseDOM.computePosFromNode(ref.current, anchorNode, anchorOffset)
						let pos2 = { ...pos1 }
						if (focusNode !== anchorNode || focusOffset !== anchorOffset) {
							pos2 = traverseDOM.computePosFromNode(ref.current, focusNode, focusOffset)
						}
						dispatch.setState(state.body, pos1, pos2)
					},

					// onKeyPress: e => {
					// 	e.preventDefault()
					// 	let data = e.key
					// 	if (e.key === "Enter") {
					// 		data = "\n"
					// 	}
					// 	dispatch.opWrite("onKeyPress", data)
					// },

					// onKeyDown: e => {
					// 	console.log("onKeyDown", { ...e })
					// 	// switch (true) {
					// 	// case detect.isTab(e):
					// 	// 	e.preventDefault()
					// 	// 	dispatch.opTab()
					// 	// 	return
					// 	// case detect.isBackspace(e): // Not working.
					// 	// 	console.log("isBackspace")
					// 	// 	e.preventDefault()
					// 	// 	dispatch.opBackspace()
					// 	// 	return
					// 	// default:
					// 	// 	// No-op.
					// 	// 	return
					// 	// }
					// },

					// // NOTE: `onKeyPress` fires for enter events
					// // (`onKeyDown` does not).
					// onKeyPress: e => {
					// 	console.log("onKeyPress")
					// },
					// // // NOTE: `onKeyDown` fires a no-op event:
					// // //
					// // // const e = {
					// // //   key: "Unidentified",
					// // //   keyCode: 229,
					// // // }
					// // //
					// // onKeyDown: e => {
					// // 	console.log("onKeyDown")
					// // },

					// onKeyPress: e => {
					// 	console.log("onKeyPress")
					// },
					onKeyDown: e => {
						// const pos1 = { ...state.pos1 }
						// const pos2 = { ...state.pos2 }
						// pos1.pos += -pos1.offset
						// pos2.pos += -pos2.offset + state.body.nodes[pos2.index].data.length
						// console.log(pos1.pos, pos2.pos)
					},
					// onCompositionStart: e => {
					// 	console.log("onCompositionStart")
					// },
					// onCompositionStart: e => {
					// 	console.log("onCompositionStart")
					// },
					onCompositionEnd: e => {
						// console.log("onCompositionEnd")
						if (!e.data) {
							// No-op.
							return
						}
						const range = state.body._affectedRange(state.pos1.pos, state.pos2.pos)
						// console.log(state.Components)
						// traverseDOM.innerText(...)

						// console.log(Math.random().toString(36).slice(2, 6),
						// 	state.pos1.index, state.pos2.index - state.pos1.index)
					},
					// onInput: e => {
					// 	// deleteContentBackward
					// 	// deleteWordBackward
					// 	// deleteSoftLineBackward
					// 	// deleteContentForward
					// 	// deleteWordForward
					// 	console.log(e.nativeEvent.inputType)
					// },

				},
				state.Components,
			)}
			<div style={stylex.parse("h:28")} />
			<DebugEditor state={state} />
		</ErrorBoundary>
	)
})

export default TestEditor
