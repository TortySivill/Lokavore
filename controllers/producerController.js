"use strict";

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('catalog.db');
var geocoder = require('geocoder');
var fs = require('file-system');

var resultHandler = function(err) {
    if(err) {
       console.log("unlink failed", err);
    } else {
    }
}
// Display list of all producers
exports.producer_list = function(req, res, next) {
  var producer_list;
  var markers;
  var nav;

  db.serialize(function(){
    var stmt = db.prepare('SELECT * FROM producer')
    stmt.all(function(err,row){
      producer_list = row;
      db.serialize(function(){
        var stmt2 = db.prepare('select name,location,summary,id FROM producer');
        stmt2.all(function(err,data){
          markers = data;
          navbarcats();
        })
        stmt2.finalize();
      })
    })
    stmt.finalize();
  })
  function navbarcats(){
    nav = [];
    var previous;
      db.serialize(function () {
        var stmt = db.prepare('SELECT * from category inner join sub_category on category.id = sub_category.category_id');
        stmt.all(function(err,row){
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
      stmt.finalize()
      })

  }
  function renderresults(nav){
    var markerList = new Array();
    for(var a = 0; a < markers.length; a++){
      var st = markers[a].location.split(",");
      var lat = st[0];
      var lang = st[1];
      markerList[a] = [markers[a].name, lat, lang, markers[a].summary, markers[a].id];
    }
    res.render('producer_list', {nav:nav, title: "Producers", "producer_list": producer_list, markerList: markerList ,isAuthenticated: req.isAuthenticated()});
  }
}

function isValidPostcode(p) {
  var postcodeRegEx = /[A-Z]{1,2}[A-Z0-9]{1,2} ?[0-9][A-Z]{2}/i;
  return postcodeRegEx.test(p);
}

// Display detail page for a specific producer
exports.producer_detail = function(req, res, next) {
  var nav;
  var detail;
  producerName();
  function producerName(){
    db.serialize(function(){
      var stmt = db.prepare("SELECT * FROM producer where id = ?");
      stmt.get(req.params.id, function(err,row){
        detail = row;
        navbarcats();
      })
      stmt.finalize()
    })
  }

  function navbarcats(){
    nav = [];
    var previous;
      db.serialize(function () {
        var stmt = db.prepare('SELECT * from category inner join sub_category on category.id = sub_category.category_id');
        stmt.all(function(err,row){
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
            producerProduce(row);
        });
      stmt.finalize()
      })

  }

  function producerProduce(){
    db.serialize(function(){
      var stmt = db.prepare('SELECT * from produce where producer_id = ?');
      stmt.all(req.params.id, function(err,row){
        detail.produce = row;
        var st = detail.location.split(",");
        var lat = st[0];
        var lang = st[1];
        res.render('producer_detail', {producer_detail: detail, nav: nav, lat: lat, lang: lang, producer:row});
      })
      stmt.finalize();
    })
  }
}

// Display producer create form on GET
exports.producer_create_get = function(req, res, next) {
  var producer;
  getProducerInfo();
  function getProducerInfo(){
    db.serialize(function(){
      var stmt = db.prepare('SELECT * FROM producer where user_id = ?')
      stmt.all(req.user.id, function(err,row){
        renderresults(row);
      })
    stmt.finalize();
    })
  }
  function renderresults(producer){
    res.render('producer_form', { title: 'Create Producer' ,isAuthenticated: req.isAuthenticated(), user_detail: req.user , producer:producer[0]});
  }
};

// Handle producer create on POST
exports.producer_create_post = function(req, res, next) {
      db.serialize(function(){
      var stmt = db.prepare('SELECT * FROM producer WHERE user_id = ?')
      stmt.all(req.user.id, function(err,row){
          if (typeof row[0] !== 'undefined') {
            updateProducer()
          }
          else {
            addProducer()
          }
        })
      stmt.finalize();
      })

      function updateProducer(){
        //Check that the name field is not empty
        req.checkBody('name', 'Producer name required').notEmpty();
        req.checkBody('speciality', 'Speciality name required').notEmpty();
        req.checkBody('location', 'Location required').notEmpty();
        req.checkBody('summary', 'Summary required').notEmpty();
        req.checkBody('phone', 'Phone required').notEmpty();



        //Trim and escape the name field.
        req.sanitize('name').escape();
        req.sanitize('name').trim();

        //Run the validators
        var errors = req.validationErrors();
        var producer = new Object(
          { name: req.body.name }
        );

        if (errors) {
            res.render('producer_form', { title: 'Create Producer', producer: producer, errors: errors,isAuthenticated: req.isAuthenticated(), user_detail: req.user });
        }
        else {
           db.serialize(function(){
           var stmt = db.prepare('SELECT * FROM producer where user_id = ?')
           stmt.all(req.user.id, function(err,row){
             if(req.file === undefined){

                  if(row[0].image === '/images/producer_defaults/pic.jpg'){
                      var image_data = '/images/producer_defaults/pic.jpg';
                  }
                  else{
                        fs.rename('./public'+ row[0].image, './public/uploads_producer/' + req.body.name + '.jpg', resultHandler);
                       var image_data = '/uploads_producer/' + req.body.name + '.jpg'
                  }

              }
              else{
                    var image_data = '/uploads_producer/' + req.body.name + '.jpg'

              }




             var address = req.body.location;
             geocoder.geocode(address, function(err, data){
             if(data.status === 'OK'){
                if(isValidPostcode(address) === true){
                  var lng = data.results[0].geometry.location.lng
                  var lat = data.results[0].geometry.location.lat
                  var coord = String(lat) + "," + String(lng);
                    db.serialize(function(){
                    var stmt2 = db.prepare('SELECT * FROM producer where user_id = ?')
                    stmt2.get(req.user.id, function(err,row){
                      db.serialize(function () {
                        var stmt3 = db.prepare('UPDATE producer SET  name = ? , speciality =? , summary = ?, location = ?, phone = ?, image = ?, postcode = ? WHERE  id =?');
                        stmt3.run(req.body.name, req.body.speciality, req.body.summary, coord, req.body.phone, image_data,req.body.location,row.id)
                        stmt3.finalize()
                        res.redirect('/catalog/producer/' + row.id);
                      });
                    })
                  stmt2.finalize();
                  });
                }
                else{
                  res.render('producer_form', { title: 'Create Producer: Invalid Postcode', isAuthenticated: req.isAuthenticated(), user_detail: req.user });

                }
                }
                else{
                  res.render('producer_form', { title: 'Create Producer: Invalid Postcode', isAuthenticated: req.isAuthenticated(), user_detail: req.user });

                }
            });
            });
          stmt.finalize();
          });
         }
       }


      function addProducer(){
        //Check that the name field is not empty
        req.checkBody('name', 'Producer name required').notEmpty();
        req.checkBody('speciality', 'Speciality name required').notEmpty();
        req.checkBody('location', 'Location required').notEmpty();
        req.checkBody('summary', 'Summary required').notEmpty();
        req.checkBody('phone', 'Phone required').notEmpty();


        //Trim and escape the name field.
        req.sanitize('name').escape();
        req.sanitize('name').trim();

        //Run the validators
        var errors = req.validationErrors();

        var producer = new Object(
          { name: req.body.name }
        );

        if (errors) {
            //If there are errors render the form again, passing the previously entered values and errors
            res.render('producer_form', { title: 'Create Producer', producer: producer, errors: errors,isAuthenticated: req.isAuthenticated(), user_detail: req.user });
            return;
        }
        else {
            // Data from form is valid.
            //Check if Genre with same name already exists
            db.serialize(function(){
            var stmt = db.prepare('SELECT * FROM producer where name = ?')
            stmt.all(req.body.name, function(err,row){

                       if (err) { return next(err); }

                       if (typeof row[0] !== 'undefined') {
                           //Genre exists, redirect to its detail page
                           res.redirect('/catalog/producer/' + row[0].id);
                       }
                       else {

                         if(req.file === undefined){
                            var image_data = '/images/producer_defaults/pic.jpg';
                          }
                         else{
                            var image_data = '/uploads_producer/' + req.body.name.toString() + '.jpg'
                         }

                         var address = req.body.location;
                         geocoder.geocode(address, function(err, data){
                         if(data.status === 'OK'){
                            if(isValidPostcode(address) === true){
                              var lng = data.results[0].geometry.location.lng
                              var lat = data.results[0].geometry.location.lat
                              var coord = String(lat) + "," + String(lng);
                              db.serialize(function () {
                              var stmt2 = db.prepare('INSERT INTO producer(name, speciality, summary, location, phone, rating, user_id, image, postcode) VALUES (?,?,?,?,?,?,?,?,?)')
                              stmt2.run(req.body.name, req.body.speciality, req.body.summary, coord, req.body.phone, req.body.rating, req.user.id, image_data,req.body.location)
                              stmt2.finalize()
                              db.serialize(function(){
                              var stmt3 = db.prepare('SELECT * FROM producer where name = ?');
                              stmt3.get(req.body.name, function(err,row){
                                  res.redirect('/catalog/'+row.id+'/sustainability_quiz/');
                                });
                              stmt3.finalize();
                              })
                            });
                            }
                            else{
                              res.render('producer_form', { title: 'Create Producer: Invalid Postcode', isAuthenticated: req.isAuthenticated(), user_detail: req.user });

                            }
                          //Genre saved. Redirect to genre detail page


                          }
                          else{
                              res.render('producer_form', { title: 'Create Producer: Invalid Postcode', isAuthenticated: req.isAuthenticated(), user_detail: req.user });

                          }
                        });
                       }
                     });
                    stmt.finalize();
                    })

        }
      }
    }

// Display producer delete form on GET
exports.producer_delete_get = function(req, res, next) {
    res.send('NOT IMPLEMENTED: producer delete GET');
};

// Handle producer delete on POST
exports.producer_delete_post = function(req, res, next) {
    res.send('NOT IMPLEMENTED: producer delete POST');
};

// Display producer update form on GET
exports.producer_update_get = function(req, res, next) {
    res.send('NOT IMPLEMENTED: producer update GET');
};

// Handle producer update on POST
exports.producer_update_post = function(req, res, next) {
    res.send('NOT IMPLEMENTED: producer update POST');
};

exports.quiz_get = function(req, res, next){
  res.render('sustainability_quiz', {isAuthenticated: req.isAuthenticated(), user_detail: req.user , producer_id: req.params.id});
}
exports.quiz_post = function(req, res, next){
    db.serialize(function () {
      var stmt = db.prepare('UPDATE producer SET  rating = ? WHERE  id =?');
      stmt.run(req.body.total, req.params.id );

      stmt.finalize();

    });

  //assign sustainability rating to req.params.id


}
