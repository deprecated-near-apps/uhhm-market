const fs = require('fs');
const getConfig = require('../src/config');
const { networkId, contractName } = getConfig();

console.log(
	"Copying Credentials to Repo:\n",
	`${process.env.HOME}/.near-credentials/${networkId}/${contractName}.json`
);

fs.copyFile(`${process.env.HOME}/.near-credentials/${networkId}/${contractName}.json`, `./neardev/${networkId}/${contractName}.json`, (err) => {
    if (err) throw err;
    console.log('source.txt was copied to destination.txt');
});