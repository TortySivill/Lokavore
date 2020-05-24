"use strict";
var async = require('async');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('catalog.db');
var distanceCalculator = require('google-distance-matrix');



// Display list of all categorys
exports.subcategory_list = function(req, res, next) {
  db.serialize(function(){
  var stmt = db.prepare('SELECT * FROM sub_category');
  stmt.all(function(err,row){
      res.render('category_list', {category_list: row, title: "Sub categories"});
    });
  stmt.finalize();
  });


};

// Display detail page for a specific category
exports.subcategory_detail = function(req, res, next) {
  var category;
  var produce;
  var produceList;
  var nav;
  categoryName();
  function categoryName(){
    db.serialize(function(){
    var stmt = db.prepare('SELECT * FROM sub_category where subcat_id = ?');
    stmt.get(req.params.id, function(err,row){
        category = row;
        categoryProduce();
      })
      stmt.finalize();
    });
  }
  function categoryProduce(){
    db.serialize(function(){
    var stmt1 = db.prepare('SELECT * from produce where sub_category_id = ?');
    stmt1.all(req.params.id, function(err,row){
        produceList = row;
        iterator(0);

      })
      stmt1.finalize;
    });
  }

  function iterator(i)
  {
    if (i == produceList.length){
      produce = produceList;
      navbarcats();
    }
    else{
      getDistance(produceList[i].id, i)
    }
  }

   function getDistance(produce_id, i){
      var distance = 0;
      var user_location;
      var producer_id;
      var producer_location;

          if (typeof req.user === 'undefined'){
            produceList[i].distance = -1;
            i = i + 1;
            iterator(i);
          }
          else{
            db.serialize(function(){
              var stmt6 = db.prepare('SELECT * from user where user.id = ?');
              stmt6.get(req.user.id, function(err,row){
                user_location = [row.location];
              db.serialize(function(){
                var stmt7 = db.prepare('SELECT * from produce where produce.id = ?')
                stmt7.get(produce_id, function(err,row){
                  producer_id = row.producer_id;
                  db.serialize(function(){
                    var stmt8 = db.prepare('SELECT * from producer where producer.id = ?');
                    stmt8.get(producer_id, function(err,row){
                    if(typeof row === 'undefined'){
                      produceList[i].distance = -1;
                      i = i + 1;
                      iterator(i);
                    }
                    else{
                      producer_location = [row.location];
                        distanceCalculator.matrix(user_location, producer_location, function (err, distances) {
                          if (!err){
                            distanceCalculator.units('imperial');
                            distance = distances.rows[0].elements[0].distance.text;
                            produceList[i].distance = distance;
                            i = i + 1;
                            iterator(i);
                          }
                          else{
                            produceList[i].distance = -1;
                            i = i + 1;
                            iterator(i);
                          }


                      })
                      }

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
      var stmt2 = db.prepare('SELECT category.cat_name,category.id, sub_category.subcat_id, sub_category.name FROM category inner join sub_category on category.id = sub_category.category_id');
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
    res.render('category_detail', {nav:nav, title : category.name, category: category,  produce: produce ,isAuthenticated: req.isAuthenticated()});
  }


};


// Display category create form on GET
exports.subcategory_create_get = function(req, res, next) {
  res.render('category_form', { title: 'Create Category' });
};

// Handle category create on POST
exports.subcategory_create_post = function(req, res, next) {

    //Check that the name field is not empty
    req.checkBody('name', 'Category name required').notEmpty();

    //Trim and escape the name field.
    req.sanitize('name').escape();
    req.sanitize('name').trim();

    //Run the validators
    var errors = req.validationErrors();

    //Create a genre object with escaped and trimmed data.
    var category = new Object(
      { name: req.body.name }
    );

    if (errors) {
        res.render('category_form', { title: 'Create Category', category: category, errors: errors});
    return;
    }
    else {
        // Data from form is valid.
        //Check if Genre with same name already exists
        db.serialize(function(){
          var stmt = db.prepare('SELECT * FROM category where name = ?');
          stmt.all(req.body.name, function(err,row){
               
                 if (err) { return next(err); }

                 if (typeof row[0] !== 'undefined') {
                     res.redirect('/catalog/category/' + row[0].id);
                 }
                 else {
                   db.serialize(function () {
                      var stmt1 = db.prepare('INSERT INTO category(name) VALUES (?)')
                      stmt1.run(req.body.name)
                      stmt1.finalize()
                      db.serialize(function(){
                        var stmt2 = db.prepare('ELECT * FROM category where name = ?');
                        stmt2.get(req.body.name, function(err,row){
                          res.redirect('/catalog/category/' + row.id);
                        });
                        stmt2.finalize();
                      });

                    });
                 }
               });
              stmt.finalize();
            });

    }
}

// Display category delete form on GET
exports.subcategory_delete_get = function(req, res, next) {
    res.send('NOT IMPLEMENTED: category delete GET');
};

// Handle category delete on POST
exports.subcategory_delete_post = function(req, res, next) {
    res.send('NOT IMPLEMENTED: category delete POST');
};

// Display category update form on GET
exports.subcategory_update_get = function(req, res, next) {
    res.send('NOT IMPLEMENTED: category update GET');
};

// Handle category update on POST
exports.subcategory_update_post = function(req, res, next) {
    res.send('NOT IMPLEMENTED: category update POST');
};
