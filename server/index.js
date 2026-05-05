const app = require('./app')

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Roster API running on http://localhost:${port}`))
