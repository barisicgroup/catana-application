const fs = require('fs');

let rootPkg;

try {
    rootPkg = require('../package.json');
}
catch (e) {
    rootPkg = undefined;
}

const buildTime = new Date().toISOString().substring(0,10);
fs.writeFileSync(rootPkg ? "../" + rootPkg.webapp_folder + "dist/build_time.txt" : './build/build_time.txt', buildTime);
console.log("Last build at: ", buildTime);