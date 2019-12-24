## Message Encryption

By default, qserver won't encrypt the message. You can override the qserver.encrypt() and qserver.decrypt() methods to implement your own message encryption and decryption. If you did, you should implement the encrypt() and decrypt() methods at your [**remote Client Devices**](https://github.com/lwmqn/qnode) as well.

**Note**: You may like to distribute pre-configured keys to your Clients and utilize the [authentication](#Auth) approach to build your own security subsystem.

***********************************************
### qserver.encrypt(msg, clientId, cb)
Method of encryption. Overridable.

**Arguments:**

1. `msg` (_String_ | _Buffer_): The outgoing message.
2. `clientId` (_String_): Indicates the Client of this message going to.
3. `cb` (_Function_): `function (err, encrypted) {}`, the callback you should call and pass the encrypted message to it after encryption.


***********************************************
### qserver.decrypt(msg, clientId, cb)
Method of decryption. Overridable.

**Arguments:**

1. `msg` (_Buffer_): The incoming message which is a raw buffer.
2. `clientId` (_String_): Indicates the Client of this message coming from.
3. `cb` (_Function_): `function (err, decrypted) {}`, the callback you should call and pass the decrypted message to it after decryption.

***********************************************

**Encryption/Decryption Example:**

```js
const qserver = new Shepherd('my_iot_server')

// In this example, I simply encrypt the message with a constant password 'mysecrete'.
// You may like to get the password according to different qnodes by `clientId` if you have
// a security subsystem.

qserver.encrypt = function (msg, clientId, cb) {
  const msgBuf = new Buffer(msg)
  const cipher = crypto.createCipher('aes128', 'mysecrete')
  let encrypted = cipher.update(msgBuf, 'binary', 'base64')

  try {
    encrypted += cipher.final('base64')
    cb(null, encrypted)
  } catch (err) {
    cb(err)
  }
}

qserver.decrypt = function (msg, clientId, cb) {
  msg = msg.toString()
  const decipher = crypto.createDecipher('aes128', 'mysecrete')
  let decrypted = decipher.update(msg, 'base64', 'utf8')

  try {
    decrypted += decipher.final('utf8')
    cb(null, decrypted)
  } catch (err) {
    cb(err)
  }
}
```
