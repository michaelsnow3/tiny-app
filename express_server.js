const express = require("express");
var methodOverride = require('method-override');
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');
const validUrl = require('valid-url');

app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  secret: "super_secret"
}));


app.set("view engine", "ejs");

let urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "mike",
    timesVisited: 0,
    uniqueVisiters: 0,
    userTimestamp: []
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "mike",
    timesVisited: 0,
    uniqueVisiters: 0,
    userTimestamp: []
  }
};

const users = {
  "mike": {
    id: "mike",
    email: "mike@gmail.com",
    password: bcrypt.hashSync("asdf", 10)
  }
};

//random string generate function used for ID generation
function generateRandomString() {
  let text = '';
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let randomLetterInc = 0; randomLetterInc < 6; randomLetterInc++) {
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

//if long url does not start with "http://" add it
  function checkURL(url){
    if(!url.startsWith("https://")){
      url = `https://${url}`;
    }
    return url;
  }

  //adds a new user object to user database
  function createNewUser(email, password, userID) {

    //hash password entered by user
    const hashedPassword = bcrypt.hashSync(password, 10);
    users[userID] = {
      id: userID,
      email: email,
      password: hashedPassword
    }
  }

  //function that returns user id if login is valid or false is login is not valid
  function validLogin(email, password) {
    for(let user in users) {
      if(email === users[user].email){
        if(bcrypt.compareSync(password, users[user].password)) {
          return users[user].id;
        }
      }
    }
    return false;
  }

//get endpoint: passes url database to urls-index ejs file when path = "/urls"
app.get("/urls", (req, res) => {
  let usersUrls = urlsForUser(req.session.user_id);
  const templateVars = {
    user: users[req.session.user_id],
    urls: usersUrls
  };
  res.render("urls_index", templateVars);
});

//get endpoint: path to urls new page
app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.session.user_id] };
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
  const templateVars = {
    user: users[req.session.user_id],
    shortURL: req.params.id,
    urlDatabase: urlDatabase[req.params.id],
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

  //check if short url exists in database
  if(!urlDatabase[req.params.id]){
    res.status(404).send("Url not found");
  }

  let longURL = urlDatabase[req.params.id].longURL;

  if (validUrl.isUri(longURL)){

    //valid url: redirect to url and add one to times url has been visited
    urlDatabase[req.params.id].timesVisited += 1;

    //check if user is unique
    if(!req.session[req.params.id]){
      req.session[req.params.id] = true;
      urlDatabase[req.params.id].uniqueVisiters ++;
    }

    //list user and timestamp
    urlDatabase[req.params.id].userTimestamp.push({
      timestamp: new Date(),
      user: req.session.user_id
    });

    res.redirect(longURL);
  } else {

    //not valid url
    res.status(404).send("URL does not exist");
  }
});

//GET endpoint: allows user to login
app.get('/login', (req, res) => {
  const templateVars = { user: users[req.session.user_id] };
  if(req.session.user_id){

    //logged in
    res.redirect("/urls");
  } else {

    // not logged in
    res.render('login', templateVars);
  }
});

//GET endpoint: returns page with form containing email and password inputs
app.get('/register', (req, res) => {
  const templateVars = { user: users[req.session.user_id] };
  if(req.session.user_id){

    //logged in
    res.redirect("/urls");
  } else {

    //not logged in
    res.render('register', templateVars);
  }
});

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

//posts form input from urls new page
app.put("/urls", (req, res) => {
  let randomShortURL = generateRandomString();
  let longUrlInput = req.body.longURL;

  longUrlInput = checkURL(longUrlInput);

  urlDatabase[randomShortURL] = {
    longURL: longUrlInput,
    userID: req.session.user_id,
    timesVisited: 0,
    uniqueVisiters: 0,
    userTimestamp: []
  };
  res.redirect(`/urls/${randomShortURL}`);
});

//PUT endpoint: update long URL from /urls/:id page
app.put('/urls/:id/update', (req, res) => {
  let shortURL = req.params.id;
  let longUrlUpdate = req.body.longURL;
  const userCanModify = urlDatabase[shortURL].userID === req.session.user_id;

  longUrlUpdate = checkURL(longUrlUpdate);

  if(userCanModify){
    urlDatabase[shortURL].longURL = longUrlUpdate;
    res.redirect("/urls/");
  } else if(urlDatabase[shortURL]){
    res.status(404).send("Cannot update other users url ids");
  } else {
    res.status(404).send("Url not found");
  }
});

//DELETE endpoint: delete URL from url database and redirect to urls_index
app.delete('/urls/:id/delete', (req, res) => {
  if(req.session.user_id){
    if(urlDatabase[req.params.id].userID === req.session.user_id){
      delete urlDatabase[req.params.id];
      res.redirect('/urls');
    } else if(urlDatabase[req.params.id]){
      res.status(404).send("Cannot delete other users url ids");
    } else {
      res.status(404).send("Url not found");
    }
  } else {
    res.status(404).send("Login to delete your URLs");
  }
});

//POST endpoint dealing with user login
app.post('/login', (req, res) => {
  if(validLogin(req.body.email, req.body.password)) {
    req.session.user_id = validLogin(req.body.email, req.body.password);
    res.redirect('/');
  } else {
    res.status(403).send('incorrect e-mail or password');
  }
});

//DELETE endpoint dealing with user login
app.delete('/logout', (req, res) => {
  delete req.session["user_id"];
  res.redirect('/urls');
});

// PUT endpoint that takes in register form input
app.put('/register', (req, res) => {

  //check if email or password inputs are empty
  if(!req.body.email || !req.body.password){
    res.status(400).send('e-mail or password empty');
  } else {

    //check if email is already in use by other users
    for(let user in users){
      if(users[user].email === req.body.email){
        res.status(400).send('e-mail already registered');
        return 0;
      }
    }
    let randomUserId = generateRandomString();
    createNewUser(req.body.email, req.body.password, randomUserId);
    req.session.user_id = (randomUserId);

    res.redirect("/urls");
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});