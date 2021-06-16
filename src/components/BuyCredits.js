import React from 'react'
import Wallet from 'url:../img/wallet.svg';

export const BuyCredits = () => <button onClick={() => history.push('/credits/')}>
    <div>Buy Credits</div>
    <img src={Wallet} />
</button>