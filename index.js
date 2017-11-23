require('dotenv-extended').load()
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const { connector, bot } = require('./src/init')

const app = express()
app.use(express.static('public'))
app.use(
  bodyParser.json({
    limit: '300mb',
    extended: true,
    parameterLimit: 1000
  })
)
app.use(
  bodyParser.urlencoded({
    limit: '300mb',
    extended: true,
    parameterLimit: 1000
  })
)

app.set('port', process.env.PORT || 5000)

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './public/chat.html'))
})

app.post('/api/messages', connector.listen())

app.listen(app.get('port'), () => {
  console.log('Node app is running on port', app.get('port'))
})
