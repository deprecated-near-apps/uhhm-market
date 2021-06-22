import React, { useEffect } from 'react';
import Close from 'url:../img/close.svg';

export const Dialog = ({
	resolve, reject,
	msg, choices, input,
	acceptLabel = 'Accept',
	onClose,
	onCloseButton,
	onCancelled,
	info = false,
}) => {

	useEffect(() => {
		window.scrollTo(0, 0);
		if (input) document.querySelector('#dialog-input-0').focus();
	}, []);

	const resolveInput = () => {
		resolve(input.map((_, i) => document.querySelector('#dialog-input-' + i).value));
	};

	const handleClose = (cancelled = false) => {
		reject();
		if (cancelled === true && onCancelled) {
			return onCancelled()
		}
		if (onClose) onClose();
		if (onCloseButton) Object.values(onCloseButton)[0]();
	};

	return <section className="modal" onClick={() => handleClose(true)}>
		<div className="background"></div>
		<div className="content">
			<div className="wrap"
				onClick={(e) => {
					e.stopPropagation();
					return false;
				}}
			>
				<div className="close" onClick={() => handleClose(true)}>
					<img src={Close} />
				</div>

				<div>{msg}</div>

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
				{!info && !choices && <button className="center"
					onClick={resolveInput}
				>{acceptLabel}</button>}

				{onCloseButton && <button className="center"
					onClick={handleClose}
				>{Object.keys(onCloseButton)[0]}</button>}

			</div>
		</div>
	</section>;
};
