var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash       = require("connect-flash"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    methodOverride = require("method-override"),
    Tavern      = require("./models/tavern"),
    Comment      = require("./models/comment"),
    User        = require("./models/user"),
    seedDB      = require("./seeds");

//mongoose.connect("mongodb://localhost/taverntime");
mongoose.connect("mongodb://jason:041427jc@ds231991.mlab.com:31991/taverntime");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
console.log(__dirname);
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require("moment");
//seedDB();

// PASSPORT CONFIG

app.use(require("express-session")({
    secret: "Phase Variance",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user; 
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
});

//########################
//LANDING ROUTE
//########################

app.get("/", function(req, res){
   res.render("landing"); 
});

//########################
//TAVERN ROUTES
//########################

app.get("/taverns", function(req, res){
        Tavern.find({}, function(err, allTaverns) {
        if(err){
            console.log(err);
        } else {
            res.render("taverns/taverns", {tavernsites:allTaverns, currentUser: req.user});
        }
    });
});

app.post("/taverns", isLoggedIn, function(req, res){
   var name = req.body.name;
   var price = req.body.price;
   var image = req.body.image;
   var desc = req.body.description;
   var author = {
       id: req.user._id,
       username: req.user.username
   };
   var newTavern = {name: name, price: price, image: image, description:desc, author:author};
   Tavern.create(newTavern, function(err, newlyCreated){
      if(err){
          console.log(err);
      } else {
         res.redirect("/taverns"); 
      } 
   });
});

app.get("/taverns/new",isLoggedIn, function(req, res) {
   res.render("taverns/new.ejs"); 
});

app.get("/taverns/:id", function(req, res){
   Tavern.findById(req.params.id).populate("comments").exec(function(err, foundTavern){
      if(err){
          console.log(err);
      } else {
          console.log(foundTavern);
          res.render("taverns/show", {tavern: foundTavern}); 
      }
   });
});

//EDIT TAVERN

app.get("/taverns/:id/edit", checkTavernOwnership, function(req, res) {
    Tavern.findById(req.params.id, function(err, foundTavern) {
        res.render("taverns/edit", {tavern: foundTavern});
    });
});

//UPDATE TAVERN

app.put("/taverns/:id", checkTavernOwnership, function(req, res){
    Tavern.findByIdAndUpdate(req.params.id, req.body.tavern, function(err, updatedCampground){
       if(err){
           res.redirect("/taverns");
       } else {
           res.redirect("/taverns/" + req.params.id);
       }
    });
});

//DESTROY TAVERN

app.delete("/taverns/:id", checkTavernOwnership, function(req, res){
   Tavern.findByIdAndRemove(req.params.id, function(err){
      if(err) {
          res.redirect("/taverns");
      } else {
          res.redirect("/taverns");
      }
   });
});

//####################
// COMMENT ROUTES
//####################

app.get("/taverns/:id/comments/new", isLoggedIn, function(req, res){
   Tavern.findById(req.params.id, function(err, tavern){
      if(err){
          console.log(err);
      } else {
          res.render("comments/new", {tavern: tavern});
      }
   });
});

app.post("/taverns/:id/comments",isLoggedIn, function(req, res){
   Tavern.findById(req.params.id, function(err, tavern){
      if(err){
          console.log(err);
          res.redirect("/taverns");
      } else {
          Comment.create(req.body.comment, function(err, comment){
              if(err){
                  console.log(err);
              } else {
                  comment.author.id = req.user._id;
                  comment.author.username = req.user.username;
                  comment.save();
                  tavern.comments.push(comment);
                  tavern.save();
                  res.redirect('/taverns/' + tavern._id);
              }
          });
      }
   }); 
});


//EDIT COMMENT

app.get("/taverns/:id/comments/:comment_id/edit", checkCommentOwnership, function(req, res) {
    Comment.findById(req.params.comment_id, function(err, foundComment) {
        if(err) {
            res.redirect("back");
        } else {
            res.render("comments/edit", {tavern_id: req.params.id, comment: foundComment}); 
        }
    });
});

//UPDATE COMMENT

app.put("/taverns/:id/comments/:comment_id", checkCommentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
       if(err) {
           res.redirect("back");
       } else {
           res.redirect("/taverns/" + req.params.id );
       }
    });
});

//DESTROY COMMENT

app.delete("/taverns/:id/comments/:comment_id", checkCommentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err){
            res.redirect("back");
        } else {
            res.redirect("/taverns/" + req.params.id);
        }
    });
});

//###################
// AUTH ROUTES
//###################

app.get("/register", function(req, res){
   res.render("register"); 
});

//Handle sign up logic.

app.post("/register", function(req, res){
   var newUser = new User({username: req.body.username});
   User.register(newUser, req.body.password, function(err, user){
       if(err){
           console.log(err);
           return res.render("register");
       }
       passport.authenticate("local")(req, res, function(){
          res.redirect("/taverns"); 
       });
   }); 
});

//Show login form

app.get("/login", function(req, res){
   res.render("login"); 
});

//login route

app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/taverns",
        failureRedirect: "/login"
    }), function(req, res){
});

//logout route

app.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "Logged you out.");
   res.redirect("/taverns");
});

//#######################
//MIDDLEWARE
//#######################

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "Please login first.");
    res.redirect("/login");
}

function checkTavernOwnership(req, res, next) {
    if(req.isAuthenticated()){
        Tavern.findById(req.params.id, function(err, foundTavern) {
            if(err) {
                res.redirect("back");
            } else {
            if(foundTavern.author.id.equals(req.user._id)) {
                next();
            } else {
                res.redirect("back");    
            }  
                    
            }   
            });
        } else {
            res.redirect("back");
        }
    }
    
function checkCommentOwnership(req, res, next) {
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment) {
            if(err) {
                res.redirect("back");
            } else {
            if(foundComment.author.id.equals(req.user._id)) {
                next();
            } else {
                res.redirect("back");    
            }  
                    
            }   
            });
        } else {
            res.redirect("back");
        }
    }


//###############
// LISTENER
//###############

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("The Tavern Time server has started!");
});