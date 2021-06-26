import React, { useContext, useEffect, useState } from 'react';

import { appStore, onAppMount } from './state/app';
import { useHistory, pathAndArgs } from './utils/history';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Items } from './components/Items';
import { Token } from './components/Token';
import { MyBids } from './components/MyBids';
import { Edition } from './components/Edition';
import { Connect } from './components/Connect';
import { Dialog } from './components/Dialog';
import { Credits } from './components/Credits';

/// pages

import { About } from './components/About';
import { HowItWorks } from './components/HowItWorks';
import { TOS } from './components/TOS';

import './App.scss';
import './AppMedia.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);

	const {
		app,
		app: {
			loading, tab, isConnectOpen, dialog, isEditionOpen,
		},
		views,
		near, wallet, contractAccount, account
	} = state;

	const [profile, setProfile] = useState(false);

	useEffect(() => {
		dispatch(onAppMount());
	}, []);
	useHistory(() => {
		window.scrollTo(0,0);
		update('app', {
			href: window.location.href,
			isMenuOpen: false,
			isEditionOpen: false,
		});
	}, true);
	const { path, args, pathArgs } = pathAndArgs();

	const signedIn = ((wallet && wallet.signedIn));

	if (profile && !signedIn) {
		setProfile(false);
	}

	if (!contractAccount) return null;

	const pathParams = { near, app, views, update, dispatch, account, wallet, pathArgs };

	return <>

		{loading && <div className="credits-loading">
			<div className="lds-loader"><div></div><div></div><div></div></div>
		</div>}

		{ isConnectOpen && <Connect {...{update, wallet}} /> }
		{ dialog && <Dialog {...dialog} /> }
		{ isEditionOpen && <Edition {...pathParams} /> }

		<Header {...pathParams} />
		
		{ signedIn && tab === 3 &&
			<div id="contract">
				{
					signedIn &&
					<Contract {...{ near, update, wallet, account }} />
				}
			</div>
		}

		<div className="route-wrap">
			<div>
				{ path === '/' && <Items {...pathParams} /> }
				{ path.substr(0, 6) === '/token' && <Token {...pathParams} /> }
				{ path.substr(0, 5) === '/sale' && <Token {...pathParams} /> }
				{ account && path.substr(0, 5) === '/bids' && <MyBids {...pathParams} /> }
				{ path.substr(0, 8) === '/credits' && <Credits {...pathParams} /> }
				{ path.substr(0, 6) === '/about' && <About {...pathParams} /> }
				{ path.substr(0, 4) === '/how' && <HowItWorks {...pathParams} /> }
				{ path.substr(0, 4) === '/tos' && <TOS {...pathParams} /> }
			</div>
			<Footer />
		</div>
		
	</>;
};

export default App;
