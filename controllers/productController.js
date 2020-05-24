"use strict";
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('catalog.db');
var express = require('express');
var router = express.Router();
var util = require('util');
var multer = require('multer');
var fs = require('file-system');
var distanceCalculator = require('google-distance-matrix');

var resultHandler = function(err) {
    if(err) {
       console.log("unlink failed", err);
    } else {
    }
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
  }
})

var upload = multer({ storage: storage })
// Display list of all products
exports.product_list = function(req, res, next) {
  db.serialize(function(){
    var stmt = db.prepare('SELECT * FROM produce');
    stmt.all(function(err,row){
      res.render('produce_list', {title: "Produce", produce_list: row});
    })
  stmt.finalize();
  })
}

// Display detail page for a specific product
exports.product_detail = function(req, res, next) {
  var produce
  var nav;
  getProduce();
    function getProduce(){
      db.serialize(function(){
      var stmt = db.prepare('select * from produce where produce.id = ?');
      stmt.get(req.params.id, function(err,row){
          produce = row;
      		getProducer();
      	});
      stmt.finalize();
      });
    }

    function getProducer(){
      db.serialize(function(){
      var stmt2 = db.prepare('select * from producer where producer.id = ?')
      stmt2.get(produce.producer_id, function(err,row){
      		produce.producer = row;

      		getCategory()

        });
      stmt2.finalize();
      })
    }
    function getCategory(){
      db.serialize(function(){
      var stmt3 = db.prepare('SELECT * FROM sub_category where sub_category.subcat_id')
      stmt3.get(produce.sub_category_id, function(err,row){
        	produce.category = row;
          getImage();
        });
      stmt3.finalize()
      })
    }
    function getImage(){
      db.serialize(function(err,row){
      var stmt4 = db.prepare('SELECT * FROM produce where produce.id = ?');
      stmt4.get(req.params.id, function(err,row){
        produce.image = row.image;
        getDistance()
        });
      stmt4.finalize();
      })
    }

    function getDistance(){
      var distance = 0;
      var user_location;
      var producer_id;
      var producer_location;
        if (typeof req.user === 'undefined'){
           navbarcats();
           produce.distance = -1;
        }
        else{
          db.serialize(function(){
            var stmt6 = db.prepare('SELECT * from user where user.id = ?');
            stmt6.get(req.user.id, function(err,row){
              user_location = [row.location];
              db.serialize(function(){
              var stmt7 = db.prepare('SELECT * from produce where produce.id = ?')
              stmt7.get(req.params.id, function(err,row){
                producer_id = row.producer_id;
                db.serialize(function(){
                  var stmt8 = db.prepare('SELECT * from producer where producer.id = ?');
                  stmt8.get(producer_id, function(err,row){
                  producer_location = [row.location];
                    distanceCalculator.matrix(user_location, producer_location, function (err, distances) {
                      if (!err){
                        distanceCalculator.units('imperial');
                        distance = distances.rows[0].elements[0].distance.text;
                        produce.distance = distance;
                         navbarcats();
                      }
                      else{
                         navbarcats();
                         produce.distance = -1;
                      }
                    })

                  })
                  stmt8.finalize();
                })
              })
              stmt7.finalize();
            })

            })
            stmt6.finalize();
          })
        }



    }

  function navbarcats(){
    nav = [];
    db.serialize(function(){
    var stmt5 = db.prepare('SELECT * FROM category inner join sub_category on category.id = sub_category.category_id')
    stmt5.all(function(err,row){
        var previous = 0;
        var category;
        var sub_categorys=[];
        for (var i = 0; i < row.length; i++){

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
      stmt5.finalize();
    })

  }
  function renderresults(nav){
    res.render('produce_detail', {nav:nav, title: produce.name , produce: produce, isAuthenticated: req.isAuthenticated()});
  }
};

// Display product create form on GET
exports.product_create_get = function(req, res, next) {
  var nav;
  db.serialize(function(){
  var stmt = db.prepare('SELECT * from producer where user_id = ?')
  stmt.all(req.user.id, function(err,row){
      if (typeof row[0] === 'undefined'){
        res.redirect('/catalog/producer/create');
      }
      else{
          categories();
      }
    });
    stmt.finalize();
  });
  function categories(){
    db.serialize(function(){
    var stmt1 = db.prepare('SELECT * from category');
    stmt1.all(function(err,row){
        navbarcats();
      })
  stmt1.finalize();
  })
  }
  function navbarcats(){
    nav = [];
    db.serialize(function(){
    var stmt2 = db.prepare('SELECT category.cat_name,category.id, sub_category.subcat_id, sub_category.name FROM category inner join sub_category on category.id = sub_category.category_id')
    stmt2.all(function(err,row){
        var previous = 0;
        var category;
        var sub_categorys=[];
        for (var i = 0; i < row.length; i++){

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
    stmt2.finalize();
    });
  }
  function renderresults(nav){
    res.render('product_form', {nav:nav, title: "Create Product" , isAuthenticated: req.isAuthenticated(), user_detail: req.user});
  }
};

// Handle product create on POST
exports.product_create_post = function(req, res, next) {
  req.checkBody('title', 'Title must not be empty.').notEmpty();
  req.checkBody('category', 'Category must not be empty').notEmpty();

  req.sanitize('title').escape();
  req.sanitize('producer').escape();
  req.sanitize('title').trim();
  req.sanitize('producer').trim();
  req.sanitize('rating').escape();
  req.sanitize('weight').escape();
  req.sanitize('quantity').escape();
  req.sanitize('price').escape();
  req.sanitize('description').escape();
  var category = JSON.parse(req.body.category);

  //title: req.body.title,
  //author: req.body.author,
  //genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre.split(",")

  var errors = req.validationErrors();
  if (errors) {
    var nav;
    // Some problems so we need to re-render our book
    categories();
    function categories(){
      db.serialize(function(){
      var stmt = db.prepare('SELECT * from category')
      stmt.all(function(err,row){
          navbarcats();
        })
      stmt.finalize();
      })
    }
    function navbarcats(){
      nav = [];
      db.serialize(function(){
      var stmt1 = db.prepare('SELECT category.cat_name,category.id, sub_category.subcat_id, sub_category.name FROM category inner join sub_category on category.id = sub_category.category_id')
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
            renderresults(nav)
        });
      stmt1.finalize();
      });

    }
    function renderresults(nav){
      res.render('product_form', {nav:nav, title: "Create Product" , isAuthenticated: req.isAuthenticated(), user_detail: req.user ,errors:errors});
    }
  }
  else {
    var producer_id;
    if(req.file === undefined){
      var image_data = '/images/category_defaults/' + category.category.toString() + '.jpg'
    }
    else{
      var image_data = '/uploads/' + req.body.title.toString() + '.jpg'
    }

    db.serialize(function(){
      var stmt2 = db.prepare('SELECT * from producer where user_id = ?')
      stmt2.get(req.user.id, function(err,row){
        producer_id = row.id;
        enterProduct();
      })
    stmt2.finalize();
    })
    function enterProduct(){
      db.serialize(function () {
         var stmt3 = db.prepare('INSERT INTO produce(name,category_id,producer_id,price,rating,quantity,description,weight,sub_category_id,image) VALUES (?,?,?,?,?,?,?,?,?,?)')
         stmt3.run(req.body.title,category.category,producer_id,req.body.price,req.body.rating,req.body.quantity,req.body.description,req.body.weight,category.subcat, image_data );
         stmt3.finalize();
         db.serialize(function(){
         var stmt4 = db.prepare('SELECT * FROM produce where name = ?');
         stmt4.get(req.body.title,function(err,row){
             res.redirect('/catalog/product/' + row.id);
           });
          stmt4.finalize();
          });
       })
     }
   }
};

// Display product delete form on GET
exports.product_delete_get = function(req, res, next) {
  res.render('product_delete',{nav:nav, title: "Delete Product" , isAuthenticated: req.isAuthenticated(), user_detail: req.user});
};

// Handle product delete on POST
exports.product_delete_post = function(req, res, next) {
    db.serialize(function () {
       var stmt = db.prepare('delete from produce where id = ?')
       stmt.run(req.params.id);
       stmt.finalize();
     });
    res.redirect('/catalog/product/update');

};

// Display product update form on GET
exports.products_update_get = function(req, res, next) {
     categories();
  function categories(){
    db.serialize(function(){
    var stmt = db.prepare('SELECT * from category');
    stmt.all(function(err,row){
        navbarcats();
      })
    stmt.finalize();
    })
  }
  function navbarcats(){
    nav = [];
    db.serialize(function(){
    var stmt1 = db.prepare('SELECT category.cat_name,category.id, sub_category.subcat_id, sub_category.name FROM category inner join sub_category on category.id = sub_category.category_id')
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
          getProducerUpdate(nav);
      });
    stmt1.finalize();
    });
  }
  function getProducerUpdate(nav){
    db.serialize(function(){
    var stmt2 = db.prepare('SELECT * FROM producer where user_id = ?')
    stmt2.all(req.user.id, function(err,row){
       if(typeof row[0] === 'undefined'){
          res.redirect('/catalog/producer/create');
       }
       else{
          getProduceUpdate(nav,row[0]);
       }
     });
    stmt2.finalize();
    })
  }
  function getProduceUpdate(nav,data){
    db.serialize(function(){
    var stmt3 = db.prepare('SELECT * FROM produce where producer_id = ?');
    stmt3.all(data.id, function(err,row){
              if(typeof row[0] === 'undefined'){
                res.redirect('/catalog/product/create');
              }
              else{
                data.produce = row;
                renderresults(nav,data);
              }

      })
    stmt3.finalize();
    })
  }
  function renderresults(nav,data){
    res.render('product_list_update', {nav:nav, title: "Create Product" , isAuthenticated: req.isAuthenticated(), user_detail: req.user, data : data});
  }
}

exports.product_update_get = function(req, res, next) {
  var data;
  db.serialize(function(){
  var stmt = db.prepare('select * from produce where produce.id = ?');
  stmt.get(req.params.id, function(err,row){
      data = row;
      navbarcats();
    });
  stmt.finalize();
  })

 function navbarcats(){
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
          renderresults()
      });
    stmt1.finalize();
    });

  }
function renderresults(){
  res.render('product_update', {nav:nav, title: "Update Product" , isAuthenticated: req.isAuthenticated(), user_detail: req.user, data : data});
}
}
// Handle product update on POST
exports.product_update_post = function(req, res, next) {
  db.serialize(function(){
  var stmt = db.prepare('SELECT * FROM produce where produce.id = ?')
  stmt.get(req.params.id, function(err,row){
      var producer_id;
      // update image
      if(req.file === undefined){
        //not changing file
      }
      else {
        if(req.body.title == ""){
          var image_data = '/uploads/' + row.name.toString() + '.jpg'
          var stmt12 = db.prepare('UPDATE produce SET image = ? WHERE id = ?');
          stmt12.run(image_data, row.id);
          stmt12.finalize();
        }
        else{
          var image_data = '/uploads/' + req.body.title.toString() + '.jpg'
          db.serialize(function(){
          var stmt1 = db.prepare('UPDATE produce SET image = ? WHERE id = ?');
          stmt1.run(image_data, row.id);
          stmt1.finalize();
          });
        }
      }

      //update title
      if(req.body.title == ""){
        //dont update title
      }
      else{
          if (req.file == undefined){
            if ( row.image === '/images/category_defaults/' + row.category_id + '.jpg'){
            }
            else {
              fs.rename('./public'+ row.image, './public/uploads/' + req.body.title + '.jpg', resultHandler);
              db.serialize(function(){
              var stmt2 = db.prepare('UPDATE produce SET image = ? WHERE id = ?')
              stmt2.run('/uploads/' + req.body.title + '.jpg', row.id);
              stmt2.finalize();
              });

            }
          }
          db.serialize(function(){
          var stmt3 = db.prepare('UPDATE produce SET name = ? WHERE id = ?')
          stmt3.run(req.body.title, row.id);
          stmt3.finalize();
          });

      }
      // update price
         if(req.body.price == ""){
          //dont update price
      }
      else{
         db.serialize(function(){
          var stmt4 = db.prepare('UPDATE produce SET price = ? WHERE id = ?')
          stmt4.run(req.body.price, row.id);
          stmt4.finalize();
          });

      }

      //update rating

      if(req.body.rating == ""){
      }
      else{
         db.serialize(function(){
          var stmt5 = db.prepare('UPDATE produce SET rating = ? WHERE id = ?')
          stmt5.run(req.body.rating, row.id);
          stmt5.finalize();
          });

      }

      // update quantity

         if(req.body.quantity == ""){
      }
      else{
         db.serialize(function(){
          var stmt6 = db.prepare('UPDATE produce SET quantity = ? WHERE id = ?')
          stmt6.run(req.body.quantity, row.id);
          stmt6.finalize();
          });

      }

      // update weight

         if(req.body.weight == ""){
      }
      else{
         db.serialize(function(){
          var stmt7 = db.prepare('UPDATE produce SET weight = ? WHERE id = ?')
          stmt7.run(req.body.weight, row.id);
          stmt7.finalize();
          });

      }

      //

         if(req.body.description == ""){
      }
      else{
         db.serialize(function(){
          var stmt8 = db.prepare('UPDATE produce SET description = ? WHERE id = ?')
          stmt8.run(req.body.description, row.id);
          stmt8.finalize();
          });

      }


      res.redirect('/catalog/product/' + row.id);


    });
  stmt.finalize();
  })

}
