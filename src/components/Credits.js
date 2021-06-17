import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { Footer } from './Footer';
import { loadCredits } from '../state/views';
import Approved from 'url:../img/approved.svg';
import ErrorIcon from 'url:../img/error.svg';
import Back from 'url:../img/back-arrow.svg';
import { parseAmount } from '../utils/format';
import { setDialog } from '../state/app';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY, {
	stripeAccount: process.env.REACT_APP_STRIPE_ACCOUNT_ID,
});

export function Credits(props) {
	return <Elements stripe={stripePromise}>
		<CreditsInner {...props} />
	</Elements>;
}

function CreditsInner(props) {

	const { account, update, dispatch } = props;

	if (!account) return null;
	const { accountId } = account;

	const stripe = useStripe();
	const elements = useElements();

	const [amount, setAmount] = useState("");
	const [error, setError] = useState();

	useEffect(() => document.querySelector('input').focus(), []);

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

			const res = await fetch('https://stripe-nft-hip-hop.vercel.app/api/pay', {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					accountId,
					paymentMethodId: paymentMethod.id,
					amount: parseAmount(amount),
				}),
			});

			update('app.loading', false);
			const json = await res.json();
			if (res.status !== 200) throw json;

			if (json?.outcome?.status?.SuccessValue === "") {
				dispatch(loadCredits(account));
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
						step="0.01"
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

					<button className="center" disabled={!amount}>{amount ? <span>Pay ${amount} USD</span> : <span>Enter Amount</span>}</button>

					{error && error.message &&
                        <div className="center">
                        	<p>{error.message}</p>
                        	<img src={ErrorIcon} />
                        </div>
					}


				</form >
			</div>

			<Footer />
		</section >
	</>;

}