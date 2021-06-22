import React, { useEffect, useState } from 'react';
import * as nearAPI from 'near-api-js';
import NEAR from 'url:../img/near.svg';
import Close from 'url:../img/close.svg';

export const Connect = ({ update, wallet }) => {

	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);

	return <section className="modal" onClick={() => update('app', { isConnectOpen: false })}>
		<div className="background"></div>
		<div className="content">
			<div className="wrap"
				onClick={(e) => {
					e.stopPropagation();
					return false;
				}}
			>
				<div className="close" onClick={() => update('app', { isConnectOpen: false })}>
					<img src={Close} />
				</div>
				<img src={NEAR} />
				<p>You need to connect your Near wallet to participate in auction. If you don't already have one, you can create it for free.</p>
				<div className="button"
					onClick={() => wallet.signIn()}
				>Connect Wallet</div>
	< br/>
				<div className="button"
					onClick={() => {
						update('app.isConnectOpen', false)
						history.push('/credits')
					}}
				>Create a Wallet</div>
				<p>(requires credit card purchase)</p>

			</div>
		</div>
	</section>;
};

