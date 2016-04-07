'use strict';

var fs = require('fs');

var processed = false;
var index = hexo.base_dir+'../index.html';
var db = hexo.base_dir+"db.json";

if (process.argv[2] == 'clean') {
	if(fs.existsSync(index)) {
		fs.unlink(index);	
	}
} else {
	hexo.extend.processor.register("*", function(file) {
		if (!processed) {
			processed = true;
			fs.writeFile(index, 
			['<!DOCTYPE html>',
			'<html>',
			'<head>',
			'<meta http-equiv="refresh" content="0;url='+hexo.config.root+'>', 
			'</head>'].join('\n'), 
			function(error){
				if (error) {
					console.log(error);
				}
			});
			if (fs.existsSync(db)) {
				console.log("remove db.json");
				fs.unlink(db);
			}
		}
	});
}
