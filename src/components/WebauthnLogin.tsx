import React, { useState } from 'react'
import { Anchor, Button, Box, TextInput, Text } from 'grommet'
import config from '../config'
import styled from 'styled-components'

// Base64 to ArrayBuffer
const bufferDecode = (value: string) => {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}

// ArrayBuffer to URLBase64
const bufferEncode = (value: ArrayBuffer) => {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(value) as any))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

interface ICredentialDescriptor {
  id: string
  type: string
}

interface ICredential extends ICredentialDescriptor {
  rawId: ArrayBuffer
  response: {
    attestationObject?: ArrayBuffer
    clientDataJSON?: ArrayBuffer
    authenticatorData?: ArrayBuffer
    signature?: ArrayBuffer
    userHandle?: ArrayBuffer
  }
}

const doFetch = async (
  url: string,
  body: object | undefined = undefined
): Promise<any> => {
  return fetch(url, {
    credentials: 'include',
    ...(body
      ? {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      : {}),
  })
}

const Login = styled(Box)`
  margin: auto;
`

function WebauthnLogin() {
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [operationResult, setOperationResult] = useState('')
  const doRegister = async () => {
    const setError = () => {
      setOperationResult(`Unable to register this device for email ${email}`)
      setEmail('')
    }
    const response = await doFetch(`${config.authUrl}/register/begin/${email}`)
    if (response.status !== 200) {
      setError()
      return
    }
    const { publicKey } = await response.json()
    const credential: ICredential = (await navigator.credentials.create({
      publicKey: {
        ...publicKey,
        challenge: bufferDecode(publicKey.challenge),
        user: {
          ...publicKey.user,
          id: bufferDecode(publicKey.user.id),
        },
        ...(publicKey.excludeCredentials
          ? {
              excludeCredentials: publicKey.excludeCredentials.map(
                (item: ICredentialDescriptor) => ({
                  ...item,
                  id: bufferDecode(item.id),
                })
              ),
            }
          : {}),
      },
    })) as ICredential
    const {
      id,
      type,
      rawId,
      response: { attestationObject, clientDataJSON },
    } = credential
    const result = await doFetch(`${config.authUrl}/register/finish/${email}`, {
      id,
      rawId: bufferEncode(rawId),
      type,
      response: {
        attestationObject: bufferEncode(attestationObject!),
        clientDataJSON: bufferEncode(clientDataJSON!),
      },
    })
    if (result.status !== 200) {
      setError()
      return
    } else {
      setOperationResult(`Registration succeeded. You can now login.`)
      setRegister(false)
    }
  }

  const doLogin = async () => {
    const setError = () => {
      setOperationResult(`Unable to login with this device for email ${email}`)
      setEmail('')
    }
    const response = await doFetch(`${config.authUrl}/login/begin/${email}`)
    if (response.status !== 200) {
      setError()
      return
    }
    const { publicKey } = await response.json()
    const credential: ICredential = (await navigator.credentials.get({
      publicKey: {
        ...publicKey,
        challenge: bufferDecode(publicKey.challenge),
        allowCredentials: publicKey.allowCredentials.map(
          (item: ICredentialDescriptor) => ({
            ...item,
            id: bufferDecode(item.id),
          })
        ),
      },
    })) as ICredential
    const {
      id,
      type,
      rawId,
      response: { authenticatorData, clientDataJSON, signature, userHandle },
    } = credential
    const result = await doFetch(`${config.authUrl}/login/finish/${email}`, {
      id,
      rawId: bufferEncode(rawId),
      type,
      response: {
        authenticatorData: bufferEncode(authenticatorData!),
        clientDataJSON: bufferEncode(clientDataJSON!),
        signature: bufferEncode(signature!),
        userHandle: bufferEncode(userHandle!),
      },
    })
    if (result.status !== 200) {
      setError()
      return
    } else {
      const token = await result.json()
      localStorage.setItem('token', token.token)
      window.location.reload()
    }
  }

  const toggleRegister = (registerValue: boolean) => {
    setRegister(registerValue)
    setOperationResult('')
  }
  return (
    <Login width="medium" margin="medium">
      <Text>{operationResult}</Text>
      <TextInput
        name="email"
        placeholder="email"
        maxLength={256}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Box direction="column" margin="small" align="center">
        {register ? (
          <>
            <Button
              disabled={email.length === 0}
              label="Register"
              onClick={doRegister}
            ></Button>
            <Text size="small">
              Existing user?{' '}
              <Anchor onClick={() => toggleRegister(false)}>Login</Anchor>
            </Text>
          </>
        ) : (
          <>
            <Button
              disabled={email.length === 0}
              label="Login"
              onClick={doLogin}
            ></Button>
            <Text size="small">
              New user?{' '}
              <Anchor onClick={() => toggleRegister(true)}>Register</Anchor>
            </Text>
          </>
        )}
      </Box>
    </Login>
  )
}

export default WebauthnLogin
