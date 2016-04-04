var fs = require("fs");

if (process.argv[2] == "server") {
	console.log("remove db.json");
	fs.unlink(__dirname+"/../db.json");
}