var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('catalog.db');var mongoose = require ('mongoose');
var data = new Array();

db.all("SELECT * FROM producer",[], function(err,row){
	for (var i = 0; i < companies.length; i++) {
        data[i] = JSON.stringify(row[i].location);
        console.log(data[i])
}):

module.exports = data;