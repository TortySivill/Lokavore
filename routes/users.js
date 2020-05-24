"uss strict";

var express = require('express');
var router = express.Router();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var sessions = require('express-session');
var passport = require('passport');
var passportLocal = require('passport-local');
var bcrypt = require('bcrypt');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('catalog.db');
var geocoder = require('geocoder');

function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    next();
  } else{
    res.redirect('/users/login');
  }

}

passport.initialize();


generateHash = function(password){
	return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
}

validPassword = function(password, dbpassword){
	return bcrypt.compareSync(password,dbpassword);
}

passport.use(new passportLocal.Strategy(function(username, password, done){
	db.serialize(function(){
		var stmt = db.prepare('SELECT COUNT(*) FROM user WHERE user.email = ?');
		stmt.get(username, function(err,row){
			if((row[Object.keys(row)[0]]) === 0){
				done(null,null)
			}
			else{
				db.serialize(function(){
					stmt1 = db.prepare('select * from user where email = ?');
					stmt1.get(username, function(err,row){
					if (validPassword(password,row.password)){
						done(null, {id: row.id, name: row.username})
					} else {
						done(null,null);
					}
					});
					stmt1.finalize();
				});

			}
		});
		stmt.finalize();
	});
}));

passport.serializeUser(function(user, done){
	done(null, user.id);

});

passport.deserializeUser(function(id, done){
	db.serialize(function(){
		var stmt = db.prepare('select * from user where user.id = ?');
		stmt.get(id, function(err,user){
			done(null, user)
		});
		stmt.finalize();
	});
});



router.get('/login', function(req, res, next) {
    //res.send('NOT IMPLEMENTED: login GET');
		navbarcats()
		function navbarcats(){
			nav = [];
			db.serialize(function(){
				var stmt = db.prepare('SELECT category.cat_name,category.id, sub_category.subcat_id, sub_category.name FROM category inner join sub_category on category.id = sub_category.category_id');
				stmt.all(function(err,row){
					var previous = 0;
					var category;
					var sub_categorys=[];
					for (i = 0; i < row.length; i++){

							if(i == 0){
								var category = new Object();
								category.id = row[i].id;
								category.name = row[i].cat_name;
								previous = row[i].id;
								var subcategory = new Object();
								subcategory.name = row[i].name;
								subcategory.id = row[i].subcat_id;
								sub_categorys.push(subcategory);
							 }
							 else if(row[i].id != previous){
								 category.subcats = sub_categorys;
								 sub_categorys = []
								 nav.push(category)
								 var category = new Object()
								 category.id = row[i].id
								 category.name = row[i].cat_name
								 previous = row[i].id
								 var subcategory = new Object()
								 subcategory.name = row[i].name
								 subcategory.id = row[i].subcat_id
								 sub_categorys.push(subcategory)
							 }
							else{
								var subcategory = new Object()
								subcategory.name = row[i].name
								subcategory.id = row[i].subcat_id
								sub_categorys.push(subcategory)
							}
						}
						renderresults(nav)
				});
				stmt.finalize();
			});

		}
		function renderresults(nav){
			res.render('login', {nav:nav, title: "Log in", failed_login: false});
		}
});

router.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/users/failedLogin/'}), function(req, res, next) {
});

router.get('/logout', function(req,res){
	req.logout();
	res.redirect('/');
});

router.get('/failedLogin', function(req,res){
		navbar();
		function navbar(name,produce){
		db.serialize(function(){
			var stmt = db.prepare('SELECT * FROM category');
			stmt.all(function(err,row){
		      res.render('login', {category_list: row, title: "Log in", failed_login: true});
		    });
		    stmt.finalize();
		});
	  }
})

router.post('/failedLogin', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/users/failedLogin/' }), function(req, res, next) {
});



router.get('/register', function(req,res,next){
	navbar();
	function navbar(){
    nav = [];
    db.serialize(function(){
    	var stmt = db.prepare('SELECT category.cat_name,category.id, sub_category.subcat_id, sub_category.name FROM category inner join sub_category on category.id = sub_category.category_id');
    	stmt.all(function(err,row){
        var previous = 0;
        var category;
        var sub_categorys=[];
        for (i = 0; i < row.length; i++){

            if(i == 0){
              var category = new Object();
              category.id = row[i].id;
              category.name = row[i].cat_name;
              previous = row[i].id;
              var subcategory = new Object();
              subcategory.name = row[i].name;
              subcategory.id = row[i].subcat_id;
              sub_categorys.push(subcategory);
             }
             else if(row[i].id != previous){
               category.subcats = sub_categorys;
               sub_categorys = []
               nav.push(category)
               var category = new Object()
               category.id = row[i].id
               category.name = row[i].cat_name
               previous = row[i].id
               var subcategory = new Object()
               subcategory.name = row[i].name
               subcategory.id = row[i].subcat_id
               sub_categorys.push(subcategory)
             }
            else{
              var subcategory = new Object()
              subcategory.name = row[i].name
              subcategory.id = row[i].subcat_id
              sub_categorys.push(subcategory)
            }
          }
          renderresults(nav)
      });
	  stmt.finalize();
	});
  }

  function renderresults(nav){
    res.render('register', { navbar: nav, title: 'Register', failed_register:false});
  }
});

function isValidPostcode(p) {
	var postcodeRegEx = /[A-Z]{1,2}[A-Z0-9]{1,2} ?[0-9][A-Z]{2}/i;
	return postcodeRegEx.test(p);
}


router.post('/register', function(req,res){
	req.checkBody('email', 'Email must not be empty').notEmpty();
	req.checkBody('name', 'Name must not be empty').notEmpty();
	req.checkBody('password', 'password must not be empty').notEmpty();
	req.checkBody('confirm_password', 'confirm password must not be empty').notEmpty();
	req.checkBody('location', 'location must not be empty').notEmpty();
	req.checkBody('user_type', 'user type must not be empty').notEmpty();

	if (req.body.password != req.body.confirm_password){
		var errors = 'confirm password and password do not match'
		navbar();
		function navbar(name,produce){
		db.serialize(function(){
			var stmt = db.prepare('SELECT * FROM category');
			stmt.all(function(err,row){
		      res.render('register', {category_list: row, title: "Register", failed_register: true, confirm_error: errors});
		    });
		    stmt.finalize();
		});
	  }

	}

	else{
		var errors = req.validationErrors();

		if (errors) {
			// Some problems so we need to re-render our register form
			navbar();
			function navbar(name,produce){
			db.serialize(function(){
				var stmt1 = db.prepare('SELECT * FROM category');
				stmt1.all(function(err,row){
			      res.render('register', {category_list: row, title: "Register", failed_register: true, errors: errors});
			    });
			    stmt1.finalize();
			});
		  }
		}
		else{

			var databasePassword = generateHash(req.body.password);

			if(req.body.user_type === "producer"){
				var user_type = "Producer";
			}
			else {
				var user_type = "Customer";
			}

			db.serialize(function(){
				var stmt2 = db.prepare('SELECT COUNT(*) FROM user WHERE user.email = ?');
				stmt2.get(req.body.email, function(err,row){
					if((row[Object.keys(row)[0]]) === 0){
						var address = req.body.location;
						geocoder.geocode(address, function(err, data){
							if(data.status === 'OK'){
								if(isValidPostcode(address) === true){
									var lng = data.results[0].geometry.location.lng
									var lat = data.results[0].geometry.location.lat
									var z = "";
									var coord = String(lat) + "," + String(lng);
									db.serialize(function () {
	                              		var stmt3 = db.prepare('INSERT INTO user(email, username, password, location, user_type,postcode) VALUES (?,?,?,?,?,?)')
	                              		stmt3.run(req.body.email, req.body.name, databasePassword, coord, user_type,req.body.location);
	                              		stmt3.finalize()
										res.redirect('/catalog/');
									});
								}
								else{
									navbar();
									function navbar(name,produce){
										db.serialize(function(){
											var stmt4 = db.prepare('SELECT * FROM category');
											stmt4.all(function(err,row){
												res.render('register', {title:"Register: Postcode invalid", category_list: row, failed_register: true});
											});
											stmt4.finalize();
										});
									}
								}

							}
							else{
									navbar();
									function navbar(name,produce){
										db.serialize(function(){
											var stmt5 = db.prepare('SELECT * FROM category');
											stmt5.all(function(err,row){
												res.render('register', {title:"Register: Postcode invalid", category_list: row, failed_register: true});
											});
											stmt5.finalize();
										});
									}

							}
						});
					}
					else{
						navbar();
							function navbar(name,produce){
								db.serialize(function(){
									var stmt6 = db.prepare('SELECT * FROM category');
									stmt6.all(function(err,row){
										res.render('register', {title:"Register: Username already in use", category_list: row, failed_register: true});
									});
									stmt6.finalize();
								});
							}
					}

				});
				stmt2.finalize();
			});
		}
	}
})

router.get('/delete', ensureAuthenticated, function(req,res,next){
	res.render('product_delete',{nav:nav, title: "Delete Product" , isAuthenticated: req.isAuthenticated(), user_detail: req.user});
})

router.post('/delete', function(req,res,next){
	//find if there is associated producer_id
	var userid;
	db.serialize(function(){
		var stmt = db.prepare('SELECT * FROM producer WHERE user_id = ?');
		stmt.all(req.user.id, function(err,row){
			userid = req.user.id;
			req.logout();
			if (typeof row[0] !== 'undefined') {
				deleteProducer(row[0])
			}
			else{
				deleteUser();
			}
		});
		stmt.finalize();
	});
	//delete associated producer

	function deleteProducer(data){
		db.serialize(function () {
			 var stmt1 = db.prepare('delete from producer where id = ?')
			 stmt1.run(data.id);
			 stmt1.finalize();
			 findProduce(data)
		 });
	}
	//find if there is produce associated with producer
	function findProduce(data){
		db.serialize(function(){
			var stmt2 = db.prepare('SELECT * FROM produce WHERE producer_id = ?');
			stmt.all(data.id, function(err,row){
				if (typeof row[0] !== 'undefined') {
					deleteProduce(data)
				}
				else{
					deleteUser()
				}
			});
			stmt2.finalize();
		});
	}
	//delete produce associated with producer
	function deleteProduce(data){
		db.serialize(function () {
			 var stmt3 = db.prepare('delete from produce where producer_id = ?')
			 stmt3.run(data.id);
			 stmt3.finalize();
			 deleteUser(data)
		 });
	}
	function deleteUser(){
		db.serialize(function () {
			var stmt4 = db.prepare('delete from user where id = ?')
			stmt4.run(userid);
			stmt4.finalize();
			redirect()
		 });
	}
	function redirect(){
		res.redirect('/')
	}









})


router.get('/updateaccount', ensureAuthenticated, function(req,res,next){
	db.serialize(function(){
		var stmt = db.prepare('SELECT * from user where user.id =  ?');
		stmt.get(req.user.id, function(err,row){
			var user_data = row;
			navbarcats(user_data)
		});
		stmt.finalize();
	});

	function navbarcats(user_data){
			nav = [];
			db.serialize(function(){
				var stmt1 = db.prepare('SELECT category.cat_name,category.id, sub_category.subcat_id, sub_category.name FROM category inner join sub_category on category.id = sub_category.category_id');
				stmt1.all(function(err,row){
					var previous = 0;
					var category;
					var sub_categorys=[];
					for (i = 0; i < row.length; i++){

							if(i == 0){
								var category = new Object();
								category.id = row[i].id;
								category.name = row[i].cat_name;
								previous = row[i].id;
								var subcategory = new Object();
								subcategory.name = row[i].name;
								subcategory.id = row[i].subcat_id;
								sub_categorys.push(subcategory);
							 }
							 else if(row[i].id != previous){
								 category.subcats = sub_categorys;
								 sub_categorys = []
								 nav.push(category)
								 var category = new Object()
								 category.id = row[i].id
								 category.name = row[i].cat_name
								 previous = row[i].id
								 var subcategory = new Object()
								 subcategory.name = row[i].name
								 subcategory.id = row[i].subcat_id
								 sub_categorys.push(subcategory)
							 }
							else{
								var subcategory = new Object()
								subcategory.name = row[i].name
								subcategory.id = row[i].subcat_id
								sub_categorys.push(subcategory)
							}
						}
						renderresults(nav, user_data)
				});
				stmt1.finalize();
			});

		}

	function renderresults(nav, user_data){
    	res.render('user_update_form', { navbar: nav, title: 'Update User Info', user_data: user_data, isAuthenticated: req.isAuthenticated(), user_detail: req.user});
  }

})


router.post('/updateaccount', function(req,res,next){

	if (req.body.password == req.body.confirm_password){

		if (req.body.email == ""){
		}
		else{
			db.serialize(function(){
	        var stmt = db.prepare('UPDATE user SET email = ? WHERE id = ?');
	        stmt.run(req.body.email, req.user.id);
	        stmt.finalize();
	        });
		}

		if (req.body.name == ""){
		}
		else{
			db.serialize(function(){
	        var stmt1 = db.prepare('UPDATE user SET username = ? WHERE id = ?');
	        stmt1.run(req.body.name, req.user.id);
	        stmt1.finalize();
	        });
		}

		if (req.body.password == ""){
		}
		else{
			var databasePassword = generateHash(req.body.password)
			db.serialize(function(){
	        var stmt2 = db.prepare('UPDATE user SET password = ? WHERE id = ?');
	        stmt2.run(databasePassword, req.user.id);
	        stmt2.finalize();
	        });
		}

		if (req.body.location == ""){
		}
		else{

			var address = req.body.location;
			geocoder.geocode(address, function(err, data){
				if(data.status === 'OK'){
					if(isValidPostcode(address) === true){
						var lng = data.results[0].geometry.location.lng
						var lat = data.results[0].geometry.location.lat
						var z = "";
						var coord = String(lat) + "," + String(lng);
						db.serialize(function(){
		        			var stmt3 = db.prepare('UPDATE user SET location = ?, postcode = ? WHERE id = ?');
		        			stmt3.run(coord, req.body.location, req.user.id);
		        			stmt3.finalize();
		       			});
					}
				}
			})
		}

		res.redirect('/');
	}

	else{
		db.serialize(function(){
			var stmt4 = db.prepare('SELECT * from user where user.id =  ?');
			stmt4.get(req.user.id, function(err,row){
				var user_data = row;
				navbarcats(user_data)
			});
			stmt4.finalize();
		});
		function navbarcats(user_data){
			nav = [];
				db.serialize(function(){
					var stmt5 = db.prepare('SELECT category.cat_name,category.id, sub_category.subcat_id, sub_category.name FROM category inner join sub_category on category.id = sub_category.category_id');
					stmt5.all(function(err,row){
						var previous = 0;
						var category;
						var sub_categorys=[];
						for (i = 0; i < row.length; i++){

								if(i == 0){
									var category = new Object();
									category.id = row[i].id;
									category.name = row[i].cat_name;
									previous = row[i].id;
									var subcategory = new Object();
									subcategory.name = row[i].name;
									subcategory.id = row[i].subcat_id;
									sub_categorys.push(subcategory);
								 }
								 else if(row[i].id != previous){
									 category.subcats = sub_categorys;
									 sub_categorys = []
									 nav.push(category)
									 var category = new Object()
									 category.id = row[i].id
									 category.name = row[i].cat_name
									 previous = row[i].id
									 var subcategory = new Object()
									 subcategory.name = row[i].name
									 subcategory.id = row[i].subcat_id
									 sub_categorys.push(subcategory)
								 }
								else{
									var subcategory = new Object()
									subcategory.name = row[i].name
									subcategory.id = row[i].subcat_id
									sub_categorys.push(subcategory)
								}
							}
							renderresults(nav, user_data)
					});
					stmt5.finalize();
				});

		}

		  		function renderresults(nav, user_data){
    				res.render('user_update_form', { navbar: nav, title: 'Update User Info', user_data: user_data, confirm_error: 'confirm password and password dont match' ,isAuthenticated: req.isAuthenticated(), user_detail: req.user});
  				}


	}
})


module.exports = router;
