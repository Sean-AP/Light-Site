const fs = require("fs");
const path = require("path");
const net = require("net");

const controllers = require("./controllers");
const localSocketTimeout = 1000;
const maxFileSize = 1024;

findController = (filename) => {
    try {
		return JSON.parse(fs.readFileSync(path.join(controllers.controllerDir, filename)));
    }
    catch (err) {
        console.error(`Failed to read ${filename}: ${err}`);
        return null;
    }
}

// Sets the lights to a static colour or preset
sendScript = async (host, port, payload) => {
	// Payload check
	if (payload.length > maxFileSize) {
		return { status: 400, message: `File is too large to process - cannot be larger than ${maxFileSize} bytes` };
	}

	let res = {};

	await new Promise((resolve, _) => {
		// Send the script
        console.log(`Sending script to ${host}:${port}`);
        const lights = new net.Socket();
        lights.setTimeout(localSocketTimeout);

		lights.connect({ host: host, port: port });

        lights.on("connect", () => {
			lights.write(payload);
            lights.destroy();
            res = { status: 200 };
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

post = (req, res) => {
	let controller = findController(controllers.getFilename(req.params));

	if (controller === null) {
		res.status(404).send("Unable to find controller profile");
		res.end();
		return;
	}

	sendScript(controller.host, controller.port, req.body.payload)
	.then(data => {
		res.status(data.status);

		if (data.hasOwnProperty("data")) {
			res.json({ data: data.data });
		}
		else {
			res.json({ message: data.message });
		}

		res.end();
	});
}

module.exports = {
    post
}