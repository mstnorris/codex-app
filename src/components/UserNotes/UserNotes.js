import * as constants from "__constants"
import * as Hero from "utils/Heroicons"
import * as ProgressBar from "components/ProgressBar"
import * as User from "components/User"
import Editor from "components/Editor"
import firebase from "__firebase"
import Link from "components/Link"
import NavContainer from "components/NavContainer"
import React from "react"
import useClickAway from "utils/hooks/useClickAway"
import useEscape from "utils/hooks/useEscape"
import useFixed from "utils/hooks/useFixed"
import useUserNotes from "./useUserNotes"

import {
	ITEMS_SHOWN_MAX,
	ITEMS_SHOWN_MIN,
} from "./__globals"

const EditorInstance = props => {
	const [state, dispatch] = Editor.useEditor(props.children, {
		// baseFontSize: 16 * props.modifier,
		// paddingX: 32 * props.modifier,
		// paddingY: 24 * props.modifier,
		readOnly: true,
	})
	return (
		<Editor.Editor
			state={state}
			dispatch={dispatch}
			baseFontSize={16 * props.modifier}
			paddingX={32 * props.modifier}
			paddingY={24 * props.modifier}
			// readOnly={true}
		/>
	)
}

const ButtonIcon = ({ className, icon: Icon, ...props }) => (
	<button className={`p-2 text-md-blue-a400 disabled:text-gray-400 disabled:bg-transparent hover:bg-blue-100 focus:bg-blue-100 rounded-full focus:outline-none trans-300 ${className || ""}`.trim()} {...props}>
		<Icon className="w-6 h-6" />
	</button>
)

const UserNotes = props => {
	const user = User.useUser()
	const renderProgressBar = ProgressBar.useProgressBar()
	const [state, dispatch] = useUserNotes()
	const [response, setResponse] = React.useState({ loading: true, notes: [] })

	const ref = React.useRef()
	const [open, setOpen] = useFixed()
	useEscape(open, setOpen)
	useClickAway(ref, open, setOpen)

	React.useEffect(
		React.useCallback(() => {
			setResponse({ ...response, loading: true })
			const db = firebase.firestore()
			const dbRef = db.collection("notes")
			dbRef.where("userID", "==", user.uid).orderBy("updatedAt", !state.sortAscending ? "desc" : "asc").limit(50).get().then(snap => {
				const notes = []
				snap.forEach(doc => {
					notes.push(doc.data())
				})
				setResponse({ loading: false, notes })
			}).catch(error => (
				console.error(error)
			))
		}, [user, state, response]),
		[state.sortAscending],
	)

	const handleClickDelete = (e, noteID) => {
		e.preventDefault(e)
		// const ok = window.confirm("Delete this note immediately? This cannot be undone.")
		// if (!ok) {
		// 	// No-op
		// 	return
		// }
		setOpen(true)
		// renderProgressBar()
		// const db = firebase.firestore()
		// const dbRef = db.collection("notes").doc(noteID)
		// setResponse({ ...response, notes: [...response.notes.filter(each => each.id !== noteID)] })
		// dbRef.delete().then(() => {
		// 	setOpen(false)
		// }).catch(error => {
		// 	setOpen(false)
		// 	console.error(error)
		// })
	}

	return (
		<NavContainer>

			{true && (
				<div className="fixed inset-0 flex flex-row justify-center items-center z-50">
					<div ref={ref} className="mx-6 -mt-16 p-6 !flex !flex-row w-full max-w-sm bg-white rounded-lg shadow-hero-lg">
						<div>
							<h1 className="font-bold text-xl">
								Delete this note?
							</h1>
							<div className="h-6" />
							<p className="text-px text-gray-700">
								Are you sure you want to delete this note? This action cannot be undone.
							</p>
							<div className="h-6" />
							<div className="flex flex-row justify-end">
								<button className="px-6 py-2 text-gray-800 bg-white hover:bg-gray-100 rounded-md focus:outline-none shadow-hero focus:shadow-outline trans-300">
									<p className="font-semibold tracking-px">
										Cancel
									</p>
								</button>
								<div className="w-2" />
								{/* NOTE: Do not use shadow-hero */}
								<button className="px-6 py-2 text-white bg-red-600 hover:bg-red-600 rounded-md focus:outline-none shadow focus:shadow-outline trans-300">
									<p className="font-semibold tracking-px">
										Delete
									</p>
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Top */}
			<div className="flex flex-row justify-end">
				<div className="-mx-1 flex flex-row">
					<ButtonIcon
						className="hidden lg:block"
						icon={Hero.ZoomOutOutlineMd}
						disabled={state.itemsShown === ITEMS_SHOWN_MAX}
						onPointerDown={e => e.preventDefault()}
						onClick={dispatch.showMoreItems}
					/>
					<ButtonIcon
						className="hidden lg:block"
						icon={Hero.ZoomInOutlineMd}
						disabled={state.itemsShown === ITEMS_SHOWN_MIN}
						onPointerDown={e => e.preventDefault()}
						onClick={dispatch.showLessItems}
					/>
					<ButtonIcon
						icon={!state.sortAscending ? Hero.SortDescendingOutlineMd : Hero.SortAscendingOutlineMd}
						onPointerDown={e => e.preventDefault()}
						onClick={dispatch.toggleSortDirection}
					/>
					{/* <ButtonIcon */}
					{/* 	className={state.scrollEnabled && "bg-blue-100"} */}
					{/* 	icon={Hero.SwitchVerticalOutlineMd} */}
					{/* 	onPointerDown={e => e.preventDefault()} */}
					{/* 	onClick={dispatch.toggleScrollEnabled} */}
					{/* /> */}
				</div>
			</div>

			{/* Bottom */}
			<div className="h-6" />
			<div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${state.itemsShown} gap-6`}>
				{/* Loading */}
				{response.loading ? (
					[...new Array(3)].map((_, index) => (
						<div key={index} className="pb-2/3 relative bg-gray-100 rounded-xl trans-150">
							<div className="absolute inset-0" />
						</div>
					))
				) : (
					<React.Fragment>
						{/* New note */}
						<Link className="pb-2/3 relative bg-white hover:bg-gray-100 focus:bg-gray-100 rounded-xl focus:outline-none shadow-hero focus:shadow-outline trans-150" to={constants.PATH_NEW_NOTE}>
							<div className="absolute inset-0 flex flex-row justify-center items-center">
								<div className="-mt-3 p-2 hover:bg-indigo-100 rounded-full focus:bg-blue-100 transform scale-150 trans-300">
									<Hero.PlusSolidSm className="p-px w-6 h-6 text-md-blue-a400" />
								</div>
							</div>
						</Link>
						{response.notes.map((each, index) => (
							// Note
							<Link key={each.id} className="pb-2/3 relative bg-white hover:bg-gray-100 focus:bg-gray-100 rounded-lg focus:outline-none shadow-hero focus:shadow-outline trans-150" to={constants.PATH_NOTE.replace(":noteID", each.id)}>
								<div className="absolute inset-0 flex flex-row justify-end items-start z-10">
									<button className="-m-3 p-2 text-white bg-red-500 rounded-full focus:outline-none opacity-0 hover:opacity-100 focus:opacity-100 trans-300" onPointerDown={e => e.preventDefault()} onClick={e => handleClickDelete(e, each.id)}>
										<Hero.TrashSolidSm className="w-4 h-4" />
									</button>
								</div>
								<div className="absolute inset-0 overflow-y-hidden">
									<EditorInstance modifier={state.itemsShownModifier}>
										{each.data}
									</EditorInstance>
								</div>
							</Link>
						))}
					</React.Fragment>
				)}
			</div>

		</NavContainer>
	)
}

// document.body.classList.add("debug-css")

export default UserNotes
