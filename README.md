## Welcome to EzWinApp
This web cloud system allow user to build their WIN / Linux website wrapper from a server for free

Unfortunaly for the moment this version isnt hosted !

## How it's works ?
Just give information about your app (domain, website ...) and start building
System build with Electron JS for wrap your app in for example to an .exe and after It run a VirusTotal test for scanning

## How start it
- Clone the repo
- Go in /web (`cd web`)
- Make a .env with:
DATABASE_URL=""
DATABASE_NAME=""
DATABASE_HOST=""
DATABASE_PORT=

DATABASE_USER=""
DATABASE_PASSWORD=""

VIRUSTOTAL_API_KEY=

- Run install with `npm install`
- Create DB with prisma with `npx prisma generate` and `npx prisma db push`
- Go in dist folder (`cd dist`)
- Run `node .\index.js`
- Go in http://localhost:3000
- Enjoy app