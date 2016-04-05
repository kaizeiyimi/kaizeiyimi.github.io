var fs = require("fs");

var db = hexo.base_dir+"db.json";

if (process.argv[2] == "server" && fs.existsSync(db)) {
	console.log("remove db.json");
	fs.unlink(db);
}
