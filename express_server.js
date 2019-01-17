var express = require("express");
var app = express();
var PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");


var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  },
  "user3RandomID": {
    id: "user3RandomID",
    email: "user3@example.com",
    password: "asdf"
  }
}


function generateRandomString() {
  let text = '';
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 6; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

//get endpoint: passes url database to urls-index ejs file when path = "/urls"
app.get("/urls", (req, res) => {
  let templateVars = {
    user: users[req.cookies.user_id],
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});

//get endpoint: path to urls new page
app.get("/urls/new", (req, res) => {
  let templateVars = { user: users[req.cookies.user_id] };
  res.render("urls_new", templateVars);
});

//posts form input from urls new page
app.post("/urls", (req, res) => {
  let randomShortURL = generateRandomString();
  urlDatabase[randomShortURL] = req.body.longURL;
  res.redirect(`/urls/${randomShortURL}`);
});

//get endpoint: redirects to newly created short url page
app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

//get endpoint: path to target url givin url's id
app.get("/urls/:id", (req, res) => {
  let templateVars = {
    user: users[req.cookies.user_id],
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id]
  };
  res.render("urls_show", templateVars);
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

//delete URL from url database and redirect to urls_index
app.post('/urls/:id/delete', (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

//update long URL from /urls/:id page
app.post('/urls/:id/update', (req, res) => {
  urlDatabase[req.params.id] = req.body.longURL;
  res.redirect("/urls/");
});

//GET endpoint: allows user to login
app.get('/login', (req, res) => {
  let templateVars = { user: users[req.cookies.user_id] };
  res.render('login', templateVars);
});

//POST endpoint dealing with user login
app.post('/login', (req, res) => {
  let emailFound = false;
  for(let user in users) {
    if(req.body.email === users[user].email){
      emailFound = true;
      if(req.body.password === users[user].password){
        res.cookie('user_id', users[user].id);
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
  res.clearCookie('user_id', {});
  res.redirect('/urls');
});

//GET endpoint: returns page with form containing email and password inputs
app.get('/register', (req, res) => {
  let templateVars = { user: users[req.cookies.user_id] };
  res.render('register', templateVars);
})

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
    users[randomUserId] = {
      id: randomUserId,
      email: req.body.email,
      password: req.body.password
    }
    // console.log(users);
    res.cookie('user_id', randomUserId);
    res.redirect("/urls");
  }
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});