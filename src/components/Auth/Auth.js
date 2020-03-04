// import * as ProgressBar from "components/ProgressBar"
import * as constants from "__constants"
import * as Feather from "react-feather"
import * as SVG from "svg"
import firebase from "__firebase"
import Link from "components/Link"
import React from "react"

const Auth = props => {
	// const trigger = ProgressBar.useProgressBar()

	const handleClickGitHub = e => {
		const p = new firebase.auth.GithubAuthProvider()
		firebase.auth()
			.signInWithPopup(p)
			.catch(err => {
				console.warn(err)
			})
	}
	const handleClickGoogle = e => {
		const p = new firebase.auth.GoogleAuthProvider()
		firebase.auth()
			.signInWithPopup(p)
			.catch(err => {
				console.warn(err)
			})
	}
	const handleClickGuest = e => {
		// trigger()
		firebase.auth()
			.signInAnonymously()
			.catch(err => {
				console.warn(err)
			})
	}

	return (
		<div className="py-40 flex flex-row justify-center items-center min-h-full">
			<div className="px-6 box-content" style={{ width: "18rem" /* w-72 */ }}>

				<div className="flex flex-row justify-center items-center transform scale-90 origin-bottom">
					<Feather.Layers className="mr-3 w-8 h-8 stroke-medium text-md-blue-a400" />
					<SVG.CodexTextLogo className="w-32 h-8" />
				</div>

				<div className="h-8" />
				<p className="text-center font-medium text-px text-gray-900">
					Choose one of the following to<br />
					open your{" "}
					<a className="text-md-blue-a400 cursor-pointer" href={constants.URL} target="_blank" rel="noopener noreferrer">
						Codex
					</a>
					:
				</p>

				{/* GitHub */}
				<div className="h-6" />
				<button className="px-4 py-3 flex flex-row items-center w-full bg-black rounded-lg focus:outline-none shadow-hero focus:shadow-outline trans-150" onClick={handleClickGitHub}>
					<div className="mx-4">
						<SVG.GitHubLogo className="w-6 h-6 text-gray-100" />
					</div>
					<p className="font-semibold text-px text-gray-100">
						Continue with GitHub
					</p>
				</button>

				{/* Google */}
				<div className="h-2" />
				<button className="px-4 py-3 flex flex-row items-center w-full bg-white rounded-lg focus:outline-none shadow-hero focus:shadow-outline trans-150" onClick={handleClickGoogle}>
					<div className="mx-4">
						<SVG.GoogleLogo className="w-6 h-6 text-gray-900" />
					</div>
					<p className="font-semibold text-px text-gray-900">
						Continue with Google
					</p>
				</button>

				{/* <div className="h-6" /> */}
				{/* <hr className="mx-auto w-32" /> */}
				{/* */}
				{/* <div className="h-6" /> */}
				{/* <p className="text-center font-medium text-px text-gray-900"> */}
				{/* 	Or link an account later and<br /> */}
				{/* 	<button className="text-md-blue-a400 cursor-pointer" onPointerDown={e => e.preventDefault()} onClick={handleClickGuest}> */}
				{/* 		continue as a guest */}
				{/* 	</button> */}
				{/* </p> */}

			</div>
		</div>
	)
}

export default Auth