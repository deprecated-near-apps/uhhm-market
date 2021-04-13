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

	console.log(state);
    
	const { near, wallet, contractAccount, account, loading } = state;
    
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
        
		<div id="menu">
			<div>
				<div>
					<img style={{ opacity: signedIn ? 1 : 0.25 }} src={Avatar} 
						onClick={() => setProfile(!profile)}
					/>
				</div>
				<div>
					{ !signedIn ? <Wallet {...{ wallet }} /> : account.accountId }
				</div>
			</div>
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
		{ signedIn &&
            <div id="contract">
            	{
            		signedIn &&
                    <Contract {...{ near, update, wallet, account }} />
            	}
            </div>
		}
		<div id="gallery">
			<Gallery {...{ near, signedIn, contractAccount, account, loading, update }} />
		</div>
	</>;
};

export default App;
