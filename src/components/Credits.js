import React, { useEffect, useState } from "react";
import { set, get } from '../utils/storage';
import * as nearApiJs from 'near-api-js'
import BN from 'bn.js'
import { generateSeedPhrase } from 'near-seed-phrase'
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadCredits, doesAccountExist } from '../state/views';
import Approved from 'url:../img/approved.svg';
import ErrorIcon from 'url:../img/error.svg';
import Back from 'url:../img/back-arrow.svg';
import { parseAmount } from '../utils/format';
import { setDialog } from '../state/app';
import { networkId, walletUrl, contractId } from "../utils/near-utils";
import copy from 'copy-to-clipboard';
const { Account, KeyPair, utils: { format: { parseNearAmount } } } = nearApiJs

let
	pk = process.env.REACT_APP_STRIPE_PUBLIC_KEY,
	stripeAccount = process.env.REACT_APP_STRIPE_ACCOUNT_ID,
	endpoint = process.env.REACT_APP_STRIPE_ENDPOINT
if (process.env.REACT_APP_ENV === 'prod') {
	pk = process.env.REACT_APP_STRIPE_PUBLIC_KEY_PROD
	stripeAccount = process.env.REACT_APP_STRIPE_ACCOUNT_ID_PROD
	endpoint = process.env.REACT_APP_STRIPE_ENDPOINT_PROD
}

let credentials = generateSeedPhrase()

const stripePromise = loadStripe(pk, { stripeAccount });

let interval, startCredits = '0', interaction = false

export const TEMP_CREDENTIALS = 'TEMP_CREDENTIALS'

export function Credits(props) {
	return <Elements stripe={stripePromise}>
		<CreditsInner {...props} />
	</Elements>;
}

const networkSuffix = (accountId) => accountId + (networkId === 'mainnet' ? '.near' : '.testnet')

function CreditsInner(props) {

	const { near, account, update, dispatch, views } = props;
	const { credits } = views

	const stripe = useStripe();
	const elements = useElements();

	const [step, setStep] = useState(!!account ? 1 : 0);
	const [accountName, setAccountName] = useState('');
	const [revealed, setRevealed] = useState(false);
	const [accountError, setAccountError] = useState(' ');

	const [amount, setAmount] = useState("");
	const [email, setEmail] = useState("");
	const [tel, setTel] = useState("");
	const [error, setError] = useState();

	useEffect(() => {
		startCredits = credits || '0'
		window.scrollTo(0, 0);
		document.querySelector('input')?.focus();
		if (account) {
			credentials = { publicKey: "" }
		}
		const temp = get(TEMP_CREDENTIALS)
		if (temp && temp.seedPhrase) {
			credentials = temp
			handleNewAccount()
		}
	}, []);

	useEffect(() => {
		if (!interaction || credits === startCredits) return
		handleSuccess()
	}, [credits]);

	const handleAccountId = async (newAccountId) => {
		setAccountName(newAccountId)
		if (newAccountId.length < 2) {
			return setAccountError('Account name is too short')
		}
		if (!/^[a-z0-9]+[a-z0-9-_]+$/.test(newAccountId)) {
			return setAccountError('Account name is not valid (a-z, 0-9 and - or _)')
		}
		newAccountId = networkSuffix(newAccountId)
		if (await dispatch(doesAccountExist(newAccountId))) {
			return setAccountError('Account name already exists')
		}
		setAccountError('')
	}

	const handleSignIn = async () => {
		// pop window
		update('app.loading', true);
		// new account was created
		const { accountId } = credentials

		const w = window.open(
			`${walletUrl}/auto-import-seed-phrase?successUrl=${encodeURIComponent(window.location.origin)}#${accountId}/${encodeURIComponent(credentials.seedPhrase)}`,
			'',
			`top=100,left=100,location=0,menubar=0,resizeable=0,toolbar=0,titlebar=0,width=${window.innerWidth - 200},height=${window.innerHeight - 200}`
		);

		const account = new Account(near.connection, accountId)
		const oldPublicKeys = (await account.getAccessKeys()).map(({ public_key }) => public_key.toString())

		let signInInterval, signInTimeout
		const signIn = async () => {
			clearInterval(signInInterval)
			clearTimeout(signInTimeout)
			const newPublicKeys = ((await account.getAccessKeys()).map(({ public_key }) => public_key.toString())).filter((pk) => !oldPublicKeys.includes(pk))

			if (!newPublicKeys.length) {
				await update('app.loading', false);
				const onCancelled = () => {
					dispatch(setDialog({
						msg: <div>
							<p>It looks like you closed the window too soon.</p>
							<p>Please wait until your account is imported in the new window.</p>
						</div>,
						info: true,
						onCancelled,
						onCloseButton: {
							'Sign In': handleSignIn
						}
					}));
				}
				onCancelled()
				return
			}

			const fullAccessKeyPair = KeyPair.fromString(credentials.secretKey)
			near.connection.signer.keyStore.setKey(networkId, accountId, fullAccessKeyPair);
			const keyPair = KeyPair.fromRandom('ed25519')
			await account.addKey(keyPair.publicKey, contractId, '', new BN(parseNearAmount('0.0999')))

			set(`near-api-js:keystore:${accountId}:${networkId}`, 'ed25519:' + keyPair.secretKey);
			set(`undefined_wallet_auth_key`, `{"accountId":"${accountId}","allKeys":["${newPublicKeys[0]}"]}`);
			set(TEMP_CREDENTIALS, null);
			update('app.loading', false);
			window.location.href = '/'
		}

		// check if they closed window
		signInInterval = setInterval(async () => {
			if (!w) {
				clearInterval(signInInterval)
			}
			if (w && w.closed) {
				await signIn()
			}
		}, 1000)

		// automatically close window
		signInTimeout = setTimeout(async () => {
			w.close()
			await signIn()
		}, 10000)
	}

	const handleNewAccount = (amount) => {
		dispatch(setDialog({
			msg: <div>
				{amount &&
					<>
						<img src={Approved} />
						<h1>Credits successfully purchased!</h1>
						<p>{amount}</p>
					</>
				}
				<p>You must sign into your new wallet before you can place a bid.</p>
				<p>"Sign In" will take you to the NEAR Wallet.</p>
				<p>Once you are logged in, feel free to close the window, or it will close automatically after 10 seconds.</p>
			</div>,
			info: true,
			onCloseButton: {
				'Sign In': handleSignIn
			}
		}));
	}

	const handleSuccess = async () => {
		if (account) {
			dispatch(setDialog({
				msg: <div>
					<img src={Approved} />
					<h1>Credits successfully purchased!</h1>
					<p>{amount}</p>
					<p>Go place your bid!</p>
				</div>,
				info: true,
				onCloseButton: {
					'Return': () => history.back()
				}
			}));
			setTimeout(() => dispatch(loadCredits(account)), 1000);
			return
		}
		const accountId = networkSuffix(accountName)
		if (await doesAccountExist(accountId)) {
			handleNewAccount(amount)
		} else {
			dispatch(setDialog({
				msg: <div>
					<p>There was an error creating your account.</p>
					<p>All charges have been refunded.</p>
					<p>Please try again.</p>
				</div>,
				info: true,
				onCloseButton: {
					'Retry': () => window.location.reload()
				}
			}));
		}
	}

	const handleSubmit = async (event) => {
		if (event) event.preventDefault();

		const accountId = account ? account.accountId : networkSuffix(accountName);

		interaction = true
		setError(null);
		update('app.loading', true);

		const card = elements.getElement(CardElement);

		const parsedAmount = parseAmount(amount)
		if (!account && parsedAmount <= 4700) {
			await update('app.loading', false);
			return dispatch(setDialog({
				msg: <div>
					<p>Must purchanse at least $47.01 credits with a new account.</p>
					<p>Please try again.</p>
				</div>,
				info: true,
			}));
		}
		
		// user might abandon
		credentials.accountId = accountId
		set(TEMP_CREDENTIALS, credentials)

		try {
			const { paymentMethod, error } = await stripe.createPaymentMethod({
				type: "card",
				card,
			});
			if (error) throw error;

			const res = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					accountId,
					publicKey: credentials.publicKey,
					paymentMethodId: paymentMethod.id,
					amount: parsedAmount,
					email: !!email.length ? email : undefined,
					phoneNumber: !!tel.length ? tel : undefined,
				}),
			});
			update('app.loading', false);
			const json = await res.json();
			if (res.status !== 200) throw json;

			if (json?.outcome?.status?.SuccessValue === "") {
				handleSuccess()
			} else {
				// check regardless, maybe charge success but no redirect
				if (interval) clearInterval(interval)
				interval = setInterval(() => {
					dispatch(loadCredits(account))
				}, 2000)
				// may throw but start checking credits above
				window.open(json.intent.next_action.redirect_to_url.url, '_blank')
			}

		} catch (err) {
			setError(err);
		} finally {
			update('app.loading', false);
		}
	};

	return <>

		<section className="credits">
			{
				step === 0 && credentials &&
				<div>

					<img src={Back} onClick={() => history.back()} />

					<h1>Create Account</h1>

					<input
						type="text"
						step="1"
						placeholder="Choose an Account Name"
						value={accountName}
						disabled={revealed}
						onChange={async ({ target }) => handleAccountId(target.value)}
					/>

					{revealed && <p>This is your seed phrase. The only way you can sign into and recover your account.<br/>You need to copy it somewhere safe.</p>}

					<input
						type={revealed ? 'text' : 'password'}
						step="1"
						placeholder="Amount"
						value={credentials.seedPhrase}
						readOnly={true}
					/>

					{!!accountError.length && <p>{accountError}</p>}

					{revealed && <button className="center" disabled={!!accountError.length} onClick={() => {
						copy(credentials.seedPhrase)
						dispatch(setDialog({
							msg: <div>
								<p>Seed phrase has been copied.</p>
								<p>(Command/Ctrl - C)</p>
								<p>PLEASE MAKE SURE TO SAVE THIS SEED PHRASE SOMEWHERE SECURE.</p>
								<p>Do not share this with anyone. </p>
								<p>We cannot recover your credits if you lose your seed phrase.</p>
							</div>,
							info: true,
							onCancelled: () => window.location.reload(),
							onCloseButton: {
								'I Understand': () => setStep(1)
							}
						}));
					}}>Copy Seed Phrase</button>}

					{!revealed && <button className="center" disabled={!!accountError.length} onClick={() => setRevealed(true)}>Next</button>}

				</div>
			}

			{
				step === 1 &&
				<div>

					<img src={Back} onClick={() => history.back()} />

					<h1>Buy Credits</h1>

					<p>Note: you must place a bid <i>above</i> the current bid. For example, you will need $48 to outbid the $47 reserve price.</p>

					<form onSubmit={handleSubmit}>

						<input
							type="number"
							step="1"
							placeholder="Amount"
							value={amount}
							onChange={({ target }) => setAmount(target.value)}
						/>
						<div className="card">
							<CardElement
								options={{
									style: {
										base: {
											color: 'white',
											'::placeholder': {
												color: 'rgba(255, 255, 255, 0.5)',
											},
										},
									},
								}}
							/>
						</div>

						<input
							type="email"
							placeholder="Email (optional)"
							value={email}
							onChange={({ target }) => setEmail(target.value)}
						/>

						<input
							type="tel"
							placeholder="Phone (optional)"
							value={tel}
							onChange={({ target }) => setTel(target.value)}
						/>

						<button className="center" disabled={!amount}>{amount ? <span>Pay ${amount} USD</span> : <span>Enter Amount</span>}</button>

						{error && error.message &&
							<div className="center">
								<p>{error.message}</p>
								<img src={ErrorIcon} />
							</div>
						}


					</form >
				</div>
			}


		</section >
	</>;

}