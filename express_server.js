require('dotenv').config();

var express = require("express");
var app = express();
var PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  secret: process.env.SESSION_SECRET
}));

app.set("view engine", "ejs");


var urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "mike"
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "mike"
  }
};

const users = {
  "mike": {
    id: "mike",
    email: "mike@gmail.com",
    password: bcrypt.hashSync("asdf", 10)
  }
}

//random string generate function used for ID generation
function generateRandomString() {
  let text = '';
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 6; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

//function used for filtering user's urls into object, returns filtered object
function urlsForUser(id) {
  let filteredUrls = {};
  for(let url in urlDatabase) {
    if(id === urlDatabase[url].userID){
      filteredUrls[url] = urlDatabase[url];
    }
  }
  return filteredUrls;
}

//Get endpoint for root path
app.get("/", (req, res) => {
  if(req.session.user_id) {
    //if user is signed in go to urls page
    res.redirect("/urls");
  } else {
    //if user is not signed in go to login page
    res.redirect("/login");
  }
});

//get endpoint: passes url database to urls-index ejs file when path = "/urls"
app.get("/urls", (req, res) => {
  let usersUrls = urlsForUser(req.session.user_id);
  let templateVars = {
    user: users[req.session.user_id],
    urls: usersUrls
  };
  res.render("urls_index", templateVars);
});

//get endpoint: path to urls new page
app.get("/urls/new", (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  if(req.session.user_id){
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

//get endpoint: path to target url givin url's id
app.get("/urls/:id", (req, res) => {
  let userUrls = urlsForUser(req.session.user_id);
  let exists = false;
  //checks if url exists
  if(urlDatabase[req.params.id]){
    exists = true;
  }
  let templateVars = {
    user: users[req.session.user_id],
    shortURL: req.params.id,
    exists: exists
  };
  if(userUrls[req.params.id]) {
    templateVars.longURL = userUrls[req.params.id].longURL;
  } else {
    templateVars.longURL = null;
  }
  res.render("urls_show", templateVars);
});

//get endpoint: redirects to newly created short url page
app.get("/u/:id", (req, res) => {
  let longURL = urlDatabase[req.params.id].longURL;
  res.redirect(longURL);
});

//GET endpoint: allows user to login
app.get('/login', (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  if(req.session.user_id){
    //logged in
    res.redirect("/urls");
  } else {
    //not logged in
    res.render('login', templateVars);
  }
});

//GET endpoint: returns page with form containing email and password inputs
app.get('/register', (req, res) => {
  let templateVars = { user: users[req.session.user_id] };
  if(req.session.user_id){
    //logged in
    res.redirect("/urls");
  } else {
    //not logged in
    res.render('register', templateVars);
  }
});

//posts form input from urls new page
app.post("/urls", (req, res) => {
  let randomShortURL = generateRandomString();
  urlDatabase[randomShortURL] = {
    longURL: req.body.longURL,
    userID: req.session.user_id
  };
  res.redirect(`/urls/${randomShortURL}`);
});

//update long URL from /urls/:id page
app.post('/urls/:id/update', (req, res) => {
  if(urlDatabase[req.params.id].userID === req.session.user_id){
    urlDatabase[req.params.id].longURL = req.body.longURL;
    res.redirect("/urls/");
  } else if(urlDatabase[req.params.id]){
    res.send("Cannot update other users url ids");
  } else {
    res.send("Url not found");
  }
});

//delete URL from url database and redirect to urls_index
app.post('/urls/:id/delete', (req, res) => {
  if(req.session.user_id){
    if(urlDatabase[req.params.id].userID === req.session.user_id){
      delete urlDatabase[req.params.id];
      res.redirect('/urls');
    } else if(urlDatabase[req.params.id]){
      res.send("Cannot delete other users url ids");
    } else {
      res.send("Url not found");
    }
  } else {
    res.send("Login to delete your URLs");
  }
});

//POST endpoint dealing with user login
app.post('/login', (req, res) => {
  let emailFound = false;
  for(let user in users) {
    if(req.body.email === users[user].email){
      emailFound = true;
      if(bcrypt.compareSync(req.body.password, users[user].password)) {
        req.session.user_id = (users[user].id);
        res.redirect('/');
      }else {
        res.status(403).send('incorrect e-mail or password');
      }
    }
  }
  if(!emailFound){
    res.status(403).send('incorrect e-mail or password');
  }
});

//POST endpoint dealing with user login
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

//POST endpoint that takes in register form input
app.post('/register', (req, res) => {
  //check if email or password inputs are empty
  if(!req.body.email || !req.body.password){
    res.status(400).send('e-mail or password empty');
  } else {
    //check if email is already in use by other users
    for(var user in users){
      if(users[user].email === req.body.email){
        res.status(400).send('e-mail already registered');
        return 0;
      }
    }
    let randomUserId = generateRandomString();
    //hash password entered by user
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    users[randomUserId] = {
      id: randomUserId,
      email: req.body.email,
      password: hashedPassword
    }
    // console.log(users);
    req.session.user_id = (randomUserId);
    res.redirect("/urls");
  }
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});