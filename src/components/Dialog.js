import React, { useEffect, useState } from 'react';
import * as nearAPI from 'near-api-js';
import NEAR from 'url:../img/near.svg'
import Close from 'url:../img/close.svg'

export const Dialog = ({ resolve, reject, msg, choices, input, noClose = false, info = false, onClose }) => {

    useEffect(() => {
        window.scrollTo(0, 0)
        if (input) document.querySelector('#dialog-input-0').focus();
    }, [])

	const resolveInput = () => {
		resolve(input.map((_, i) => document.querySelector('#dialog-input-' + i).value));
	};

	const handleClose = () => {
        reject()
		if (onClose) onClose()
	};

    return <section className="modal" onClick={() => handleClose()}>
        <div className="background"></div>
        <div className="content">
            <div className="wrap"
                onClick={(e) => {
                    e.stopPropagation();
                    return false;
                }}
            >
                <div className="close" onClick={() => handleClose()}>
                    <img src={Close} />
                </div>

                <p>{msg}</p>
					{
						input &&
                        input.map(({ placeholder, type = 'text' }, i) => <div key={i}>
                        	<input 
                        		id={"dialog-input-" + i} type={type} placeholder={placeholder}
                        		onKeyUp={(e) => e.key === 'Enter' && resolveInput()}
                        	/>
                        </div>)
					}
					{
						choices &&
                        choices.map((label, i) => <button key={i} onClick={() => resolve(label)}>{label}</button>)
					}
					{!info && !choices && <div className="button"
						onClick={resolveInput}
					>Accept</div>}

            </div>
        </div>
    </section>
};
