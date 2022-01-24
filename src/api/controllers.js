const fs = require("fs");
const path = require("path");
const net = require("net");
const sanitize = require("sanitize-filename");

const localSocketTimeout = 1000;
const controllerDir = "src/controllers";

findControllers = () => {
    try {
		let i = 0;
        let files = fs.readdirSync(controllerDir);

        return files.map(f => {
			let json = JSON.parse(fs.readFileSync(path.join(controllerDir, f)));
			
			return {
				...json,
				id: i++,
				text: json.name
			}
		});
    }
    catch (err) {
        console.error(`Failed to read ${controllerDir}: ${err}`);
        return null;
    }
}

getFilename = (body) => {
	let group = sanitize(body.group);
	let name = sanitize(body.name);
	return `${group}-${name}.json`;
}

sendPing = async (host, port) => {
    let res = {};

    await new Promise((resolve, _) => {
        // Send a ping
        console.log(`Pinging ${host}:${port}`);
        const lights = new net.Socket();
        lights.setTimeout(localSocketTimeout);

        lights.connect({ host: host, port: port });

        lights.on("connect", () => { lights.write("ping"); });

        lights.on("data", (data) => {
            lights.destroy();
            res = { status: 200, data: JSON.parse(data) };
            resolve();
        });

        lights.on("error", () => {
            lights.destroy();
            res = { status: 500, message: "Something went wrong" };
            resolve();
        });

        lights.on("timeout", () => {
            lights.destroy();
            res = { status: 500, message: "Connection to lights timed out - they're probably off" };
            resolve();
        });
    });
    
    return res;
}

get = (req, res) => {
    // Try to read controller files
    let controllers = findControllers();
    
    if (controllers === null) {
        res.status(500).send("Failed to read controllers");
        res.end();
        return;
    }

	let groups = [...new Set(controllers.map(c => c.group))];

    // Format for use by select2 (https://select2.org/data-sources/formats)
    res.status(200).json({
        results: groups.map(group => ({
			text: group, 
			children: controllers.filter(c => c.group === group)
		}))
    });

    res.end();
    return;
}

post = (req, res) => {
	let filename = getFilename(req.body);

	if (fs.existsSync(path.join(controllerDir, filename))) {
		res.status(400).send(`Controller '${req.params.group}-${req.params.name}' already exists`);
		res.end();
		return;
	}

	try {
		sendPing(req.body.host, req.body.port)
		.then(data => data.json())
		.then(data => {
			res.status(data.status);

			if (data.hasOwnProperty("data")) {
				fs.writeFileSync(path.join(controllerDir, filename), JSON.stringify({
					group: req.body.group,
					name: data.data.name,
					host: req.body.host,
					port: req.body.port
				}));
			}
			else {
				throw new Error();
			}

			res.end();
			return;
		})
	}
	catch (err) {
		console.error(`Failed to ping ${req.body.host}:${req.body.port}: ${err}`);
		res.status(500).send("Controller is offline - no profile was created");
		res.end();
		return;
	}
}

put = (req, res) => {
	let filename = getFilename(req.params);

	if (!fs.existsSync(path.join(controllerDir, filename))) {
		res.status(404).send(`Could not find profile for controller '${req.params.group}-${req.params.name}'`);
		res.end();
		return;
	}

	try {
		fs.writeFileSync(path.join(controllerDir, filename), JSON.stringify({
			group: req.body.group,
			name: req.body.name,
			host: req.body.host,
			port: req.body.port
		}));
	}
	catch (err) {
		console.error(`Failed to update controller ${filename}: ${err}`);
		res.status(500).send("Failed to update controller profile");
		res.end();
		return;
	}
}

remove = (req, res) => {
	let filename = getFilename(req.params);

	if (!fs.existsSync(path.join(controllerDir, filename))) {
		res.status(404).send(`Could not find profile for controller '${req.params.group}-${req.params.name}'`);
		res.end();
		return;
	}

	try {
		fs.unlinkSync(fs.readFileSync(path.join(controllerDir, filename)))
	}
	catch (err) {
		console.error(`Failed to delete controller ${filename}: ${err}`);
		res.status(500).send("Failed to delete controller profile");
		res.end();
		return;
	}
}

module.exports = {
	get, post, put, remove, 
	controllerDir, getFilename
}