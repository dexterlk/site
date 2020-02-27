import Router from "@koa/router"
import "highlight.js"
import Koa from "koa"
import conditional from "koa-conditional-get"
import etag from "koa-etag"
import { useStaticRendering } from "mobx-react-lite"
import React from "react"
import { renderToNodeStream } from "react-dom/server"
import { ServerStyleSheet } from "styled-components"
import { App } from "../core/components/App"
import { resetLastId } from "../message/helpers/getUniqueId"
import { SUPPORTED_ENCODINGS } from "./constants"
import { getHtmlTemplate } from "./helpers/getHtmlTemplate"
import { assignEnvironmentVariables } from "./middleware/assignEnvironmentVariables"
import { logErrors } from "./middleware/logErrors"
import { serveStaticFiles } from "./middleware/serveStaticFiles"

assignEnvironmentVariables()

// Not a hook: https://mobx-react.js.org/recipes-ssr
// eslint-disable-next-line react-hooks/rules-of-hooks
useStaticRendering(true)

const app = new Koa()
const router = new Router()

app.use(conditional())
app.use(etag({ weak: true }))

app.use(serveStaticFiles())

app.use(logErrors())

router.get("/", async context => {
  resetLastId()

  context.set("Content-Type", "text/html; charset=utf-8")

  const [templateStart, templateEnd] = getHtmlTemplate(
    context.get("User-Agent"),
  )

  const encoding = context.acceptsEncodings(
    Object.keys(SUPPORTED_ENCODINGS),
  ) as keyof typeof SUPPORTED_ENCODINGS | false

  if (encoding === false) return context.throw(406)
  context.set("Content-Encoding", encoding)

  const stream = SUPPORTED_ENCODINGS[encoding]()
  context.body = stream

  stream.write(templateStart)

  const sheet = new ServerStyleSheet()
  const app = sheet.collectStyles(<App request={context} />)
  const appStream = sheet.interleaveWithNodeStream(renderToNodeStream(app))

  appStream.pipe(stream, { end: false })

  await new Promise(resolve => appStream.once("end", resolve))

  stream.end(templateEnd)
})

router.get("/discord", context => {
  context.redirect("https://discord.gg/84HGwPZ")
  context.status = 302
})

app.use(router.middleware())

const port = Number(process.env.PORT) || 5000
app.listen(port, () => {
  console.log(`Listening on ${port}`)
})