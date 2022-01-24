const fs = require("fs");
const path = require("path");
const sanitize = require("sanitize-filename");

const defaultDir = "src/scripts/default";
const customDir = "src/scripts/custom";

if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir);
}

if (!fs.existsSync(customDir)) {
    fs.mkdirSync(customDir);
}

findFiles = (dir, id) => {
    try {
        let files = fs.readdirSync(dir);

        return files.map(f => ({
            id: id++, 
            text: path.parse(f).name,
            contents: fs.readFileSync(path.join(dir, f)).toString()
        }))
    }
    catch (err) {
        console.error(`Failed to read ${dir}: ${err}`);
        return null;
    }
}

get = (req, res) => {
    // Try to read default files
    let defaultFiles = findFiles(defaultDir, 1);
    
    if (defaultFiles === null) {
        res.status(500).send("Failed to read presets");
        res.end();
        return;
    }

    // Try to read custom files
    let customFiles = findFiles(customDir, 1 + defaultFiles.length);
    
    if (customFiles === null) {
        res.status(500).send("Failed to read presets");
        res.end();
        return
    }

    // Format for use by select2 (https://select2.org/data-sources/formats)
    res.status(200).json({
        results: [
            { text: "Defaults", children: defaultFiles },
            { text: "Custom", children: customFiles }
        ]
    });

    res.end();
    return;
}

post = (req, res) => {
    let filename = sanitize(req.body.filename);

    fs.writeFile(path.join(customDir, filename + ".txt"), req.body.payload, err => {
        if (err) {
            console.error("Failed to write to file: " + err);
            res.status(500).send("Failed to write to file.");
        }
        else {
            res.status(200).send("Wrote script to file.");
        }
        
        res.end();
    });
}

module.exports = {
    get, post
}