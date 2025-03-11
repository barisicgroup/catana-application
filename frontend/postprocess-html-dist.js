/**
 * This file post-processes HTML template files (and related)
 * by replacing corresponding includes with hashed file names, and filling in version number.
 */

const fs = require('fs');
const path = require('path');

let rootPkg;

try {
    rootPkg = require('../package.json');
}
catch (e) {
    console.error(e);
    process.exit(1);
}

const appVersion = rootPkg.version;

const releaseBuild = process.env.RELEASE === "true";
const nameHash = !releaseBuild ? "" : new Date().toISOString().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

const distFolder = "../" + rootPkg.webapp_folder + "dist/";
const cssFolder = distFolder + "css/";
const jsFolder = distFolder + "js/";
const htmlSrcFolder = "../frontend/src/html/";
const htmlRelCssFolder = "./dist/css/";
const htmlRelJsFolder = "./dist/js/";

function getNewFileName(name, ext) {
    return name + (nameHash.length > 0 ? ("." + nameHash) : "") + ext;
}

function processFilesInFolder(folder, nameMap) {
    const files = fs.readdirSync(folder);
    files.forEach(file => {
        hashFileName(folder, file, nameMap);
    });
}

function hashFileName(fileDir, fileName, nameMap) {
    const extension = path.extname(fileName);
    const file = path.basename(fileName, extension);
    let newFileName = getNewFileName(file, extension);

    // In case of source maps, the contents of the file must be modified as well
    // to refer to the correct source file
    if (extension === ".map") {
        const targetExtension = path.extname(file);
        const targetBaseName = path.basename(file, targetExtension);
        const targetFileName = getNewFileName(targetBaseName, targetExtension);
        newFileName = targetFileName + extension;

        const mapContent = fs.readFileSync(fileDir + fileName);
        const mapJson = JSON.parse(mapContent);
        mapJson.file = targetFileName;
        fs.writeFileSync(fileDir + fileName, JSON.stringify(mapJson));
        // In case of javascript files, the comment with source maping URL
        // must be updated as well
    } else if (extension === ".js") {
        let jsContent = fs.readFileSync(fileDir + fileName).toString();
        const srcMapRegexp = /\/\/\s*#\s*sourceMappingURL\s*=\s*(\S+)/gm;
        jsContent = jsContent.replace(srcMapRegexp, "//# sourceMappingURL=" + newFileName + ".map");
        fs.writeFileSync(fileDir + fileName, jsContent);
    }

    nameMap.set(fileName, newFileName);
    fs.copyFileSync(fileDir + fileName, fileDir + newFileName);

    if (fileName !== newFileName) {
        fs.unlinkSync(fileDir + fileName);
    }

    console.log(fileDir + fileName + " --> " + newFileName);
}

function processHTMLs(srcDir, targetDir, nameMap) {
    const files = fs.readdirSync(srcDir);
    files.forEach(file => {
        copyAndPopulateHTML(srcDir, file, targetDir, nameMap);
    });
}

function copyAndPopulateHTML(srcDir, fileName, targetDir, nameMap) {
    const extension = path.extname(fileName);
    const file = path.basename(fileName, extension);

    const newFileName = file.replace(".template", "") + extension;

    let htmlContent = fs.readFileSync(srcDir + fileName).toString();
    const includesRegexp = /@{\s*(?<name>.+\..+)+\s*}/gm;

    console.log(srcDir + fileName + " --> " + newFileName);

    let m;
    while ((m = includesRegexp.exec(htmlContent)) !== null) {
        if (m.index === includesRegexp.lastIndex) {
            includesRegexp.lastIndex++;
        }

        if (m.length !== 2) {
            console.error("Error when matching HTML file");
            process.exit(1);
        }

        let refFileName = nameMap.get(m[1]);
        let refDir = refFileName.includes(".js") ? htmlRelJsFolder : htmlRelCssFolder;
        let refFullPath = refDir + refFileName;

        if (refFileName === undefined) {
            console.error("Referenced source file not found: " + m[1]);
            process.exit(1);
        }

        htmlContent = htmlContent.replace(m[0], refFullPath);
        console.log("\t" + m[0] + " --> " + refFullPath);
    }

    console.log("Replacing occurrences of @VERSION with the application version number...");
    htmlContent = htmlContent.replace(/@VERSION/g, appVersion);

    fs.writeFileSync(targetDir + newFileName, htmlContent);
}

console.log("Processing HTML files and hashing JS and CSS file names.");

let nameMap = new Map();

try {
    processFilesInFolder(cssFolder, nameMap);
    processFilesInFolder(jsFolder, nameMap);
    processHTMLs(htmlSrcFolder, "../" + rootPkg.webapp_folder, nameMap);
    console.log("Done.");
}
catch (e) {
    console.error(e);
    process.exit(1);
}