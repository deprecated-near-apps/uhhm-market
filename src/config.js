const contractName = 'dev-1623990723679-78605620599599';

module.exports = function getConfig(prod = false) {
	let config = {
		networkId: "testnet",
		nodeUrl: "https://rpc.testnet.near.org",
		// walletUrl: 'http://localhost:1234',
		walletUrl: "https://wallet.testnet.near.org",
		helperUrl: "https://helper.testnet.near.org",
		contractName,
	};

	if (process.env.REACT_APP_ENV !== undefined || prod) {
		config = {
			explorerUrl: "https://explorer.testnet.near.org",
			...config,
			GAS: "200000000000000",
			DEFAULT_NEW_ACCOUNT_AMOUNT: "5",
			DEFAULT_NEW_CONTRACT_AMOUNT: "5",
			GUESTS_ACCOUNT_SECRET:
        "7UVfzoKZL4WZGF98C3Ue7tmmA6QamHCiB1Wd5pkxVPAc7j6jf3HXz5Y9cR93Y68BfGDtMLQ9Q29Njw5ZtzGhPxv",

			contractMethods: {
				changeMethods: [
					"new",
				],
				viewMethods: [],
			},
			
			contractId: contractName,
			marketId: "market." + contractName,
			fungibleId: "ft.hhft.testnet",
		};
	}

	if (process.env.REACT_APP_ENV === "prod" || prod) {
		config = {
			...config,
			networkId: "mainnet",
			nodeUrl: "https://rpc.mainnet.near.org",
			walletUrl: "https://wallet.near.org",
			helperUrl: "https://helper.mainnet.near.org",
			contractName: "uhhmnft.near",
			contractId: "uhhmnft.near",
			marketId: "market.uhhmnft.near",
			fungibleId: "ft.hip-hop.near",
			ownerId: 'owner.uhhmnft.near',
		};
	}

	return config;
};
