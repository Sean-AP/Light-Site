const express = require("express");
const http = require("http");
const cors = require("cors");
const { body, validationResult } = require("express-validator");

const controllers = require("./api/controllers");
const presets = require("./api/presets");
const submit = require("./api/submit");

const app = express();
const server = http.createServer(app);
const port = process.argv[2] ? process.argv[2] : 3000;

// Validation handling
function checkErrors(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        res.status(400).send(errors.array().map(x => x.msg).join(", "));
        res.end();
        return;
    }
    next();
}

// Express config

app.use(cors());
app.use(express.json());

// API routes

app.get("/api/controllers", controllers.get);

app.post("/api/controllers",
    body("group", "no group provided").not().isEmpty(),
    body("host", "no host provided").not().isEmpty(),
    body("port", "no port provided").not().isEmpty(),
    body("port", "port must be a valid port number").toInt().custom(value => value > 0 && value < 2 ** 16),
    checkErrors,
    controllers.post
);

app.put("/api/controllers/:group/:name",
    body("host", "no host provided").not().isEmpty(),
    body("port", "no port provided").not().isEmpty(),
    body("port", "port must be a valid port number").toInt().custom(value => value > 0 && value < 2 ** 16),
    checkErrors,
    controllers.put
);

app.delete("/api/controllers/:group/:name", controllers.remove);

app.get("/api/presets", presets.get);

app.post("/api/presets",
    body("filename", "no filename provided").exists(),
    body("payload", "no payload provided").exists(),
    checkErrors,
    presets.post
);

app.post("/api/submit/:group/:name", 
    body("payload", "no payload provided").exists(),
    checkErrors,
    submit.post
);

// Static file server

app.use(express.static("static"));

app.use((req, res, next) => {
    // 404 middleware
    console.log(`Unresolved URL: ${req.url}`);
    res.status(404).send(`Couldn't find ${req.url}`);
    res.end();
    next();
});

// Start server

server.listen(port, () => {
    console.log(`Listening on ${port}...`);
});