const http = require('http')
const fs = require('fs')
const OpenAI = require('openai')
require('dotenv').config({ quiet: true })

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function detecterReunion(email) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Tu es Alfred, un assistant personnel. Analyse cet email et détecte s'il contient une réunion ou un rendez-vous. Réponds UNIQUEMENT en JSON avec ce format : {"reunion": true ou false, "titre": "titre de la réunion", "date": "la date mentionnée", "heure": "l'heure mentionnée", "participants": ["liste des participants"]}`
      },
      {
        role: 'user',
        content: email
      }
    ]
  })
  return JSON.parse(response.choices[0].message.content)
}

const serveur = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const html = fs.readFileSync('./index.html', 'utf8')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  }

  else if (req.method === 'POST' && req.url === '/analyser') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      const { email } = JSON.parse(body)
      const resultat = await detecterReunion(email)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(resultat))
    })
  }
})

serveur.listen(3000, () => {
  console.log('Alfred tourne sur http://localhost:3000')
})