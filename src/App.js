import React, { useContext, useEffect, useState } from 'react';

import { appStore, onAppMount } from './state/app';

import { Wallet } from './components/Wallet';
import { Contract } from './components/Contract';
import { Gallery } from './components/Gallery';

import Avatar from 'url:./img/avatar.jpg';
import NearLogo from 'url:./img/near_icon.svg';

import './App.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);

	const { app, app: {tab}, near, wallet, contractAccount, account, loading } = state;


	const [profile, setProfile] = useState(false);

	const onMount = () => {
		dispatch(onAppMount());
	};
	useEffect(onMount, []);

	const signedIn = ((wallet && wallet.signedIn));

	if (profile && !signedIn) {
		setProfile(false);
	}

	return <>
		{ loading && <div className="loading">
			<img src={NearLogo} />
		</div>
		}

		<div className="background"></div>

		<div id="menu">
			<div>
				<img style={{ opacity: signedIn ? 1 : 0.25 }} src={Avatar}
					onClick={() => setProfile(!profile)}
				/>
			</div>
			<div>
				{!signedIn ? <Wallet {...{ wallet }} /> : account.accountId}
			</div>
			{
				profile && signedIn && <div id="profile">
					<div>
						{
							wallet && wallet.signedIn && <Wallet {...{ wallet, account, update, dispatch, handleClose: () => setProfile(false) }} />
						}
					</div>
				</div>
			}
		</div>


		{
			signedIn && <div id="tabs">
				<div onClick={() => update('app.tab', 1)} style={{ background: tab === 1 ? '#fed' : '' }}>Market</div>
				<div onClick={() => update('app.tab', 2)} style={{ background: tab === 2 ? '#fed' : '' }}>My NFTs</div>
				<div onClick={() => update('app.tab', 3)} style={{ background: tab === 3 ? '#fed' : '' }}>Mint</div>
			</div>
		}

		{ signedIn && tab === 3 &&
			<div id="contract">
				{
					signedIn &&
					<Contract {...{ near, update, wallet, account }} />
				}
			</div>
		}
		<div id="gallery">
			<Gallery {...{ app, update, loading, contractAccount, account }} />
		</div>
	</>;
};

export default App;
