const fs = require("fs");
const path = require("path");
const net = require("net");
const sanitize = require("sanitize-filename");

const localSocketTimeout = 1000;
const controllerDir = "src/controllers";

if (!fs.existsSync(controllerDir)) {
    fs.mkdirSync(controllerDir);
}

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
	sendPing(req.body.host, req.body.port)
	.then(data => {
		res.status(data.status);

		if (data.hasOwnProperty("data")) {
			let filename = getFilename({ group: req.body.group, name: data.data.name });
			let filepath = path.join(controllerDir, filename); 

			try {
				if (fs.existsSync(filepath)) {
					res.status(400).send(`Controller '${req.body.group}-${data.data.name}' already exists`);
					res.end();
					return;
				}

				fs.writeFileSync(filepath, JSON.stringify({
					group: req.body.group,
					name: data.data.name,
					host: req.body.host,
					port: req.body.port
				}));
			}
			catch (err) {
				console.error(`Failed to create profile for ${req.body.group}-${data.data.name}: ${err}`);
				res.status(500).send("Failed to create profile");
			}
		}
		else {
			console.error(`Failed to ping ${req.body.host}:${req.body.port}: ${data.message}`);
			res.status(500).send("Controller is offline - no profile was created");
		}

		res.end();
		return;
	})
}

put = (req, res) => {
	let filename = getFilename(req.params);
	let filepath = path.join(controllerDir, filename);

	if (!fs.existsSync(filepath)) {
		res.status(404).send(`Could not find profile for controller '${req.params.group}-${req.params.name}'`);
		res.end();
		return;
	}

	try {
		let json = JSON.parse(fs.readFileSync(filepath));

		sendPing(req.body.host, req.body.port)
		.then(data => {
			res.status(data.status);

			if (data.hasOwnProperty("data")) {
				fs.writeFileSync(filepath, JSON.stringify({
					group: json.group,
					name: json.name,
					host: req.body.host,
					port: req.body.port
				}));
			}
			else {
				console.error(`Failed to update controller ${filename}: ${data.message}`);
				res.status(500).send("Controller is offline - the profile cannot be updated");
			}

			res.end();
			return;
		});
	}
	catch (err) {
		console.error(`Failed to update controller ${filename}: ${err}`);
		res.status(500).send("Failed to update profile");
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
		fs.unlinkSync(path.join(controllerDir, filename));
		res.status(200);
	}
	catch (err) {
		console.error(`Failed to delete controller ${filename}: ${err}`);
		res.status(500).send("Failed to delete controller profile");
	}

	res.end();
	return;
}

module.exports = {
	get, post, put, remove, 
	controllerDir, getFilename
}