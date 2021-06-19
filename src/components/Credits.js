import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadCredits } from '../state/views';
import Approved from 'url:../img/approved.svg';
import ErrorIcon from 'url:../img/error.svg';
import Back from 'url:../img/back-arrow.svg';
import { parseAmount } from '../utils/format';
import { setDialog } from '../state/app';

let pk = process.env.REACT_APP_STRIPE_PUBLIC_KEY, stripeAccount = process.env.REACT_APP_STRIPE_ACCOUNT_ID
if (process.env.REACT_APP_ENV === 'prod') {
	pk = process.env.REACT_APP_STRIPE_PUBLIC_KEY_PROD
	stripeAccount = process.env.REACT_APP_STRIPE_ACCOUNT_ID_PROD
}

const stripePromise = loadStripe(pk, { stripeAccount });

let interval, startCredits

export function Credits(props) {
	return <Elements stripe={stripePromise}>
		<CreditsInner {...props} />
	</Elements>;
}

function CreditsInner(props) {

	const { account, update, dispatch, views } = props;
	const { credits } = views

	if (!account) return null;
	const { accountId } = account;

	const stripe = useStripe();
	const elements = useElements();

	const [amount, setAmount] = useState("");
	const [email, setEmail] = useState("");
	const [tel, setTel] = useState("");
	const [error, setError] = useState();

	useEffect(() => {
		startCredits = credits
		window.scrollTo(0,0);
		document.querySelector('input').focus();
	}, []);

	useEffect(() => {
		if (credits === startCredits) return
		handleSuccess()
	}, [credits]);

	const handleSuccess = () => {
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
	}

	const handleSubmit = async (event) => {
		if (event) event.preventDefault();

		setError(null);
		update('app.loading', true);

		const card = elements.getElement(CardElement);

		try {
			const { paymentMethod, error } = await stripe.createPaymentMethod({
				type: "card",
				card,
			});
			if (error) throw error;

			const res = await fetch(process.env.REACT_APP_STRIPE_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					accountId,
					paymentMethodId: paymentMethod.id,
					amount: parseAmount(amount),
					email: !!email.length ? email : undefined,
					phoneNumber: !!tel.length ? tel : undefined,
				}),
			});

			update('app.loading', false);
			const json = await res.json();
			if (res.status !== 200) throw json;

			if (json?.outcome?.status?.SuccessValue === "") {
				handleSuccess()
				setTimeout(() => dispatch(loadCredits(account)), 1000);
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

			<div>

				<img src={Back} onClick={() => history.back()} />

				<h1>Buy Credits</h1>
                
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
						step="1"
						placeholder="Email (optional)"
						value={email}
						onChange={({ target }) => setEmail(target.value)}
					/>

					<input
						type="tel"
						step="1"
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
		</section >
	</>;

}