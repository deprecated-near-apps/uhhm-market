const fs = require('fs');
const path = './src/config.js'
 
fs.readFile(path, 'utf-8', function(err, data) {
    if (err) throw err;
 
    data = data.replace(/.*const contractName.*/gim, `const contractName = 'dev-1623990723679-78605620599599';`);
 
    fs.writeFile(path, data, 'utf-8', function(err) {
        if (err) throw err;
        console.log('Done!');
    })
})
