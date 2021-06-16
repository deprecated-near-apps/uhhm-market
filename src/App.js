import React, { useContext, useEffect, useState } from 'react';

import { appStore, onAppMount } from './state/app';
import { useHistory, pathAndArgs } from './utils/history';

import { Wallet } from './components/Wallet';
import { Contract } from './components/Contract';


import { Header } from './components/Header';
import { Items } from './components/Items';
import { Token } from './components/Token';
import { Edition } from './components/Edition';
import { Connect } from './components/Connect';
import { Dialog } from './components/Dialog';
import { Credits } from './components/Credits';

import './App.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);

	const {
		app,
		app: {
			loading, tab, isConnectOpen, dialog,
		},
		views, near, wallet, contractAccount, account
	} = state;

	const [profile, setProfile] = useState(false);

	useEffect(() => {
		dispatch(onAppMount());
	}, []);
	useHistory(() => {
		document.body.scrollTo(0,0);
		update('app', {
			href: window.location.href,
			isMenuOpen: false
		});
	}, true);
	const { path, args, pathArgs } = pathAndArgs();

	const signedIn = ((wallet && wallet.signedIn));

	if (profile && !signedIn) {
		setProfile(false);
	}

	if (!contractAccount) return null

	const pathParams = { app, views, update, dispatch, account, wallet, pathArgs }

	return <>

		{loading && <div className="credits-loading">
            <div className="lds-loader"><div></div><div></div><div></div></div>
        </div>}

		{ isConnectOpen && <Connect {...{update, wallet}} /> }
		{ dialog && <Dialog {...dialog} /> }

		<Header {...pathParams} />
		
		{ signedIn && tab === 3 &&
			<div id="contract">
				{
					signedIn &&
					<Contract {...{ near, update, wallet, account }} />
				}
			</div>
		}

		<div>
			{ path === '/' && <Items {...pathParams} /> }
			{ path.substr(0, 6) === '/token' && <Token {...pathParams} /> }
			{ path.substr(0, 8) === '/edition' && <Edition {...pathParams} /> }
			{ path.substr(0, 5) === '/sale' && <Token {...pathParams} /> }
			{ path.substr(0, 8) === '/credits' && <Credits {...pathParams} /> }
		</div>
	</>;
};

export default App;
