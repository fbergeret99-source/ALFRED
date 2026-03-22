const OpenAI = require('openai')
require('dotenv').config()

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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

  const resultat = JSON.parse(response.choices[0].message.content)
  return resultat
}

const emailTest = `Bonjour, est-ce qu'on peut se retrouver jeudi à 15h pour discuter du projet ? Thomas`

detecterReunion(emailTest).then(resultat => {
  console.log('Résultat Alfred :', resultat)
})
