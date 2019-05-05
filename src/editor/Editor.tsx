import React, { useState } from "react"
import { Message } from "../message/Message"
import { EmbedEditor } from "./EmbedEditor"
import { FileInput } from "./FileInput"
import { InputField } from "./InputField"
import { parseMessage, stringifyMessage } from "./json/json"
import { JsonInput } from "./json/JsonInput"
import { Button, Container } from "./styles"
import { WebhookInput } from "./WebhookInput"

interface Props {
  message: Message
  onChange: (message: Message) => void
}

export const Editor = (props: Props) => {
  const [webhookUrl, setWebhookUrl] = useState("")
  const [json, setJson] = useState(stringifyMessage(props.message))
  const [errors, setErrors] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [files, setFiles] = useState<FileList | undefined>()

  const handleChange = (message: Message) => {
    props.onChange(message)
    const json = stringifyMessage(message)
    setJson(json)
    checkErrors(json)
  }

  const checkErrors = (json: string) => {
    const message = parseMessage(json)
    if (Array.isArray(message)) {
      setErrors(message)
      console.log("json errors", message)
      return
    }

    setErrors([])
    return message
  }

  const executeWebhook = async () => {
    setSending(true)

    const formData = new FormData()
    if (
      props.message.content &&
      props.message.embeds &&
      props.message.embeds.length > 0
    )
      formData.append("payload_json", json)

    if (files)
      for (const [index, file] of Object.entries(files))
        formData.append(`file[${index}]`, file, file.name)

    const response = await fetch(webhookUrl + "?wait=true", {
      method: "POST",
      body: formData,
    })

    setSending(false)

    console.log("execute webhook response", await response.json())
  }

  return (
    <Container>
      <WebhookInput
        url={webhookUrl}
        onChange={(url) => setWebhookUrl(url)}
        disabled={
          sending ||
          !webhookUrl ||
          (Object.values(props.message).filter((value) => !!value).length > 0
            ? errors.length > 0
            : !!props.message.content || (!!files && files.length === 0))
        }
        onSubmit={executeWebhook}
      />
      <InputField
        value={props.message.content || ""}
        onChange={(content) => handleChange({ ...props.message, content })}
        label="Message content"
        multiline
      />
      {(props.message.embeds || []).map((embed, index, embeds) => (
        <EmbedEditor
          key={index}
          embed={embed}
          embedIndex={index}
          embedCount={embeds.length}
          onChange={(embed) => {
            const embeds = Array.from(props.message.embeds || [])
            embeds[index] = embed
            handleChange({ ...props.message, embeds })
          }}
          onDelete={() => {
            const newEmbeds = Array.from(embeds)
            newEmbeds.splice(index, 1)
            handleChange({
              ...props.message,
              embeds: newEmbeds.length === 0 ? undefined : newEmbeds,
            })
          }}
          onMoveUp={() => {
            const newEmbeds = Array.from(embeds)
            newEmbeds.splice(index - 1, 0, ...newEmbeds.splice(index, 1))
            handleChange({ ...props.message, embeds: newEmbeds })
          }}
          onMoveDown={() => {
            const newEmbeds = Array.from(embeds)
            newEmbeds.splice(index + 1, 0, ...newEmbeds.splice(index, 1))
            handleChange({ ...props.message, embeds: newEmbeds })
          }}
        />
      ))}
      <Button
        fullWidth
        disabled={
          props.message.embeds ? props.message.embeds.length >= 10 : false
        }
        onClick={() =>
          handleChange({
            ...props.message,
            embeds: [...(props.message.embeds || []), {}],
          })
        }
      >
        Add embed
      </Button>
      <FileInput onChange={setFiles} />
      <JsonInput
        json={json}
        onChange={(json) => {
          setJson(json)
          const message = checkErrors(json)
          if (message) props.onChange(message)
        }}
        errors={errors}
      />
    </Container>
  )
}
