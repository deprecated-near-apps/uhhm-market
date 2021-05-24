import copy from 'copy-to-clipboard';

export const share = (text) => {
	if (navigator.share && /mobile/gi.test(window.navigator.userAgent)) {
		navigator.share({
			text
		}).catch((e) => {
			copy(text);
			return { mobile: true, error: true };
		});
		return { mobile: true };
	} else {
		copy(text);
		return { mobile: false };
	}
};