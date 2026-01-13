const path = require("path");

const liveServer = require("live-server");

// 

const params = {
	port: 8888,
	host: "0.0.0.0",
	root: path.join(__dirname, "../docs"),
    // file: 'index.html',
	open: false,
	wait: 100,
	logLevel: 2,
};

// 

liveServer.start(params);