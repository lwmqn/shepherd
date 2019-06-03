## Status Codes

| Status Code               | Description                                                                                                                                                                              |
|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 200 (OK)                  | Everything is fine                                                                                                                                                                       |
| 204 (Changed)             | The remote qnode accepted this writing request successfully                                                                                                                              |
| 400 (BadRequest)          | There is an unrecognized attribute/parameter within the request message                                                                                                                  |
| 404 (NotFound)            | The qnode is not found                                                                                                                                                                   |
| 405 (MethodNotAllowed)    | If you are trying to change either `clientId` or `mac`, to read something unreadable, to write something unwritable, and execute something unexecutable, then you will get this response |
| 408 (Timeout)             | Request timeout                                                                                                                                                                          |
| 500 (InternalServerError) | The remote qnode has some trouble                                                                                                                                                        |
