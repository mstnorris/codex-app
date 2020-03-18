import * as constants from "__constants"
import React from "react"

import "./ProgressBar.css"

const enterClass  = "progress-bar-enter"  // eslint-disable-line no-multi-spaces
const activeClass = "progress-bar-active" // eslint-disable-line no-multi-spaces

export const Context = React.createContext()

export const ProgressBar = props => {
	const ref = React.useRef()

	const [counter] = React.useContext(Context)

	const mounted = React.useRef()
	React.useEffect(() => {
		if (!mounted.current) {
			mounted.current = true
			return
		}
		ref.current.classList.remove(activeClass)
		ref.current.classList.add(enterClass)
		const id = setTimeout(() => {
			ref.current.classList.add(activeClass)
		}, constants.MICRO_DELAY_MS)
		return () => {
			clearTimeout(id)
		}
	}, [counter])

	return (
		<div className="fixed inset-x-0 top-0 z-40">
			<div ref={ref} className="-mt-px h-1" />
		</div>
	)
}

export const Provider = props => {
	const [counter, setCounter] = React.useState(0)

	const { Provider } = Context
	return (
		<Provider value={[counter, setCounter]}>
			{props.children}
		</Provider>
	)
}

export function useProgressBar() {
	const [counter, setCounter] = React.useContext(Context)
	return () => setCounter(counter + 1) // renderProgressBar
}
