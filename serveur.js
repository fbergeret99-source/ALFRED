const express = require('express')
const session = require('express-session')
const { google } = require('googleapis')
const OpenAI = require('openai')
require('dotenv').config({ quiet: true })

const app = express()
app.use(express.json())
app.use(express.static('.'))
app.use(session({
  secret: 'alfred-secret',
  resave: false,
  saveUninitialized: true
}))

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/auth/callback'
)

// Route connexion Google
app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly']
  })
  res.redirect(url)
})

// Callback Google
app.get('/auth/callback', async (req, res) => {
  const { tokens } = await oauth2Client.getToken(req.query.code)
  req.session.tokens = tokens
  res.redirect('/')
})

// Lire les emails Gmail
app.get('/emails', async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).json({ erreur: 'Non connecté' })
  }
  oauth2Client.setCredentials(req.session.tokens)
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 5,
    q: 'is:unread'
  })
  const messages = response.data.messages || []
  const emails = await Promise.all(messages.map(async (msg) => {
    const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id })
    const headers = detail.data.payload.headers
    const sujet = headers.find(h => h.name === 'Subject')?.value || 'Sans sujet'
    const de = headers.find(h => h.name === 'From')?.value || 'Inconnu'
    const corps = detail.data.snippet || ''
    return { id: msg.id, sujet, de, corps }
  }))
  res.json(emails)
})

// Analyser un email avec OpenAI
app.post('/analyser', async (req, res) => {
  const { email } = req.body
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Tu es Alfred. Analyse cet email et détecte s'il contient une réunion. Réponds UNIQUEMENT en JSON : {"reunion": true/false, "titre": "...", "date": "...", "heure": "...", "participants": ["..."]}`
      },
      { role: 'user', content: email }
    ]
  })
  const contenu = response.choices[0].message.content
  .replace(/```json/g, '')
  .replace(/```/g, '')
  .trim()
res.json(JSON.parse(contenu))
})

app.listen(3000, () => console.log('Alfred tourne sur http://localhost:3000'))