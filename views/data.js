var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('catalog.db');
var data = new Array();

db.all("SELECT * FROM producer",[], function(err,row){
	console.log("got here");
	for (var i = 0; i < row.length; i++) {
        data[i] = row[i].location;
        console.log(data[i])
     }
});

module.exports = data;