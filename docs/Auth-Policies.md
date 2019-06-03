## Authentication and Authorization Policies

Override methods within `qserver.authPolicy` to authorize a Client. These methods include `authenticate()`, `authorizePublish()`, and `authorizeSubscribe()`.

***********************************************
### qserver.authPolicy.authenticate(client, username, password, cb)
Method of user authentication. Override at will.
The default implementation authenticates all Clients.

**Arguments:**

1. `client` (_Object_): A mqtt client instance from [Mosca](http://mcollina.github.io/mosca/docs/lib/client.js.html#Client).
2. `username` (_String_): Username given by a qnode during connection.
3. `password` (_Buffer_): Password given by a qnode during connection.
4. `cb` (_Function_): `function (err, valid) {}`, the callback you should call and pass a boolean flag `valid` to tell if this qnode is authenticated.

**Example:**

```js
qserver.authPolicy.authenticate = function (client, username, password, cb) {
    var authorized = false,
        clientId = client.id;

    // This is just an example.
    queryUserFromSomewhere(username, function (err, user) {     // maybe query from a local database
        if (err) {
            cb(err);
        } else if (username === user.name && password === user.password) {
            client.user = username;
            authorized = true;
            cb(null, authorized);
        } else {
            cb(null, authorized);
        }
    });
};
```

***********************************************
### qserver.authPolicy.authorizePublish(client, topic, payload, cb)
Method of authorizing a Client to publish to a topic. Override at will.
The default implementation authorizes every Client, that was successfully registered, to publish to any topic.

**Arguments:**

1. `client` (_Object_): A mqtt client instance from [Mosca](http://mcollina.github.io/mosca/docs/lib/client.js.html#Client).
2. `topic` (_String_): The topic to publish to.
3. `payload` (_String_ | _Buffer_): The data to publish out.
4. `cb` (_Function_): `function (err, authorized) {}`, the callback you should call and pass a boolean flag `authorized` to tell if a Client is authorized to publish the topic.

**Example:**

```js
qserver.authPolicy.authorizePublish = function (client, topic, payload, cb) {
    var authorized = false,
        clientId = client.id,
        username = client.user;

    // This is just an example.
    passToMyAuthorizePublishSystem(clientId, username, topic, function (err, authorized) {
        cb(err, authorized);
    });
};
```

***********************************************
### qserver.authPolicy.authorizeSubscribe(client, topic, cb)
Method of authorizing a Client to subscribe to a topic. Override at will.
The default implementation authorizes every Client, that was successfully registered, to subscribe to any topic.

**Arguments:**

1. `client` (_Object_): A mqtt client instance from [Mosca](http://mcollina.github.io/mosca/docs/lib/client.js.html#Client).
2. `topic` (_String_): The topic to subscribe to.
3. `cb` (_Function_): `function (err, authorized) {}`, the callback you should call and pass a boolean flag `authorized` to tell if a Client is authorized to subscribe to the topic.

**Example:**

```js
qserver.authPolicy.authorizeSubscribe = function (client, topic, cb) {
    var authorized = false,
        clientId = client.id,
        username = client.user;

    // This is just an example.
    passToMyAuthorizeSubscribeSystem(clientId, username, topic, function (err, authorized) {
        cb(err, authorized);
    });
};
```

Please refer to Mosca Wiki to learn more about [Authentication & Authorization](https://github.com/mcollina/mosca/wiki/Authentication-&-Authorization)
