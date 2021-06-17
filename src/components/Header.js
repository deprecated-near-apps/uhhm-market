import React from 'react';
import Logo from 'url:../img/logo.svg';
import HeartOutline from 'url:../img/heart-outline.svg';
import Heart from 'url:../img/heart.svg';
import Menu from 'url:../img/menu.svg';
import Close from 'url:../img/close.svg';
import { formatAmount } from '../utils/format';
import { BuyCredits } from './BuyCredits';

export const Header = ({ app, views, pathArgs, update, account, wallet }) => {

    const { isMenuOpen, isFavOn } = app
    const { credits, favs } = views

    const handleClose = () => {
        window.scrollTo(0, 0)
        update('app', { isMenuOpen: false })
    }

    return (
        <div>

            <header>
                <div onClick={() => {
                    if (favs.length === 0) return;
                    update('app.isFavOn', !isFavOn)
                    if (!!pathArgs[0]) history.push('/')
                }}>
                    <img className={isFavOn ? 'pulse' : ''} src={isFavOn ? Heart : HeartOutline} />
                    {favs.length > 0 && <div className="badge">{favs.length}</div>}
                </div>
                <img src={Logo} onClick={() => {
                    update('app.isFavOn', false)
                    history.push('/')
                }} />
                <img src={Menu} onClick={() => update('app', { isMenuOpen: true })} />
            </header>

            <nav className={isMenuOpen ? 'active' : ''}>
                <header>
                    <img src={Logo} onClick={() => {
                        update('app.isFavOn', false)
                        history.push('/')
                    }} />
                    <img src={Close} onClick={handleClose} />
                </header>

                <div>

                    {
                        account && credits && <div className="credits">
                            <div>{formatAmount(credits)}</div>
                            <div>Credits</div>
                        </div>
                    }

                    <div className="options" onClick={handleClose}>
                        <div tabIndex="1" className={!pathArgs.length ? 'active' : ''} onClick={() => {
                            update('app.isFavOn', false)
                            history.push('/')
                        }} >
                            <span>Collection</span>
                        </div>
                        <div tabIndex="2" className={pathArgs[0] === 'about' ? 'active' : ''} onClick={() => history.push('/')}>
                            <span>About</span>
                        </div>
                        <div tabIndex="3" className={pathArgs[0] === 'community' ? 'active' : ''} onClick={() => history.push('/')}>
                            <span>Community</span>
                        </div>
                        <div tabIndex="4" className={pathArgs[0] === 'how' ? 'active' : ''} onClick={() => history.push('/')}>
                            <span>How it works</span>
                        </div>
                        {
                            account && <>
                                <div tabIndex="4" className={pathArgs[0] === 'how' ? 'active' : ''} onClick={() => history.push('/')}>
                                    <span>My Bids</span>
                                </div>

                                <div tabIndex="4" className={pathArgs[0] === 'how' ? 'active' : ''} onClick={() => history.push('/')}>
                                    <span>My Collection</span>
                                </div>
                            </>
                        }
                    </div>

                </div>

                <div>

                    <div className="connect">
                        {!account && <button onClick={() => wallet.signIn()}>Connect Wallet</button>}

                        {account && <>
                            <BuyCredits />
                            <button className="center text" onClick={() => wallet.signOut()}>Logout</button>
                        </>
                        }
                    </div>

                </div>
            </nav>

        </div>
    );
};

