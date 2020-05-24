var express = require('express');
var router = express.Router();
var util = require('util');
var multer = require('multer');
var multer2 = require('multer');
var multer3 = require('multer');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('catalog.db');


var resultHandler = function(err) {
    if(err) {
       console.log("unlink failed", err);
    } else {
    }
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, req.body.title.toString() + '.jpg')
  }
})

var storage2 = multer2.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads_producer/')
    },
    filename: function (req, file, cb) {
        db.serialize(function(){
        var stmt = db.prepare('SELECT * FROM producer where user_id')
        stmt.all(req.user.id, function(err,row){
          if (typeof row === 'undefined'){

            cb(null, req.body.name.toString() + '.jpg')
          }
          else{
            if(row.image === 'undefined'){
              if (req.body.name === row.name){
                cb(null, row.name.toString() + '.jpg')
              }
              else{
                cb(null, req.body.name.toString() + '.jpg')
              }
            }
            else if(row.image == '/images/producer_defaults/pic.jpg'){
              if (req.body.name === row.name){
                cb(null, row.name.toString() + '.jpg')
              }
              else{
                cb(null, req.body.name.toString() + '.jpg')
              }
            }
            else{
              fs.unlink('./public'+ row.image, resultHandler);
              if (req.body.name === row.name){
                cb(null, row.name.toString() + '.jpg')
              }
              else{
                cb(null, req.body.name.toString() + '.jpg')
              }
            }

          }


        });
      stmt.finalize();
    })
  }
})

var storage3 = multer3.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/')
    },
    filename: function (req, file, cb) {
        db.serialize(function(){
          var stmt = db.prepare('SELECT * FROM produce where produce.id = ?')
          stmt.get(req.params.id, function(err,row){
          if(row.image == '/images/category_defaults/' + row.category_id + '.jpg'){
            if (req.body.title == ""){
              cb(null, row.name.toString() + '.jpg')
            }
            else{
              cb(null, req.body.title.toString() + '.jpg')
            }
          }
          else{
            fs.unlink('./public'+ row.image, resultHandler);
            if (req.body.title == ""){
              cb(null, row.name.toString() + '.jpg')
            }
            else{
              cb(null, req.body.title.toString() + '.jpg')
            }
          }
         });
        stmt.finalize();
        })
  }
})

var upload = multer({ storage: storage })

var upload2 = multer2({ storage: storage2})

var upload3 = multer3({storage: storage3})

// Require controller modules
var category_controller = require('../controllers/categoryController');
var subcategory_controller = require('../controllers/subcategoryController');

var producer_controller = require('../controllers/producerController');
var category_instance_controller = require('../controllers/productController');


function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    next();
  } else{
    res.redirect('/users/login');
  }

}


function ensureAuthenticated1(req, res, next){
  var producer_id;
  var user_id;
  if(req.isAuthenticated()){
    if(typeof req.params.id === 'undefined'){
      next();
    }
    else{
      db.serialize(function(){
        var stmt = db.prepare('select * from produce where produce.id = ?');
        stmt.get(req.params.id, function (err,row){
          producer_id = row.producer_id;
          db.serialize(function(){
            var stmt2 = db.prepare('select * from producer where producer.id = ?');
            stmt2.get(producer_id, function(err,row){
              user_id = row.user_id;
              if(req.user.id === user_id){
                next();
              }
              else{
                  res.redirect('/');
              }

            })
            stmt2.finalize();
          })

        })
        stmt.finalize();
      })
    }
  } else{
    res.redirect('/users/login');
  }

}
/// category ROUTES ///

/* GET catalog home page. */
router.get('/', category_controller.index);

/* GET request for creating a category. NOTE This must come before routes that display category (uses id) */
router.get('/:id/sustainability_quiz', ensureAuthenticated, producer_controller.quiz_get);

router.post('/:id/sustainability_quiz', producer_controller.quiz_post);


router.get('/category/create', category_controller.category_create_get);

/* POST request for creating category. */
router.post('/category/create', category_controller.category_create_post);

/* GET request to delete category. */
router.get('/category/:id/delete', category_controller.category_delete_get);

// POST request to delete category
router.post('/category/:id/delete', category_controller.category_delete_post);

/* GET request to update category. */
router.get('/category/:id/update', category_controller.category_update_get);

// POST request to update category
router.post('/category/:id/update', category_controller.category_update_post);

/* GET request for one category. */
router.get('/category/:id', category_controller.category_detail);

/* GET request for list of all category items. */
router.get('/categories', category_controller.category_list);

/// producer ROUTES ///

/* GET request for creating producer. NOTE This must come before route for id (i.e. display producer) */
router.get('/producer/create', ensureAuthenticated, producer_controller.producer_create_get);


router.post('/producer/create', upload2.single('image'), producer_controller.producer_create_post);

/* GET request to delete producer. */
router.get('/producer/:id/delete', ensureAuthenticated, producer_controller.producer_delete_get);

// POST request to delete producer
router.post('/producer/:id/delete', producer_controller.producer_delete_post);

/* GET request to update producer. */
router.get('/producer/:id/update', ensureAuthenticated, producer_controller.producer_update_get);

// POST request to update producer
router.post('/producer/:id/update', producer_controller.producer_update_post);

/* GET request for one producer. */
router.get('/producer/:id', producer_controller.producer_detail);

/* GET request for list of all producers. */
router.get('/producers', producer_controller.producer_list);


/// product ROUTES ///

/* GET request for creating a product. NOTE This must come before route that displays product (uses id) */
router.get('/product/create', ensureAuthenticated, category_instance_controller.product_create_get);

router.get('/product/update', ensureAuthenticated, category_instance_controller.products_update_get);

router.get('/product/:id', category_instance_controller.product_detail);

/* POST request for creating product. */
router.post('/product/create', upload.single('image'), category_instance_controller.product_create_post);

/* GET request to delete product. */
router.get('/product/:id/delete', ensureAuthenticated1, category_instance_controller.product_delete_get);

// POST request to delete product
router.post('/product/:id/delete', category_instance_controller.product_delete_post);

/* GET request to update product. */
router.get('/product/:id/update', ensureAuthenticated1, category_instance_controller.product_update_get);

// POST request to update product
router.post('/product/:id/update', upload3.single('image'), category_instance_controller.product_update_post);

/* GET request for one product. */

/* GET request for list of all product. */
router.get('/products', category_instance_controller.product_list);



/// subcategory ROUTES ///


/* GET request for creating a category. NOTE This must come before routes that display category (uses id) */
router.get('/subcategory/create', subcategory_controller.subcategory_create_get);

/* POST request for creating category. */
router.post('/subcategory/create', subcategory_controller.subcategory_create_post);

/* GET request to delete category. */
router.get('/subcategory/:id/delete', subcategory_controller.subcategory_delete_get);

// POST request to delete category
router.post('/subcategory/:id/delete', subcategory_controller.subcategory_delete_post);

/* GET request to update category. */
router.get('/subcategory/:id/update', subcategory_controller.subcategory_update_get);

// POST request to update category
router.post('/subcategory/:id/update', subcategory_controller.subcategory_update_post);

/* GET request for one category. */
router.get('/subcategory/:id', subcategory_controller.subcategory_detail);

/* GET request for list of all category items. */
router.get('/subcategories', subcategory_controller.subcategory_list);

module.exports = router;
