## Debug Messages

Like many node.js modules do, **lwmqn-shepherd** utilizes [debug](https://www.npmjs.com/package/debug) module to print out messages that may help in debugging. The namespaces include `lwmqn-shepherd`, `lwmqn-shepherd:init`, `lwmqn-shepherd:request`, and `lwmqn-shepherd:msgHdlr`. The `lwmqn-shepherd:request` logs requests that qserver sends to qnodes, and `lwmqn-shepherd:msgHdlr` logs the requests that comes from qnodes.

If you like to print the debug messages, run your app.js with the DEBUG environment variable:

```sh
$ DEBUG=lwmqn-shpeherd* node app.js          # use wildcard to print all lwmqn-shepherd messages
$ DEBUG=lwmqn-shpeherd:msgHdlr node app.js   # if you are only interested in lwmqn-shpeherd:msgHdlr messages
```

Example:

```sh
$ DEBUG=lwmqn-shepherd* node server.js
  lwmqn-shepherd:init lwmqn-shepherd booting... +0ms
  lwmqn-shepherd:init Loading qnodes from database done. +26ms
  lwmqn-shepherd:init Broker is up. +64ms
  lwmqn-shepherd:init Auth policy is set. +32ms
  lwmqn-shepherd:init Create a mqtt client for shepherd. +42ms
  lwmqn-shepherd:init Internal pub/sub testing done. +848ms
  lwmqn-shepherd:init lwmqn-shepherd is up and ready. +2ms
  lwmqn-shepherd:msgHdlr REQ <-- register, transId: 101 +5s
  lwmqn-shepherd:request REQ --> read, transId: 0 +11ms
  lwmqn-shepherd:request REQ --> read, transId: 1 +3ms
  lwmqn-shepherd:request REQ --> read, transId: 2 +1ms
  lwmqn-shepherd:request REQ --> read, transId: 3 +0ms
  lwmqn-shepherd:request RSP <-- read, transId: 0, status: 205 +33ms
  lwmqn-shepherd:request RSP <-- read, transId: 1, status: 205 +40ms
  lwmqn-shepherd:request RSP <-- read, transId: 3, status: 205 +0ms
  lwmqn-shepherd:request RSP <-- read, transId: 2, status: 205 +32ms
  lwmqn-shepherd:msgHdlr RSP --> register, transId: 101, status: 201 +39ms
  lwmqn-shepherd:msgHdlr REQ <-- schedule, transId: 102 +4s
  lwmqn-shepherd:msgHdlr RSP --> schedule, transId: 102, status: 200 +1ms
  lwmqn-shepherd:request REQ --> write, transId: 4 +2s
  ...
  lwmqn-shepherd:request RSP <-- ping, transId: 5, status: 200 +1ms
  lwmqn-shepherd:request REQ --> discover, transId: 11 +7ms
```
