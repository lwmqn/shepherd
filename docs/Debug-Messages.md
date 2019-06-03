## Debug Messages

Like many node.js modules do, **mqtt-shepherd** utilizes [debug](https://www.npmjs.com/package/debug) module to print out messages that may help in debugging. The namespaces include `mqtt-shepherd`, `mqtt-shepherd:init`, `mqtt-shepherd:request`, and `mqtt-shepherd:msgHdlr`. The `mqtt-shepherd:request` logs requests that qserver sends to qnodes, and `mqtt-shepherd:msgHdlr` logs the requests that comes from qnodes.

If you like to print the debug messages, run your app.js with the DEBUG environment variable:

```sh
$ DEBUG=mqtt-shpeherd* node app.js          # use wildcard to print all mqtt-shepherd messages
$ DEBUG=mqtt-shpeherd:msgHdlr node app.js   # if you are only interested in mqtt-shpeherd:msgHdlr messages
```

Example:

```sh
simen@ubuntu:~/develop/mqtt-shepherd$ DEBUG=mqtt-shepherd* node server.js
  mqtt-shepherd:init mqtt-shepherd booting... +0ms
  mqtt-shepherd:init Loading qnodes from database done. +26ms
  mqtt-shepherd:init Broker is up. +64ms
  mqtt-shepherd:init Auth policy is set. +32ms
  mqtt-shepherd:init Create a mqtt client for shepherd. +42ms
  mqtt-shepherd:init Internal pub/sub testing done. +848ms
  mqtt-shepherd:init mqtt-shepherd is up and ready. +2ms
  mqtt-shepherd:msgHdlr REQ <-- register, transId: 101 +5s
  mqtt-shepherd:request REQ --> read, transId: 0 +11ms
  mqtt-shepherd:request REQ --> read, transId: 1 +3ms
  mqtt-shepherd:request REQ --> read, transId: 2 +1ms
  mqtt-shepherd:request REQ --> read, transId: 3 +0ms
  mqtt-shepherd:request RSP <-- read, transId: 0, status: 205 +33ms
  mqtt-shepherd:request RSP <-- read, transId: 1, status: 205 +40ms
  mqtt-shepherd:request RSP <-- read, transId: 3, status: 205 +0ms
  mqtt-shepherd:request RSP <-- read, transId: 2, status: 205 +32ms
  mqtt-shepherd:msgHdlr RSP --> register, transId: 101, status: 201 +39ms
  mqtt-shepherd:msgHdlr REQ <-- schedule, transId: 102 +4s
  mqtt-shepherd:msgHdlr RSP --> schedule, transId: 102, status: 200 +1ms
  mqtt-shepherd:request REQ --> write, transId: 4 +2s
  ...
  mqtt-shepherd:request RSP <-- ping, transId: 5, status: 200 +1ms
  mqtt-shepherd:request REQ --> discover, transId: 11 +7ms
```
