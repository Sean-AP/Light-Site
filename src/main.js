const express = require("express");
const http = require("http");
const cors = require("cors");
const { body } = require("express-validator");

const controllers = require("./api/controllers");
const presets = require("./api/presets");
const submit = require("./api/submit");

const app = express();
const server = http.createServer(app);
const port = process.argv[2] ? process.argv[2] : 3000;

// Express config

app.use(cors());
app.use(express.json());

// API routes

app.get("/api/controllers", controllers.get);

app.post("/api/controllers",
    body("group").not().isEmpty(),
    body("host").not().isEmpty(),
    body("port").isInt(), 
    controllers.post
);

app.put("/api/controllers/:group/:name",
    body("host").not().isEmpty(),
    body("port").isInt(), 
    controllers.post
);

app.delete("/api/controllers/:group/:name",
    body("host").not().isEmpty(),
    body("port").isInt(), 
    controllers.post
);

app.get("/api/presets", presets.get);

app.post("/api/presets",
    body("filename").exists(),
    body("payload").exists(),
    presets.post
);

app.post("/api/submit/:group/:name", 
    body("payload").exists(),
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