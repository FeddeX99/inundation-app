//works locally ///////////////////
// let express = require("express");
// let app = express();

// app.use(function(req, res, next) {
//     console.log(`${new Date()} - ${req.method} request for ${req.url}`);
//     next();
// });

// app.use(express.static("../static"));

// app.listen(81, function() {
//     console.log("Serving static on 81");
// });

// const express = require('express')
// const app = express()
// const port = process.env.PORT || 3000

// app.get('/', (req, res) => {
//   res.send('Hello World!')
// })

// app.listen(port, () => {
//   console.log(`Example app listening at http://localhost:${port}`)
// })

const express = require('express')
const app = express()

const port = process.env.PORT || 3000

app.use(function(req, res, next) {
    console.log(`${new Date()} - ${req.method} request for ${req.url}`);
    next();
});

app.use(express.static('public'))

app.listen(port)

